import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { BookingStatus } from "@/generated/prisma/client";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { routing } from "@/i18n/routing";
import { evaluateBookingRescheduleTimes } from "@/lib/booking-reschedule-policy";
import { patchMeetLessonEvent } from "@/lib/google-calendar";
import { createUserNotification } from "@/lib/notifications";
import { marketplaceBookingRescheduledNotification } from "@/lib/reschedule-notification-copy";
import { findOccurrenceConflict } from "@/lib/school-scheduling";
import { dateOnlyInZone } from "@/lib/date-only-in-zone";

const patchBodySchema = z.object({
  startsAt: z.string().datetime(),
});

type Props = {
  params: Promise<{ bookingId: string }>;
};

export async function GET(_req: Request, { params }: Props) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { bookingId } = await params;
  const booking = await prisma.booking.findUnique({
    where: { id: bookingId },
    select: {
      id: true,
      status: true,
      studentId: true,
    },
  });

  if (!booking || booking.studentId !== session.user.id) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  return NextResponse.json({
    ok: true,
    bookingId: booking.id,
    status: booking.status,
  });
}

function resolveRescheduleActor(
  role: string,
  userId: string,
  booking: { teacherUserId: string },
): "TEACHER" | "SUPER_ADMIN" | null {
  if (role === "SUPER_ADMIN") return "SUPER_ADMIN";
  if (role === "TEACHER" && booking.teacherUserId === userId) return "TEACHER";
  return null;
}

export async function PATCH(req: Request, { params }: Props) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { bookingId } = await params;
  const json = await req.json().catch(() => null);
  const parsed = patchBodySchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid body" }, { status: 400 });
  }

  const newStart = new Date(parsed.data.startsAt);

  const booking = await prisma.booking.findUnique({
    where: { id: bookingId },
    include: {
      lessonProduct: {
        select: { durationMin: true, nameJa: true, nameEn: true },
      },
      teacher: {
        select: {
          id: true,
          userId: true,
          googleCalendarRefreshToken: true,
          calendarId: true,
        },
      },
    },
  });

  if (!booking) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const actor = resolveRescheduleActor(session.user.role, session.user.id, {
    teacherUserId: booking.teacher.userId,
  });
  if (!actor) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const timeCheck = evaluateBookingRescheduleTimes({
    bookingStatus: booking.status,
    previousStartsAt: booking.startsAt,
    newStartsAt: newStart,
  });
  if (!timeCheck.ok) {
    const message =
      timeCheck.reason === "INVALID_STATUS"
        ? "This booking cannot be rescheduled."
        : "New lesson time must be in the future.";
    return NextResponse.json({ error: message, code: timeCheck.reason }, { status: 409 });
  }

  const newEnd = new Date(
    newStart.getTime() + booking.lessonProduct.durationMin * 60_000,
  );

  if (timeCheck.unchanged) {
    const payload = {
      id: booking.id,
      startsAt: booking.startsAt.toISOString(),
      endsAt: booking.endsAt.toISOString(),
      status: booking.status,
      calendarUpdated: true,
    };
    return NextResponse.json(payload);
  }

  const conflict = await prisma.booking.findFirst({
    where: {
      id: { not: booking.id },
      teacherId: booking.teacherId,
      status: { in: [BookingStatus.CONFIRMED, BookingStatus.PENDING_PAYMENT] },
      startsAt: { lt: newEnd },
      endsAt: { gt: newStart },
    },
  });
  if (conflict) {
    return NextResponse.json(
      { error: "That time overlaps another confirmed booking." },
      { status: 409 },
    );
  }

  const teacherSchoolSlots = await prisma.schoolScheduleSlot.findMany({
    where: {
      active: true,
      assignedTeacher: {
        userId: booking.teacher.userId,
        status: "ACTIVE",
      },
    },
    select: {
      dayOfWeek: true,
      startMin: true,
      endMin: true,
      timezone: true,
      recurrence: true,
      daysOfWeek: true,
      startsOn: true,
      endsOn: true,
      skips: { select: { startsAtIso: true } },
    },
  });
  if (teacherSchoolSlots.length > 0) {
    const slotsForConflict = teacherSchoolSlots.map((s) => ({
      ...s,
      startsOn: dateOnlyInZone(s.startsOn, s.timezone),
      endsOn: dateOnlyInZone(s.endsOn, s.timezone),
    }));
    const schoolConflict = findOccurrenceConflict(
      slotsForConflict,
      newStart,
      newEnd,
    );
    if (schoolConflict) {
      return NextResponse.json(
        { error: "The teacher is teaching a school class during that time." },
        { status: 409 },
      );
    }
  }

  const updated = await prisma.booking.update({
    where: { id: booking.id },
    data: { startsAt: newStart, endsAt: newEnd },
    select: {
      id: true,
      startsAt: true,
      endsAt: true,
      status: true,
      googleEventId: true,
      googleCalendarId: true,
      studentGoogleEventId: true,
      studentId: true,
    },
  });

  const calId = updated.googleCalendarId ?? booking.teacher.calendarId ?? "primary";

  const [teacherPatchOk, studentPatchOk] = await Promise.all([
    updated.googleEventId
      ? patchMeetLessonEvent({
          organizerUserId: booking.teacher.userId,
          refreshTokenEncrypted: booking.teacher.googleCalendarRefreshToken,
          calendarId: calId,
          eventId: updated.googleEventId,
          start: newStart,
          end: newEnd,
        })
      : Promise.resolve(true),
    updated.studentGoogleEventId
      ? patchMeetLessonEvent({
          organizerUserId: booking.studentId,
          refreshTokenEncrypted: null,
          eventId: updated.studentGoogleEventId,
          start: newStart,
          end: newEnd,
        })
      : Promise.resolve(true),
  ]);

  const notify = marketplaceBookingRescheduledNotification({
    lessonNameJa: booking.lessonProduct.nameJa,
    lessonNameEn: booking.lessonProduct.nameEn,
  });
  await createUserNotification({
    userId: booking.studentId,
    ...notify,
  });

  for (const locale of routing.locales) {
    revalidatePath(`/${locale}/dashboard`);
    revalidatePath(`/${locale}/dashboard/schedule`);
  }

  return NextResponse.json({
    id: updated.id,
    startsAt: updated.startsAt.toISOString(),
    endsAt: updated.endsAt.toISOString(),
    status: updated.status,
    calendarUpdated: teacherPatchOk && studentPatchOk,
  });
}
