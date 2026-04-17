export type SlotOption = {
  startsAtIso: string;
  label: string;
  /** Optional stable id for recurring rules (teacher availability editor). */
  groupKey?: string;
  /**
   * Rendering variant. "booked" slots show as non-interactive "Reserved" markers
   * on the student-facing booking calendar (no student identity exposed).
   * Defaults to "available".
   */
  kind?: "available" | "booked";
};

export type SlotDayGroup = {
  dayKey: string;
  dayLabel: string;
  slots: SlotOption[];
};

export type CalendarDay = {
  dayKey: string;
  dayLabel: string;
  shortLabel: string;
};

export type CalendarMonthCell = CalendarDay & {
  inCurrentMonth: boolean;
};

function toDayKey(date: Date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function startOfDay(date: Date) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

export function dayKeyFromIso(iso: string) {
  return toDayKey(new Date(iso));
}

/** True if any slot falls on the same local calendar day as `calendarAnchorIso`. */
export function hasSlotMatchingAnchorDay(
  slots: { startsAtIso: string }[],
  calendarAnchorIso: string,
): boolean {
  const anchorDayKey = dayKeyFromIso(calendarAnchorIso);
  return slots.some((s) => dayKeyFromIso(s.startsAtIso) === anchorDayKey);
}

/** Monday → Sunday short weekday names for column headers (locale-aware). */
export function buildWeekdayColumnHeaders(locale: string): string[] {
  const mondayNoon = new Date(2026, 0, 5, 12, 0, 0);
  return Array.from({ length: 7 }, (_, index) => {
    const d = new Date(mondayNoon);
    d.setDate(mondayNoon.getDate() + index);
    return d.toLocaleDateString(locale, { weekday: "short" });
  });
}

export function groupSlotsByDay(slots: SlotOption[], locale: string) {
  const map = new Map<string, SlotDayGroup>();

  for (const slot of slots) {
    const dt = new Date(slot.startsAtIso);
    const dayKey = toDayKey(dt);
    const dayLabel = dt.toLocaleDateString(locale, {
      weekday: "short",
      month: "short",
      day: "numeric",
    });
    const existing = map.get(dayKey);
    if (existing) {
      existing.slots.push(slot);
    } else {
      map.set(dayKey, { dayKey, dayLabel, slots: [slot] });
    }
  }

  return [...map.values()].sort((a, b) => a.dayKey.localeCompare(b.dayKey));
}

export function buildWeekDays(anchorIso: string, locale: string): CalendarDay[] {
  const anchor = startOfDay(new Date(anchorIso));
  const offsetToMonday = (anchor.getDay() + 6) % 7;
  const monday = new Date(anchor);
  monday.setDate(anchor.getDate() - offsetToMonday);

  return Array.from({ length: 7 }, (_, index) => {
    const day = new Date(monday);
    day.setDate(monday.getDate() + index);
    return {
      dayKey: toDayKey(day),
      dayLabel: day.toLocaleDateString(locale, {
        weekday: "short",
        month: "short",
        day: "numeric",
      }),
      shortLabel: day.toLocaleDateString(locale, {
        weekday: "short",
      }),
    };
  });
}

export function buildMonthCells(anchorIso: string, locale: string): CalendarMonthCell[] {
  const anchor = startOfDay(new Date(anchorIso));
  const firstOfMonth = new Date(anchor.getFullYear(), anchor.getMonth(), 1);
  const offsetToMonday = (firstOfMonth.getDay() + 6) % 7;
  const gridStart = new Date(firstOfMonth);
  gridStart.setDate(firstOfMonth.getDate() - offsetToMonday);

  return Array.from({ length: 42 }, (_, index) => {
    const day = new Date(gridStart);
    day.setDate(gridStart.getDate() + index);
    return {
      dayKey: toDayKey(day),
      dayLabel: day.toLocaleDateString(locale, {
        weekday: "short",
        month: "short",
        day: "numeric",
      }),
      shortLabel: String(day.getDate()),
      inCurrentMonth: day.getMonth() === anchor.getMonth(),
    };
  });
}
