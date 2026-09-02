import {
  EMPTY_OCCURRENCE_SKIPS,
  isOccurrenceSkipped,
  type OccurrenceSkipIndex,
} from "@/lib/availability-occurrence-skips";
import { dateOnlyInZone } from "@/lib/date-only-in-zone";
import {
  expandRecurringOccurrencesInRange,
  type RecurrencePattern,
} from "@/lib/recurring-slot-occurrences";
import {
  filterAvailabilityOverlappingBookings,
  type TimeRangeIso,
} from "@/lib/teacher-availability-display";
import { availabilityWindowEndDayKey } from "@/lib/availability-window";


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
  skippedOccurrences?: OccurrenceSkipIndex;
  now?: Date;
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
 * The occurrences of one slot a student could still take: ahead of `now`, not
 * skipped, and not already booked.
 *
 * A row being `active` says only that the teacher has not deleted it. A one-off
 * slot whose date has passed, a weekly slot past its `endsOn`, and a one-off
 * slot whose only occurrence is booked are all still active rows — none of them
 * are open availability.
 */
export function openOccurrencesForSlot({
  slot,
  bookings = [],
  skippedOccurrences = EMPTY_OCCURRENCE_SKIPS,
  now = new Date(),
}: Omit<CountArgs, "slots"> & { slot: OpenAvailabilitySlot }) {
  // Bounded by the publishing window rather than a horizon of its own, so the
  // teacher's count cannot report slots they have not published and no student
  // can book.
  const rangeEnd = new Date(
    `${availabilityWindowEndDayKey(now, slot.timezone)}T23:59:59.999Z`,
  );

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
  ).filter((occ) => !isOccurrenceSkipped(skippedOccurrences, slot.id, occ.startsAtIso));

  // The booking overlap check carries the same timezone-shift compatibility the
  // availability calendar uses, so a slot the calendar hides as booked is not
  // counted as open here.
  return filterAvailabilityOverlappingBookings(occurrences, bookings, {
    timezoneShiftCompatibility: { timeZone: slot.timezone },
  });
}

/** True when the slot still has any occurrence a student could take. */
export function slotHasOpenOccurrence(
  args: Omit<CountArgs, "slots"> & { slot: OpenAvailabilitySlot },
): boolean {
  return openOccurrencesForSlot(args).length > 0;
}

/**
 * How many bookable times the teacher currently has open.
 *
 * Counts occurrences, not the rules that produce them: one weekly rule shows as
 * four times on the calendar and is four slots a student can take, so reporting
 * it as "1" contradicts what the teacher is looking at.
 */
export function countOpenAvailabilitySlots({
  slots,
  bookings = [],
  skippedOccurrences = EMPTY_OCCURRENCE_SKIPS,
  now = new Date(),
}: CountArgs): number {
  return slots.reduce(
    (total, slot) =>
      total + openOccurrencesForSlot({ slot, bookings, skippedOccurrences, now }).length,
    0,
  );
}
