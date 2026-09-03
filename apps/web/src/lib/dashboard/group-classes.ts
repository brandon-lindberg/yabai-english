import { bookingHoldsSlot } from "@/lib/pending-booking-hold";
import { seatStateFromCount, type SeatState } from "@/lib/group-lesson-seats";

/**
 * A teacher's upcoming group classes, and who is in each one.
 *
 * Deliberately not called a roster: `TeacherRosterEntry` already means "the
 * students this teacher works with", and this is a different thing — who is in
 * one particular class on one particular day.
 *
 * The teacher may see their students' names here. That is the opposite of the
 * student-facing booking page, which sends seat counts and nothing else: a
 * classmate's identity is not another student's to know, but it is very much
 * the teacher's.
 */

export type GroupClassBooking = {
  id: string;
  status: string;
  holdExpiresAt?: Date | null;
  student: { id: string; name: string | null; email: string | null };
};

export type GroupClassSession = {
  id: string;
  startsAt: Date;
  endsAt: Date;
  capacity: number;
  cancelledAt: Date | null;
  bookings: GroupClassBooking[];
};

export type GroupClassRow = {
  sessionId: string;
  startsAt: Date;
  endsAt: Date;
  seats: SeatState;
  cancelled: boolean;
  /** Only the students actually holding a seat, in booking order. */
  students: Array<{ bookingId: string; name: string }>;
};

export function buildGroupClassRows(
  sessions: readonly GroupClassSession[],
  now: Date = new Date(),
): GroupClassRow[] {
  return sessions
    .map((session) => {
      // A lapsed hold is not a student in the class, so the name goes as the
      // seat does. Same rule as everywhere else seats are counted.
      const seated = session.bookings.filter((booking) => bookingHoldsSlot(booking, now));

      return {
        sessionId: session.id,
        startsAt: session.startsAt,
        endsAt: session.endsAt,
        seats: seatStateFromCount({ capacity: session.capacity, taken: seated.length }),
        cancelled: Boolean(session.cancelledAt),
        students: seated.map((booking) => ({
          bookingId: booking.id,
          name: booking.student.name ?? booking.student.email ?? "—",
        })),
      };
    })
    .sort((a, b) => a.startsAt.getTime() - b.startsAt.getTime());
}
