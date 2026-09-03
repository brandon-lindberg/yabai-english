import { seatStateFromCount, type SeatState } from "@/lib/group-lesson-seats";
import { timeRangesOverlap, type TimeRangeIso } from "@/lib/teacher-availability-display";

/**
 * Whether one occurrence on a teacher's calendar can still be booked, and on
 * what terms.
 *
 * One definition, read by the booking page when it builds the list and by the
 * form when it decides what is selectable. Those two had drifted into two
 * different answers — the page dropped anything overlapping a held booking
 * while the form separately re-derived its "Reserved" markers — and a group
 * class needs them to agree, because "somebody is already in this" now means
 * the class is working rather than gone.
 *
 * `blocking` carries only the lessons that genuinely take the teacher away:
 * private bookings. Classmates are seats, and passing them here would hide a
 * class from the very students it is filling up with.
 */

export type OccurrenceSeats = { capacity: number; taken: number };

export type OccurrenceBookability = {
  state: "open" | "full" | "taken";
  /** Null for a private lesson, which has no seats to speak of. */
  seats: SeatState | null;
};

export function occurrenceBookability({
  occurrence,
  seats,
  blocking,
}: {
  occurrence: TimeRangeIso;
  /** The class's capacity and how much of it is spoken for; null if private. */
  seats: OccurrenceSeats | null;
  /** Held private bookings that would take the teacher away from this time. */
  blocking: readonly TimeRangeIso[];
}): OccurrenceBookability {
  const seatState = seats ? seatStateFromCount(seats) : null;

  // A lesson the teacher is already committed to beats everything else: no
  // number of free seats makes them available.
  const clash = blocking.some((booking) => timeRangesOverlap(occurrence, booking));
  if (clash) return { state: "taken", seats: seatState };

  if (seatState) {
    return { state: seatState.full ? "full" : "open", seats: seatState };
  }

  return { state: "open", seats: null };
}
