import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { BookingStatus } from "@/generated/prisma/client";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { routing } from "@/i18n/routing";
import { patchMeetLessonEvent } from "@/lib/google-calendar";
import { createUserNotification } from "@/lib/notifications";
import { findOccurrenceConflict } from "@/lib/school-scheduling";
import { canRescheduleSchoolClassBooking } from "@/lib/school-booking-reschedule-authorization";
import { evaluateSchoolBookingRescheduleTimes } from "@/lib/school-booking-reschedule-policy";
import { schoolClassRescheduledNotification } from "@/lib/reschedule-notification-copy";
import type { MembershipForAuth } from "@/lib/org-authorization";

const patchBodySchema = z.object({
  startsAt: z.string().datetime(),
});

type RouteContext = {
  params: Promise<{ orgId: string; schoolId: string; bookingId: string }>;
};

async function getCallerMembership(
  userId: string,
  orgId: string,
  schoolId: string,
): Promise<MembershipForAuth | null> {
  return prisma.organizationMembership.findFirst({
    where: {
      userId,
      organizationId: orgId,
      status: "ACTIVE",
      OR: [{ schoolId: null }, { schoolId }],
    },
    select: {
      id: true,
      organizationId: true,
      userId: true,
      schoolId: true,
      orgRole: true,
      status: true,
    },
    orderBy: { orgRole: "asc" },
  });
}

export async function PATCH(req: Request, ctx: RouteContext) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { orgId, schoolId, bookingId } = await ctx.params;
  const json = await req.json().catch(() => null);
  const parsed = patchBodySchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid body" }, { status: 400 });
  }

  const newStart = new Date(parsed.data.startsAt);

  const booking = await prisma.schoolBooking.findUnique({
    where: { id: bookingId },
    include: {
      school: { select: { name: true } },
      teacherMembership: {
        select: {
          id: true,
          userId: true,
          user: { select: { id: true, email: true } },
        },
      },
      attendees: {
        select: {
          studentMembership: {
            select: { userId: true, user: { select: { id: true } } },
          },
        },
      },
    },
  });

  if (!booking || booking.schoolId !== schoolId) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const caller = await getCallerMembership(session.user.id, orgId, schoolId);
  if (
    !canRescheduleSchoolClassBooking(
      caller,
      schoolId,
      booking.teacherMembershipId,
    )
  ) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const organizerUserId = booking.teacherMembership.user?.id;
  if (!organizerUserId) {
    return NextResponse.json(
      { error: "Teacher account is not linked for this class." },
      { status: 409 },
    );
  }

  const timeCheck = evaluateSchoolBookingRescheduleTimes({
    previousStartsAt: booking.startsAt,
    newStartsAt: newStart,
  });
  if (!timeCheck.ok) {
    return NextResponse.json(
      { error: "New class time must be in the future.", code: timeCheck.reason },
      { status: 409 },
    );
  }

  const durationMs = booking.endsAt.getTime() - booking.startsAt.getTime();
  const newEnd = new Date(newStart.getTime() + durationMs);

  if (timeCheck.unchanged) {
    return NextResponse.json({
      id: booking.id,
      startsAt: booking.startsAt.toISOString(),
      endsAt: booking.endsAt.toISOString(),
      calendarUpdated: true,
    });
  }

  const schoolConflict = await prisma.schoolBooking.findFirst({
    where: {
      id: { not: booking.id },
      teacherMembershipId: booking.teacherMembershipId,
      startsAt: { lt: newEnd },
      endsAt: { gt: newStart },
    },
  });
  if (schoolConflict) {
    return NextResponse.json(
      { error: "That time overlaps another class for this teacher." },
      { status: 409 },
    );
  }

  const teacherProfile = await prisma.teacherProfile.findUnique({
    where: { userId: organizerUserId },
    select: { id: true },
  });
  if (teacherProfile) {
    const marketplaceConflict = await prisma.booking.findFirst({
      where: {
        teacherId: teacherProfile.id,
        status: { in: [BookingStatus.CONFIRMED, BookingStatus.PENDING_PAYMENT] },
        startsAt: { lt: newEnd },
        endsAt: { gt: newStart },
      },
    });
    if (marketplaceConflict) {
      return NextResponse.json(
        { error: "That time overlaps a marketplace lesson for this teacher." },
        { status: 409 },
      );
    }
  }

  const teacherSchoolSlots = await prisma.schoolScheduleSlot.findMany({
    where: {
      active: true,
      id: { not: booking.scheduleSlotId },
      assignedTeacher: {
        userId: organizerUserId,
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
      startsOn: s.startsOn ? s.startsOn.toISOString().slice(0, 10) : null,
      endsOn: s.endsOn ? s.endsOn.toISOString().slice(0, 10) : null,
    }));
    const slotOverlap = findOccurrenceConflict(
      slotsForConflict,
      newStart,
      newEnd,
    );
    if (slotOverlap) {
      return NextResponse.json(
        { error: "That time overlaps another scheduled school slot." },
        { status: 409 },
      );
    }
  }

  const updated = await prisma.schoolBooking.update({
    where: { id: booking.id },
    data: { startsAt: newStart, endsAt: newEnd },
    select: {
      id: true,
      startsAt: true,
      endsAt: true,
      googleEventId: true,
    },
  });

  let calendarUpdated = true;
  if (updated.googleEventId) {
    calendarUpdated = await patchMeetLessonEvent({
      organizerUserId,
      refreshTokenEncrypted: null,
      eventId: updated.googleEventId,
      start: newStart,
      end: newEnd,
    });
  }

  const schoolName = booking.school?.name ?? "School";
  const notifyPayload = schoolClassRescheduledNotification({ schoolName });
  const studentUserIds = new Set<string>();
  for (const a of booking.attendees) {
    const uid = a.studentMembership?.userId ?? a.studentMembership?.user?.id;
    if (uid) studentUserIds.add(uid);
  }
  if (studentUserIds.size > 0) {
    await Promise.all(
      [...studentUserIds].map((userId) =>
        createUserNotification({
          userId,
          ...notifyPayload,
        }),
      ),
    );
  }

  for (const locale of routing.locales) {
    revalidatePath(`/${locale}/org/${orgId}/schools/${schoolId}/classes`);
  }

  return NextResponse.json({
    id: updated.id,
    startsAt: updated.startsAt.toISOString(),
    endsAt: updated.endsAt.toISOString(),
    calendarUpdated,
  });
}
