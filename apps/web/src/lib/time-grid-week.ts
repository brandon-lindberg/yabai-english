import { dayKeyFromIso } from "@/lib/slot-calendar";

export const MINUTES_PER_DAY = 24 * 60;

/** Day view shows this local-time window (7:00–22:00 = 7am through the 9pm hour). */
export const DAY_VIEW_FOCUS_START_MIN = 7 * 60;
export const DAY_VIEW_FOCUS_END_MIN = 22 * 60;

/**
 * Map a same-day [startMin, endMin] interval into % positions inside a shorter focus window
 * (e.g. 7am–10pm for day view). Returns null if there is no overlap.
 */
export function layoutTimedBlockInFocusWindow(
  startMin: number,
  endMin: number,
  windowStartMin: number = DAY_VIEW_FOCUS_START_MIN,
  windowEndMin: number = DAY_VIEW_FOCUS_END_MIN,
): { topPct: number; heightPct: number } | null {
  const visStart = Math.max(windowStartMin, startMin);
  const visEnd = Math.min(windowEndMin, endMin);
  if (visEnd <= visStart) return null;
  const span = Math.max(1, windowEndMin - windowStartMin);
  const topPct = ((visStart - windowStartMin) / span) * 100;
  const rawH = ((visEnd - visStart) / span) * 100;
  const minH = (12 / span) * 100;
  const heightPct = Math.max(rawH, minH);
  return { topPct, heightPct };
}

/** Hour labels for the focused day strip (default 7 … 21). */
export function focusDayGutterLabels(
  locale: string,
  startHour = 7,
  endHourExclusive = 22,
): string[] {
  const base = new Date(2026, 0, 1, 0, 0, 0, 0);
  return Array.from({ length: endHourExclusive - startHour }, (_, i) => {
    const d = new Date(base);
    d.setHours(startHour + i);
    return d.toLocaleTimeString(locale, { hour: "numeric", minute: "2-digit" });
  });
}

/** Must match column header / gutter sync (`h-[52px]` and `paddingTop: 52`). */
export const TIME_GRID_HEADER_PX = 52;

/** On load, scroll so this local hour sits at the top of the viewport (full 24h grid). */
export const TIME_GRID_DEFAULT_SCROLL_ANCHOR_HOUR = 7;

export function initialScrollTopForTimeGrid(
  hourPx: number,
  anchorHour: number = TIME_GRID_DEFAULT_SCROLL_ANCHOR_HOUR,
): number {
  return TIME_GRID_HEADER_PX + anchorHour * hourPx;
}

export type TimeGridBlockKind = "availability" | "booking";

export type TimeGridSlotInput = {
  startsAtIso: string;
  endsAtIso: string;
  groupKey?: string;
  label: string;
  /** What kind of block this represents. Defaults to "availability". */
  kind?: TimeGridBlockKind;
  /** Optional secondary line (e.g. student name for a booked lesson). */
  subtitle?: string;
};

export type PlacedTimeGridBlock = {
  dayKey: string;
  startMin: number;
  endMin: number;
  startsAtIso: string;
  endsAtIso: string;
  groupKey?: string;
  label: string;
  topPct: number;
  heightPct: number;
  kind?: TimeGridBlockKind;
  subtitle?: string;
};

export function isTimeGridBlockSelected(
  block: PlacedTimeGridBlock,
  selectedStartsAtIso: string | null,
  selectedGroupKey: string | null | undefined,
): boolean {
  if (selectedGroupKey && block.groupKey) {
    return block.groupKey === selectedGroupKey;
  }
  return block.startsAtIso === selectedStartsAtIso;
}

/** Minutes since local midnight for an instant (used for grid placement). */
export function minutesSinceLocalMidnight(iso: string): number {
  const d = new Date(iso);
  return d.getHours() * 60 + d.getMinutes() + d.getSeconds() / 60;
}

const MIN_BLOCK_HEIGHT_PCT = (15 / MINUTES_PER_DAY) * 100;

/**
 * Maps availability slots onto a Monday–Sunday week: one column per `weekDayKeys`
 * entry, blocks positioned by local time-of-day (Google Calendar–style week grid).
 */
export function placeSlotsOnWeekGrid(
  weekDayKeys: readonly string[],
  slots: readonly TimeGridSlotInput[],
): Map<string, PlacedTimeGridBlock[]> {
  const allowed = new Set(weekDayKeys);
  const byDay = new Map<string, PlacedTimeGridBlock[]>();
  for (const k of weekDayKeys) {
    byDay.set(k, []);
  }

  for (const slot of slots) {
    const dk = dayKeyFromIso(slot.startsAtIso);
    if (!allowed.has(dk)) continue;

    let startMin = Math.floor(minutesSinceLocalMidnight(slot.startsAtIso));
    let endMin = Math.ceil(minutesSinceLocalMidnight(slot.endsAtIso));
    if (dayKeyFromIso(slot.endsAtIso) !== dk) {
      endMin = MINUTES_PER_DAY;
    }
    startMin = Math.max(0, Math.min(MINUTES_PER_DAY, startMin));
    endMin = Math.max(0, Math.min(MINUTES_PER_DAY, endMin));
    if (endMin <= startMin) continue;

    const rawHeightPct = ((endMin - startMin) / MINUTES_PER_DAY) * 100;
    const heightPct = Math.max(rawHeightPct, MIN_BLOCK_HEIGHT_PCT);
    const topPct = (startMin / MINUTES_PER_DAY) * 100;

    byDay.get(dk)!.push({
      dayKey: dk,
      startMin,
      endMin,
      startsAtIso: slot.startsAtIso,
      endsAtIso: slot.endsAtIso,
      groupKey: slot.groupKey,
      label: slot.label,
      topPct,
      heightPct,
      kind: slot.kind,
      subtitle: slot.subtitle,
    });
  }

  for (const list of byDay.values()) {
    list.sort((a, b) => a.startMin - b.startMin);
  }

  return byDay;
}

/** Single-day column placement (same rules as one week column). */
export function placeSlotsOnDayColumn(
  dayKey: string,
  slots: readonly TimeGridSlotInput[],
): PlacedTimeGridBlock[] {
  const map = placeSlotsOnWeekGrid([dayKey], slots);
  return map.get(dayKey) ?? [];
}

/** Labels for the time gutter (full day, every hour). */
export function hourGutterLabels(locale: string): string[] {
  const base = new Date(2026, 0, 1, 0, 0, 0, 0);
  return Array.from({ length: 24 }, (_, h) => {
    const d = new Date(base);
    d.setHours(h);
    return d.toLocaleTimeString(locale, { hour: "numeric", minute: "2-digit" });
  });
}
