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

export type RecurrencePattern = "WEEKLY" | "DAILY" | "ONE_OFF";

/**
 * Extended recurrence rule supporting WEEKLY (single or multi-day), DAILY,
 * and ONE_OFF (single date).
 *
 * - `recurrence` defaults to "WEEKLY" if omitted (back-compat with rows
 *   created before the multi-recurrence migration).
 * - For WEEKLY: `daysOfWeek` (multi-day) takes precedence; if empty, falls
 *   back to single `dayOfWeek` so existing rows keep working.
 * - For DAILY: every day in `[rangeStart, rangeEnd]` is expanded, optionally
 *   clipped by `startsOn`/`endsOn`.
 * - For ONE_OFF: exactly one occurrence on `startsOn` (must be set).
 *
 * `startsOn` / `endsOn` are inclusive `YYYY-MM-DD` date strings interpreted
 * in the rule's timezone.
 */
export interface RecurrenceRule extends WeeklyRecurrenceRule {
  recurrence?: RecurrencePattern;
  daysOfWeek?: number[];
  startsOn?: string | null;
  endsOn?: string | null;
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

/**
 * Expand a recurrence rule (WEEKLY single/multi-day, DAILY, or ONE_OFF)
 * into UTC occurrences within `[rangeStart, rangeEnd]`, clipped by the
 * rule's optional `startsOn`/`endsOn` bounds.
 */
export function expandRecurringOccurrencesInRange(
  rule: RecurrenceRule,
  rangeStart: Date,
  rangeEnd: Date,
): OccurrenceInRange[] {
  const pattern: RecurrencePattern = rule.recurrence ?? "WEEKLY";

  const effectiveStart = clampStart(rangeStart, rule.startsOn, rule.timezone);
  const effectiveEnd = clampEnd(rangeEnd, rule.endsOn, rule.timezone);
  if (effectiveStart > effectiveEnd) return [];

  if (pattern === "ONE_OFF") {
    if (!rule.startsOn) return [];
    const day = DateTime.fromISO(rule.startsOn, { zone: rule.timezone });
    if (!day.isValid) return [];
    return buildOccurrencesForDays([day], rule, effectiveStart, effectiveEnd);
  }

  if (pattern === "DAILY") {
    const days: DateTime[] = [];
    let cursor = DateTime.fromJSDate(effectiveStart, { zone: rule.timezone })
      .startOf("day");
    const end = DateTime.fromJSDate(effectiveEnd, { zone: rule.timezone });
    while (cursor <= end) {
      days.push(cursor);
      cursor = cursor.plus({ days: 1 });
    }
    return buildOccurrencesForDays(days, rule, effectiveStart, effectiveEnd);
  }

  // WEEKLY (single or multi-day)
  const targetDays =
    rule.daysOfWeek && rule.daysOfWeek.length > 0
      ? rule.daysOfWeek
      : [rule.dayOfWeek];

  const out: OccurrenceInRange[] = [];
  for (const dow of targetDays) {
    const sub = expandWeeklyOccurrencesInRange(
      { ...rule, dayOfWeek: dow },
      effectiveStart,
      effectiveEnd,
    );
    out.push(...sub);
  }
  return out;
}

function buildOccurrencesForDays(
  days: DateTime[],
  rule: WeeklyRecurrenceRule,
  rangeStart: Date,
  rangeEnd: Date,
): OccurrenceInRange[] {
  const zoneStart = DateTime.fromJSDate(rangeStart, { zone: rule.timezone });
  const zoneEnd = DateTime.fromJSDate(rangeEnd, { zone: rule.timezone });
  const startHour = Math.floor(rule.startMin / 60);
  const startMinute = rule.startMin % 60;
  const endHour = Math.floor(rule.endMin / 60);
  const endMinute = rule.endMin % 60;

  const out: OccurrenceInRange[] = [];
  for (const day of days) {
    const occStart = day.set({
      hour: startHour,
      minute: startMinute,
      second: 0,
      millisecond: 0,
    });
    const occEnd = day.set({
      hour: endHour,
      minute: endMinute,
      second: 0,
      millisecond: 0,
    });
    if (occStart < zoneStart || occStart > zoneEnd) continue;
    out.push({
      startsAtIso: occStart.toUTC().toISO()!,
      endsAtIso: occEnd.toUTC().toISO()!,
    });
  }
  return out;
}

function clampStart(
  rangeStart: Date,
  startsOn: string | null | undefined,
  timezone: string,
): Date {
  if (!startsOn) return rangeStart;
  const bound = DateTime.fromISO(startsOn, { zone: timezone }).startOf("day");
  if (!bound.isValid) return rangeStart;
  const boundJs = bound.toJSDate();
  return boundJs > rangeStart ? boundJs : rangeStart;
}

function clampEnd(
  rangeEnd: Date,
  endsOn: string | null | undefined,
  timezone: string,
): Date {
  if (!endsOn) return rangeEnd;
  const bound = DateTime.fromISO(endsOn, { zone: timezone }).endOf("day");
  if (!bound.isValid) return rangeEnd;
  const boundJs = bound.toJSDate();
  return boundJs < rangeEnd ? boundJs : rangeEnd;
}
