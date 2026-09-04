import { DateTime } from "luxon";
import { buildWeekDays } from "@/lib/slot-calendar";

/**
 * "When is this teacher free?", as a small grid: the days across, four-hour
 * bands down, filled where the teacher has an occurrence.
 *
 * The browse list answers this today with "N available slots", which counts
 * recurrence *rules* — not bookable times, and silent about when. For a student
 * in Tokyo choosing between teachers in Canada and Australia, when is the whole
 * question, so every band is computed in the **student's** timezone rather than
 * the teacher's.
 *
 * Four hours is deliberately coarse. This is a glance that says "mornings, most
 * of the week" and sends you to the real calendar to pick; a finer grid would
 * imply a precision it does not have, since a filled band means *some* of that
 * band, not all of it.
 */

export type AvailabilityBand = { startHour: number; endHour: number };

/** Six bands of four hours, midnight to midnight. */
export const AVAILABILITY_BANDS: readonly AvailabilityBand[] = [
  { startHour: 0, endHour: 4 },
  { startHour: 4, endHour: 8 },
  { startHour: 8, endHour: 12 },
  { startHour: 12, endHour: 16 },
  { startHour: 16, endHour: 20 },
  { startHour: 20, endHour: 24 },
];

export type BandOccurrence = { startsAtIso: string; endsAtIso: string };

/**
 * `grid[dayIndex][bandIndex]` — true where the teacher has time in that band.
 *
 * Returns a plain boolean matrix rather than a set of keys so the renderer can
 * walk it positionally; an empty day is still a row of `false`, which is the
 * information "nothing here" rather than a missing entry.
 */
export function availabilityBands({
  occurrences,
  dayKeys,
  timeZone,
}: {
  occurrences: readonly BandOccurrence[];
  /** `YYYY-MM-DD` in the viewer's zone, in the order they are displayed. */
  dayKeys: readonly string[];
  timeZone: string;
}): boolean[][] {
  const grid = dayKeys.map(() => AVAILABILITY_BANDS.map(() => false));
  const indexOfDay = new Map(dayKeys.map((key, index) => [key, index]));

  for (const occurrence of occurrences) {
    const start = DateTime.fromISO(occurrence.startsAtIso, { zone: timeZone });
    const end = DateTime.fromISO(occurrence.endsAtIso, { zone: timeZone });
    if (!start.isValid || !end.isValid || end <= start) continue;

    /*
      Walked band by band rather than by day, because an occurrence can cross
      local midnight — a Tokyo teacher's evening is the previous afternoon in
      New York — and it has to light bands on both sides of that boundary.
    */
    let cursor = start.startOf("hour").set({
      hour: Math.floor(start.hour / 4) * 4,
      minute: 0,
      second: 0,
      millisecond: 0,
    });

    while (cursor < end) {
      const dayIndex = indexOfDay.get(cursor.toFormat("yyyy-MM-dd"));
      if (dayIndex !== undefined) {
        grid[dayIndex][Math.floor(cursor.hour / 4)] = true;
      }
      cursor = cursor.plus({ hours: 4 });
    }
  }

  return grid;
}

/**
 * The week a preview covers: Monday to Sunday, in the viewer's zone.
 *
 * Counting seven days forward from today put the columns in whatever order the
 * current weekday happened to fall — Fri, Sat, Sun, Mon — which reads as broken
 * even when every column is correctly labelled. `buildWeekDays` is the same
 * Monday-first week the rest of the calendars are built from, so the preview
 * cannot drift from them.
 */
export function previewDays(
  timeZone: string,
  locale: string,
  now: Date = new Date(),
): { dayKey: string; shortLabel: string; dayOfMonth: string }[] {
  return buildWeekDays(now.toISOString(), locale, timeZone).map((day) => ({
    dayKey: day.dayKey,
    shortLabel: day.shortLabel,
    // The key is `YYYY-MM-DD`, so the date is its last two characters without
    // the leading zero — no second parse, and no chance of a timezone slip
    // between the number shown and the column it heads.
    dayOfMonth: String(Number(day.dayKey.slice(-2))),
  }));
}

/**
 * The span to expand a teacher's recurrence rules over for a given preview.
 *
 * The end is the close of the last day on screen, so the final column is drawn
 * from data that was actually fetched. The start is clamped to *now*, because a
 * Monday slot is not availability on Friday — without that, the panel would go
 * back to advertising times nobody can book, which is the whole failing of the
 * "N available slots" count it replaced.
 */
export function previewWindow(
  dayKeys: readonly string[],
  timeZone: string,
  now: Date = new Date(),
): { start: Date; end: Date } {
  const first = DateTime.fromISO(dayKeys[0], { zone: timeZone }).startOf("day");
  const last = DateTime.fromISO(dayKeys[dayKeys.length - 1], { zone: timeZone }).endOf("day");
  const weekStart = first.toJSDate();
  return {
    start: now > weekStart ? now : weekStart,
    // `endOf("day")` is 23:59:59.999; the exclusive end of the window is the
    // millisecond after, which is midnight.
    end: new Date(last.toMillis() + 1),
  };
}
