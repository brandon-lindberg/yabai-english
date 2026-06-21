import { DateTime } from "luxon";

export type CalendarViewMode = "day" | "week" | "month";

export function shiftCalendarAnchor(
  anchorIso: string,
  view: CalendarViewMode,
  delta: number,
  timeZone?: string,
) {
  if (timeZone) {
    let next = DateTime.fromISO(anchorIso, { zone: "utc" }).setZone(timeZone);
    if (view === "day") next = next.plus({ days: delta });
    else if (view === "week") next = next.plus({ weeks: delta });
    else {
      // Avoid date rollover (e.g. May 31 + 1 month -> July 1 instead of June).
      next = next.set({ day: 1 }).plus({ months: delta });
    }
    return next.toUTC().toISO()!;
  }

  const next = new Date(anchorIso);
  if (view === "day") next.setDate(next.getDate() + delta);
  else if (view === "week") next.setDate(next.getDate() + delta * 7);
  else {
    // Avoid JS date rollover (e.g. May 31 + 1 month → July 1 instead of June).
    next.setDate(1);
    next.setMonth(next.getMonth() + delta);
  }
  return next.toISOString();
}
