export type CalendarViewMode = "day" | "week" | "month";

export function shiftCalendarAnchor(anchorIso: string, view: CalendarViewMode, delta: number) {
  const next = new Date(anchorIso);
  if (view === "day") next.setDate(next.getDate() + delta);
  else if (view === "week") next.setDate(next.getDate() + delta * 7);
  else next.setMonth(next.getMonth() + delta);
  return next.toISOString();
}
