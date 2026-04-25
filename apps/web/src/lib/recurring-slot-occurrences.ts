import { DateTime } from "luxon";

export interface WeeklyRecurrenceRule {
  /** 0-6, Sun-Sat (matches JS getDay() and the marketplace availability convention). */
  dayOfWeek: number;
  /** Minutes from local midnight (in `timezone`). */
  startMin: number;
  /** Minutes from local midnight (in `timezone`). */
  endMin: number;
  /** IANA timezone the recurrence is defined in. */
  timezone: string;
}

export interface OccurrenceInRange {
  /** Inclusive UTC ISO timestamp of when the occurrence begins. */
  startsAtIso: string;
  /** Exclusive UTC ISO timestamp of when the occurrence ends. */
  endsAtIso: string;
}

/**
 * Expand a single weekly recurrence rule into concrete UTC occurrences that
 * fall within `[rangeStart, rangeEnd]` (inclusive on both ends).
 *
 * Used by both the marketplace `buildUpcomingSlotOptions` (after applying its
 * lead-time / skip / formatting layers) and the school-side scheduling helpers,
 * so the weekly time-of-day → UTC math lives in exactly one place.
 */
export function expandWeeklyOccurrencesInRange(
  rule: WeeklyRecurrenceRule,
  rangeStart: Date,
  rangeEnd: Date,
): OccurrenceInRange[] {
  // Luxon weekday: 1=Mon..7=Sun. Our dayOfWeek: 0=Sun..6=Sat.
  const luxonWeekday = rule.dayOfWeek === 0 ? 7 : rule.dayOfWeek;

  const zoneStart = DateTime.fromJSDate(rangeStart, { zone: rule.timezone });
  const zoneEnd = DateTime.fromJSDate(rangeEnd, { zone: rule.timezone });

  // Walk to the first day in the range matching the target weekday.
  let current = zoneStart.startOf("day");
  while (current.weekday !== luxonWeekday) {
    current = current.plus({ days: 1 });
  }

  const out: OccurrenceInRange[] = [];
  const startHour = Math.floor(rule.startMin / 60);
  const startMinute = rule.startMin % 60;
  const endHour = Math.floor(rule.endMin / 60);
  const endMinute = rule.endMin % 60;

  while (current <= zoneEnd) {
    const occStart = current.set({
      hour: startHour,
      minute: startMinute,
      second: 0,
      millisecond: 0,
    });
    const occEnd = current.set({
      hour: endHour,
      minute: endMinute,
      second: 0,
      millisecond: 0,
    });

    if (occStart >= zoneStart && occStart <= zoneEnd) {
      out.push({
        startsAtIso: occStart.toUTC().toISO()!,
        endsAtIso: occEnd.toUTC().toISO()!,
      });
    }

    current = current.plus({ weeks: 1 });
  }

  return out;
}
