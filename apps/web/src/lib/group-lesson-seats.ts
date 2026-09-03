import type { BookingStatus } from "@/generated/prisma/enums";
import { bookingHoldsSlot } from "@/lib/pending-booking-hold";

/**
 * How many seats in a group class are spoken for.
 *
 * Seats are **derived from the bookings**, never stored as a counter. An unpaid
 * booking gives its seat back when its three-hour hold lapses, and there is no
 * worker in this deployment to decrement anything on that deadline — a counter
 * column would drift the first time a student abandoned checkout. The same
 * reasoning that put a stored deadline on the booking keeps the tally derived
 * from it.
 *
 * `bookingHoldsSlot` is the single definition of "still held", shared with the
 * query fragment every other availability path uses.
 */

export type SeatOccupant = {
  status: BookingStatus | string;
  holdExpiresAt?: Date | null;
};

export type SeatState = {
  capacity: number;
  taken: number;
  /** Never negative: an over-subscribed session reports nothing left. */
  remaining: number;
  full: boolean;
};

export function takenSeatCount(
  bookings: readonly SeatOccupant[],
  now: Date = new Date(),
): number {
  return bookings.reduce(
    (count, booking) => (bookingHoldsSlot(booking, now) ? count + 1 : count),
    0,
  );
}

/**
 * The same answer from a tally rather than the rows themselves, for the
 * reservation path — which counts in the database under a lock and never wants
 * the seats loaded into memory. Sharing this keeps one definition of "full",
 * so a class cannot read as open on the booking page and closed at the
 * endpoint.
 */
export function seatStateFromCount({
  capacity,
  taken,
}: {
  capacity: number;
  taken: number;
}): SeatState {
  // A session snapshots its capacity at creation, so lowering `groupSize` later
  // cannot evict anyone already enrolled. Should a session still end up over
  // its own capacity, it closes rather than reporting negative seats.
  const remaining = Math.max(0, capacity - taken);
  return { capacity, taken, remaining, full: remaining === 0 };
}

export function seatState({
  capacity,
  bookings,
  now = new Date(),
}: {
  capacity: number;
  bookings: readonly SeatOccupant[];
  now?: Date;
}): SeatState {
  return seatStateFromCount({ capacity, taken: takenSeatCount(bookings, now) });
}
