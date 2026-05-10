import { revalidatePath } from "next/cache";
import { BookingStatus } from "@/generated/prisma/client";
import { prisma } from "@/lib/prisma";
import { routing } from "@/i18n/routing";
import { patchMeetLessonEvent } from "@/lib/google-calendar";
import { createUserNotification } from "@/lib/notifications";
import { schoolClassRescheduledNotification } from "@/lib/reschedule-notification-copy";
import { findOccurrenceConflict } from "@/lib/school-scheduling";

/** Shape required to validate conflicts and apply a school booking time change. */
export type SchoolBookingReschedulePayload = {
  id: string;
  schoolId: string;
  scheduleSlotId: string;
  teacherMembershipId: string;
  startsAt: Date;
  endsAt: Date;
  googleEventId: string | null;
  school: { name: string } | null;
  teacherMembership: {
    userId: string | null;
    user: { id: string; email: string } | null;
  };
  attendees: Array<{
    studentMembership: {
      userId: string | null;
      user: { id: string } | null;
    } | null;
  }>;
};

/**
 * Returns a user-facing error message when the proposed window conflicts, or null if OK.
 */
export async function getSchoolBookingRescheduleConflictError(
  booking: Pick<
    SchoolBookingReschedulePayload,
    "id" | "scheduleSlotId" | "teacherMembershipId"
  >,
  newStart: Date,
  newEnd: Date,
  teacherUserId: string,
): Promise<string | null> {
  const schoolConflict = await prisma.schoolBooking.findFirst({
    where: {
      id: { not: booking.id },
      teacherMembershipId: booking.teacherMembershipId,
      startsAt: { lt: newEnd },
      endsAt: { gt: newStart },
    },
  });
  if (schoolConflict) {
    return "That time overlaps another class for this teacher.";
  }

  const teacherProfile = await prisma.teacherProfile.findUnique({
    where: { userId: teacherUserId },
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
      return "That time overlaps a marketplace lesson for this teacher.";
    }
  }

  const teacherSchoolSlots = await prisma.schoolScheduleSlot.findMany({
    where: {
      active: true,
      id: { not: booking.scheduleSlotId },
      assignedTeacher: {
        userId: teacherUserId,
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
      return "That time overlaps another scheduled school slot.";
    }
  }

  return null;
}

export async function applySchoolBookingReschedule(params: {
  booking: SchoolBookingReschedulePayload;
  newStart: Date;
  newEnd: Date;
  orgId: string;
  schoolId: string;
}): Promise<{ calendarUpdated: boolean }> {
  const { booking, newStart, newEnd, orgId, schoolId } = params;
  const organizerUserId = booking.teacherMembership.user?.id;
  if (!organizerUserId) {
    throw new Error("MISSING_TEACHER_USER");
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

  return { calendarUpdated };
}
