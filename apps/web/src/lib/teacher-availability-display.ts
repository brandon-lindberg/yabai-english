export type TimeRangeIso = {
  startsAtIso: string;
  endsAtIso: string;
};

/** True when two half-open [start, end) intervals overlap. */
export function timeRangesOverlap(a: TimeRangeIso, b: TimeRangeIso): boolean {
  const aStart = new Date(a.startsAtIso).getTime();
  const aEnd = new Date(a.endsAtIso).getTime();
  const bStart = new Date(b.startsAtIso).getTime();
  const bEnd = new Date(b.endsAtIso).getTime();
  return aStart < bEnd && bStart < aEnd;
}

/** Hide open availability that overlaps a booked lesson. */
export function filterAvailabilityOverlappingBookings<T extends TimeRangeIso>(
  availability: readonly T[],
  bookings: readonly TimeRangeIso[],
): T[] {
  if (bookings.length === 0) return [...availability];
  return availability.filter(
    (slot) => !bookings.some((booking) => timeRangesOverlap(slot, booking)),
  );
}
