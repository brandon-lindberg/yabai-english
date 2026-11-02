import type { BookingStatus, LearningLanguage, PrismaClient } from "@/generated/prisma/client";
import { buildUpcomingSlotOptions } from "./availability";
import { buildOccurrenceSkipIndex, type OccurrenceSkip } from "./availability-occurrence-skips";
import { BOOKING_MINIMUM_LEAD_HOURS } from "./lead-time-policy";
import { visibleAvailabilitySlots } from "./assigned-availability";
import { slotsForLearningLanguage } from "./learning-language";
import { evaluateBookingReschedulePolicy } from "./booking-reschedule";
import { dateOnlyInZone } from "./date-only-in-zone";
import { timeRangesOverlap, type TimeRangeIso } from "./teacher-availability-display";
import { findOccurrenceConflict } from "./school-scheduling";
import { slotHoldingBookingWhere } from "./pending-booking-hold";
import type { TeacherAvailabilitySlotInput } from "./booking-slot-validation";

type Slot = Omit<TeacherAvailabilitySlotInput, "startsOn" | "endsOn"> & {
  startsOn?: Date | string | null; endsOn?: Date | string | null; assignedStudentId: string | null;
  teacherLessonOffering?: { active: boolean; learningLanguage: LearningLanguage; isGroup?: boolean } | null;
};
type Booking = { id: string; studentId: string; status: BookingStatus; startsAt: Date; rescheduleCount: number;
  learningLanguage: LearningLanguage; groupLessonSessionId?: string | null; lessonProduct: { durationMin: number } };

/** Actual bookable alternatives, rather than the presence of an active availability row. */
export function studentRescheduleSlots(input: {
  booking: Booking; slots: readonly Slot[]; skipped: readonly OccurrenceSkip[]; blocking: readonly TimeRangeIso[];
  schoolSlots: Parameters<typeof findOccurrenceConflict>[0]; viewerTimezone: string; now?: Date;
}) {
  const { booking, viewerTimezone, blocking, schoolSlots, now = new Date() } = input;
  if (booking.groupLessonSessionId || !evaluateBookingReschedulePolicy({ actor: "STUDENT", bookingStatus: booking.status,
    lessonStartsAt: booking.startsAt, rescheduleCount: booking.rescheduleCount, now }).allowed) return [];
  const slots = visibleAvailabilitySlots(slotsForLearningLanguage(input.slots, booking.learningLanguage), booking.studentId)
    .filter(slot => !slot.teacherLessonOffering?.isGroup)
    .map(slot => ({ ...slot, startsOn: slot.startsOn instanceof Date ? dateOnlyInZone(slot.startsOn, slot.timezone) : slot.startsOn,
      endsOn: slot.endsOn instanceof Date ? dateOnlyInZone(slot.endsOn, slot.timezone) : slot.endsOn }));
  const candidates = buildUpcomingSlotOptions({ availabilitySlots: slots, viewerTimezone, now,
    minimumLeadHours: BOOKING_MINIMUM_LEAD_HOURS, skippedOccurrences: buildOccurrenceSkipIndex(input.skipped) });
  const seen = new Set<string>();
  return candidates.flatMap(slot => {
    const start = new Date(slot.startsAtIso);
    const end = new Date(start.getTime() + booking.lessonProduct.durationMin * 60_000);
    const time = { startsAtIso: slot.startsAtIso, endsAtIso: end.toISOString() };
    if (seen.has(slot.startsAtIso) || start.getTime() === booking.startsAt.getTime() || end > new Date(slot.endsAtIso)
      || blocking.some(row => timeRangesOverlap(time, row)) || findOccurrenceConflict(schoolSlots, start, end)) return [];
    seen.add(slot.startsAtIso);
    return [{ ...slot, endsAtIso: end.toISOString(), groupKey: slot.slotId }];
  });
}

/** Shared school conflicts also used by student mutation validation. */
export async function readTeacherSchoolSlots(db: Pick<PrismaClient, "schoolScheduleSlot">, teacherUserId: string) {
  const rows = await db.schoolScheduleSlot.findMany({ where: { active: true, assignedTeacher: { userId: teacherUserId, status: "ACTIVE" } },
    select: { dayOfWeek: true, startMin: true, endMin: true, timezone: true, recurrence: true, daysOfWeek: true,
      startsOn: true, endsOn: true, skips: { select: { startsAtIso: true } } } });
  return rows.map(row => ({ ...row, startsOn: dateOnlyInZone(row.startsOn, row.timezone), endsOn: dateOnlyInZone(row.endsOn, row.timezone) }));
}

export async function teacherHasSchoolConflict(db: Pick<PrismaClient, "schoolScheduleSlot" | "schoolBooking">, teacherUserId: string, start: Date, end: Date) {
  const [slots, booking] = await Promise.all([
    readTeacherSchoolSlots(db, teacherUserId),
    db.schoolBooking.findFirst({ where: { teacherMembership: { userId: teacherUserId }, startsAt: { lt: end }, endsAt: { gt: start } }, select: { id: true } }),
  ]);
  return Boolean(booking || findOccurrenceConflict(slots, start, end));
}

export async function listStudentRescheduleSlots(db: Pick<PrismaClient, "booking" | "schoolScheduleSlot" | "schoolBooking">, booking: NonNullable<Awaited<ReturnType<typeof loadRescheduleBooking>>>) {
  const now = new Date();
  const [bookings, schoolSlots, schoolBookings] = await Promise.all([
    db.booking.findMany({ where: { teacherId: booking.teacherId, id: { not: booking.id }, ...slotHoldingBookingWhere(now), endsAt: { gt: now } }, select: { startsAt: true, endsAt: true } }),
    readTeacherSchoolSlots(db, booking.teacher.userId),
    db.schoolBooking.findMany({ where: { teacherMembership: { userId: booking.teacher.userId }, endsAt: { gt: now } }, select: { startsAt: true, endsAt: true } }),
  ]);
  return studentRescheduleSlots({ booking, slots: booking.teacher.availabilitySlots, skipped: booking.teacher.availabilityOccurrenceSkips,
    blocking: [...bookings, ...schoolBookings].map(row => ({ startsAtIso: row.startsAt.toISOString(), endsAtIso: row.endsAt.toISOString() })),
    schoolSlots, viewerTimezone: booking.student.studentProfile?.timezone ?? "Asia/Tokyo", now });
}

/** Shared booking projection for availability reads and the existing move endpoint. */
export function loadRescheduleBooking(db: Pick<PrismaClient, "booking">, bookingId: string) {
  return db.booking.findUnique({
    where: { id: bookingId },
    include: {
      lessonProduct: { select: { durationMin: true } },
      student: {
      select: { email: true, studentProfile: { select: { timezone: true } } },
    },
      teacher: {
        select: {
          id: true,
          userId: true,
          calendarId: true,
          googleCalendarRefreshToken: true,
          availabilitySlots: {
            where: { active: true },
            select: {
              id: true,
              dayOfWeek: true,
              startMin: true,
              endMin: true,
              timezone: true,
              recurrence: true,
              startsOn: true,
              endsOn: true,
              classLevelId: true,
              classTypeId: true,
              assignedStudentId: true,
              teacherLessonOfferingId: true,
              teacherLessonOffering: {
                select: { id: true, isGroup: true, groupSize: true, learningLanguage: true, active: true },
              },
            },
          },
          availabilityOccurrenceSkips: { select: { slotId: true, startsAtIso: true } },
        },
      },
    },
  });
}
