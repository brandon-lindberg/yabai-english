import type { Prisma } from "@/generated/prisma/client";
import { slotHoldingBookingWhere } from "@/lib/pending-booking-hold";

/**
 * The bookings that stand in the way of a teacher taking a lesson at a given
 * time.
 *
 * This predicate had been written out by hand at four call sites — the create
 * route, the booking PATCH, the student reschedule, and the school reschedule's
 * marketplace check. Group classes are the first time the rule stops being
 * "any overlap is a clash", and four copies is four chances to update three of
 * them.
 *
 * Not for the teacher booking page, which asks a different question: every
 * future held booking, with no window at all.
 */
export function teacherBookingOverlapWhere({
  teacherId,
  start,
  end,
  excludeBookingId,
  allowGroupSessionId,
  now,
}: {
  teacherId: string;
  start: Date;
  end: Date;
  /** The booking being moved, which cannot clash with itself. */
  excludeBookingId?: string | null;
  /**
   * A class the new booking is joining. Its other seats overlap by design and
   * are not a clash; everything else at that time still is.
   */
  allowGroupSessionId?: string | null;
  now?: Date;
}): Prisma.BookingWhereInput {
  const and: Prisma.BookingWhereInput[] = [slotHoldingBookingWhere(now)];

  if (allowGroupSessionId) {
    // The null branch is spelled out rather than left to `not`: a private
    // lesson carries no session id, and it is precisely the row that must keep
    // conflicting. `NOT (col = x)` is unknown for a null column in SQL, which
    // would quietly drop exactly the wrong rows.
    and.push({
      OR: [
        { groupLessonSessionId: null },
        { groupLessonSessionId: { not: allowGroupSessionId } },
      ],
    });
  }

  return {
    teacherId,
    // Half-open on both sides, so a lesson ending exactly when the next begins
    // is not an overlap.
    startsAt: { lt: end },
    endsAt: { gt: start },
    ...(excludeBookingId ? { id: { not: excludeBookingId } } : {}),
    AND: and,
  };
}
