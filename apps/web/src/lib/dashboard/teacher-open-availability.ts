import { dateOnlyInZone } from "@/lib/date-only-in-zone";
import {
  expandRecurringOccurrencesInRange,
  type RecurrencePattern,
} from "@/lib/recurring-slot-occurrences";
import {
  filterAvailabilityOverlappingBookings,
  type TimeRangeIso,
} from "@/lib/teacher-availability-display";

/**
 * How far ahead a slot may look for its next open occurrence. Matches the
 * marketplace horizon in `buildUpcomingSlotOptions` so the teacher's count and
 * what a student can actually pick are bounded the same way.
 */
const OPEN_AVAILABILITY_HORIZON_DAYS = 365;

export type OpenAvailabilitySlot = {
  id: string;
  dayOfWeek: number;
  startMin: number;
  endMin: number;
  timezone: string;
  recurrence?: RecurrencePattern | null;
  startsOn?: Date | string | null;
  endsOn?: Date | string | null;
};

type CountArgs = {
  /** Active slot rows for one teacher. */
  slots: readonly OpenAvailabilitySlot[];
  /** Non-cancelled bookings; an occurrence they overlap is taken, not open. */
  bookings?: readonly TimeRangeIso[];
  /** UTC startsAtIso values the teacher removed one occurrence at a time. */
  skippedStartsAtIso?: ReadonlySet<string>;
  now?: Date;
  horizonDays?: number;
};

function dateOnly(
  value: Date | string | null | undefined,
  timezone: string,
): string | null {
  if (!value) return null;
  if (typeof value === "string") return value.slice(0, 10);
  return dateOnlyInZone(value, timezone);
}

/**
 * True when the slot still has at least one occurrence a student could take:
 * ahead of `now`, not skipped, and not already booked.
 *
 * A row being `active` says only that the teacher has not deleted it. A one-off
 * slot whose date has passed, a weekly slot past its `endsOn`, and a one-off
 * slot whose only occurrence is booked are all still active rows — none of them
 * are open availability.
 */
export function slotHasOpenOccurrence({
  slot,
  bookings = [],
  skippedStartsAtIso,
  now = new Date(),
  horizonDays = OPEN_AVAILABILITY_HORIZON_DAYS,
}: Omit<CountArgs, "slots"> & { slot: OpenAvailabilitySlot }): boolean {
  const rangeEnd = new Date(now.getTime() + horizonDays * 24 * 60 * 60 * 1000);

  const occurrences = expandRecurringOccurrencesInRange(
    {
      dayOfWeek: slot.dayOfWeek,
      startMin: slot.startMin,
      endMin: slot.endMin,
      timezone: slot.timezone,
      recurrence: slot.recurrence ?? undefined,
      startsOn: dateOnly(slot.startsOn, slot.timezone),
      endsOn: dateOnly(slot.endsOn, slot.timezone),
    },
    now,
    rangeEnd,
  ).filter((occ) => !skippedStartsAtIso?.has(occ.startsAtIso));

  // The booking overlap check carries the same timezone-shift compatibility the
  // availability calendar uses, so a slot the calendar hides as booked is not
  // counted as open here.
  const open = filterAvailabilityOverlappingBookings(occurrences, bookings, {
    timezoneShiftCompatibility: { timeZone: slot.timezone },
  });

  return open.length > 0;
}

/** How many published slots still have a bookable occurrence ahead of `now`. */
export function countOpenAvailabilitySlots({
  slots,
  bookings = [],
  skippedStartsAtIso,
  now = new Date(),
  horizonDays = OPEN_AVAILABILITY_HORIZON_DAYS,
}: CountArgs): number {
  return slots.filter((slot) =>
    slotHasOpenOccurrence({ slot, bookings, skippedStartsAtIso, now, horizonDays }),
  ).length;
}
