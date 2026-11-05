import { bookingLearningSiteResponse } from "@/lib/booking-learning-site";
import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { revalidateBookingPaths } from "@/lib/revalidate-booking-paths";
import { hasPendingPrivateReschedule, privateRescheduleRestoredData } from "@/lib/private-reschedule";
import { ensureBookingCalendar } from "@/lib/booking-calendar-recovery";
import { evaluateBookingRescheduleTimes } from "@/lib/booking-reschedule-policy";
import { patchMeetLessonEvent } from "@/lib/google-calendar";
import { notifyPrivateBookingEvent } from "@/lib/private-booking-notifications";
import { findOccurrenceConflict } from "@/lib/school-scheduling";
import { readTeacherSchoolSlots } from "@/lib/booking-reschedule-availability";
import { teacherBookingOverlapWhere, isStaleBookingMutation, STALE_BOOKING_MESSAGE } from "@/lib/booking-conflict";

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
      learningLanguage: true,
    },
  });

  if (!booking || booking.studentId !== session.user.id) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  const wrongSite = await bookingLearningSiteResponse(booking, session.user.role);
  if (wrongSite) return wrongSite;

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
    pendingPrivateReschedule: hasPendingPrivateReschedule(booking),
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
    where: teacherBookingOverlapWhere({
      teacherId: booking.teacherId,
      start: newStart,
      end: newEnd,
      excludeBookingId: booking.id,
    }),
  });
  if (conflict) {
    return NextResponse.json(
      { error: "That time overlaps another confirmed booking." },
      { status: 409 },
    );
  }

  const teacherSchoolSlots = await readTeacherSchoolSlots(prisma, booking.teacher.userId);
  if (teacherSchoolSlots.length > 0) {
    const schoolConflict = findOccurrenceConflict(
      teacherSchoolSlots,
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

  const event = { bookingId: booking.id, previousStartsAt: booking.startsAt, startsAt: newStart, transitionId: booking.updatedAt?.toISOString() };
  let updated;
  try {
    updated = await prisma.booking.update({
    where: { id: booking.id, status: booking.status, startsAt: booking.startsAt, privateRescheduleStatus: booking.privateRescheduleStatus ?? null },
    data: { startsAt: newStart, endsAt: newEnd, ...(hasPendingPrivateReschedule(booking)
      ? { ...privateRescheduleRestoredData(), rescheduleCount: booking.rescheduleCount + 1 } : {}) },
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
  } catch (error) {
    if (isStaleBookingMutation(error)) return NextResponse.json({ error: STALE_BOOKING_MESSAGE }, { status: 409 });
    throw error;
  }
  await notifyPrivateBookingEvent({ ...event, event: "rescheduled" });

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

  const calendarUpdated = hasPendingPrivateReschedule(booking)
    ? (await ensureBookingCalendar(booking.id, { restoreStudentMirror: true })).ok : teacherPatchOk && studentPatchOk;
  revalidateBookingPaths();

  return NextResponse.json({
    id: updated.id,
    startsAt: updated.startsAt.toISOString(),
    endsAt: updated.endsAt.toISOString(),
    status: updated.status,
    calendarUpdated,
  });
}
