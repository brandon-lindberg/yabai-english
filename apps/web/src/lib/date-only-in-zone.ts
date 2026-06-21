import { DateTime } from "luxon";

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
