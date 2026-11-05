import { DateTime } from "luxon";

/** Formats a calendar date as given, independently of the runtime timezone. */
export function formatCalendarDate(day: string, locale: string): string {
  return new Intl.DateTimeFormat(locale, { dateStyle: "long", timeZone: "UTC" }).format(new Date(day));
}

export function dateOnlyInZone(
  value: Date | null | undefined,
  timezone: string,
): string | null {
  if (!value) return null;
  return DateTime.fromJSDate(value, { zone: "utc" })
    .setZone(timezone)
    .toISODate();
}

export function dateOnlyToUtcDateInZone(
  value: string | null | undefined,
  timezone: string,
): Date | null {
  if (!value) return null;
  const parsed = DateTime.fromISO(value, { zone: timezone }).startOf("day");
  if (!parsed.isValid) return null;
  return parsed.toUTC().toJSDate();
}
