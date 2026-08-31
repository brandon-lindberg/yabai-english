import { DateTime } from "luxon";
import { shiftCalendarAnchor, type CalendarViewMode } from "@/lib/calendar-view";

/**
 * How far ahead a teacher may publish availability, counted in whole calendar
 * months: the current month plus the two after it.
 *
 * Deliberately not a rolling day count. A 90-day window drifts — it would open
 * part of a fourth month in some months and stop short in others — so what a
 * teacher can reach would depend on today's date rather than on the calendar.
 * Whole months mean the far edge is always "the end of a month", and the whole
 * of the next month opens at once when the month turns.
 */
export const AVAILABILITY_WINDOW_MONTHS = 3;

/**
 * The last date a teacher may publish availability for, as `YYYY-MM-DD` in
 * their own timezone — which is what decides when the window rolls over, since
 * their month turns before or after UTC's.
 */
export function availabilityWindowEndDayKey(now: Date, timezone: string): string {
  return DateTime.fromJSDate(now, { zone: "utc" })
    .setZone(timezone)
    .startOf("month")
    .plus({ months: AVAILABILITY_WINDOW_MONTHS - 1 })
    .endOf("month")
    .toISODate()!;
}

/**
 * Whether a `YYYY-MM-DD` date is inside the publishable window. Only the far
 * edge is checked: dates in the past are a different question and this rule has
 * nothing to say about them.
 */
export function isWithinAvailabilityWindow(
  dayKey: string,
  now: Date,
  timezone: string,
): boolean {
  return dayKey <= availabilityWindowEndDayKey(now, timezone);
}

/**
 * Whether a calendar may step forward one period without leaving the window.
 *
 * Reuses the same anchor arithmetic the calendars navigate with, so "one step
 * forward" means exactly what pressing Next means — a month view stops on the
 * window's final month, a week view once the next week begins past the edge.
 */
export function canAdvanceCalendarWithinWindow(
  anchorIso: string,
  view: CalendarViewMode,
  now: Date,
  timezone: string,
): boolean {
  const nextAnchor = shiftCalendarAnchor(anchorIso, view, 1, timezone);
  const nextDayKey = DateTime.fromISO(nextAnchor, { zone: "utc" })
    .setZone(timezone)
    .toISODate()!;
  return isWithinAvailabilityWindow(nextDayKey, now, timezone);
}
