import { DateTime } from "luxon";

/** Matches `jsDayOfWeek` in `availability.ts` (Luxon weekday % 7). */
export function luxonWeekdayMod7FromDayKey(dayKey: string, zone: string): number {
  const dt = DateTime.fromISO(`${dayKey}T12:00:00`, { zone });
  return dt.weekday % 7;
}
