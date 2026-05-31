export type CalendarViewMode = "day" | "week" | "month";

export function shiftCalendarAnchor(anchorIso: string, view: CalendarViewMode, delta: number) {
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
