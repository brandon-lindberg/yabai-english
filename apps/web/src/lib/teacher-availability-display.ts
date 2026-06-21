import { DateTime } from "luxon";

export type TimeRangeIso = {
  startsAtIso: string;
  endsAtIso: string;
};

type FilterOptions = {
  /**
   * Compatibility for slots persisted with UTC-clock minutes but a teacher-local
   * timezone. Existing bookings were created from the intended instant, so the
   * two ranges can be offset by the zone offset instead of overlapping.
   */
  timezoneShiftCompatibility?: {
    timeZone: string;
  };
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
  options?: FilterOptions,
): T[] {
  if (bookings.length === 0) return [...availability];
  return availability.filter(
    (slot) =>
      !bookings.some(
        (booking) =>
          timeRangesOverlap(slot, booking) ||
          isLikelyTimezoneShiftedDuplicate(
            slot,
            booking,
            options?.timezoneShiftCompatibility?.timeZone,
          ),
      ),
  );
}

function isLikelyTimezoneShiftedDuplicate(
  availability: TimeRangeIso,
  booking: TimeRangeIso,
  timeZone?: string,
): boolean {
  if (!timeZone) return false;

  const availabilityStart = DateTime.fromISO(availability.startsAtIso, { zone: "utc" });
  const availabilityEnd = DateTime.fromISO(availability.endsAtIso, { zone: "utc" });
  const bookingStart = DateTime.fromISO(booking.startsAtIso, { zone: "utc" });
  const bookingEnd = DateTime.fromISO(booking.endsAtIso, { zone: "utc" });
  if (
    !availabilityStart.isValid ||
    !availabilityEnd.isValid ||
    !bookingStart.isValid ||
    !bookingEnd.isValid
  ) {
    return false;
  }

  const availabilityDuration = Math.round(availabilityEnd.diff(availabilityStart, "minutes").minutes);
  const bookingDuration = Math.round(bookingEnd.diff(bookingStart, "minutes").minutes);
  if (availabilityDuration !== bookingDuration) return false;

  const availabilityLocal = availabilityStart.setZone(timeZone);
  const bookingLocal = bookingStart.setZone(timeZone);
  if (availabilityLocal.toISODate() !== bookingLocal.toISODate()) return false;

  const zoneOffsetMinutes = bookingLocal.offset;
  if (zoneOffsetMinutes === 0) return false;

  const shiftedAvailabilityStart = availabilityStart.plus({ minutes: zoneOffsetMinutes });
  return Math.abs(shiftedAvailabilityStart.diff(bookingStart, "minutes").minutes) < 1;
}
