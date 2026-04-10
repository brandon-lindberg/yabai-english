export type SlotOption = {
  startsAtIso: string;
  label: string;
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

export function groupSlotsByDay(slots: SlotOption[]) {
  const map = new Map<string, SlotDayGroup>();

  for (const slot of slots) {
    const dt = new Date(slot.startsAtIso);
    const dayKey = toDayKey(dt);
    const dayLabel = dt.toLocaleDateString(undefined, {
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

export function buildWeekDays(anchorIso: string): CalendarDay[] {
  const anchor = startOfDay(new Date(anchorIso));
  const offsetToMonday = (anchor.getDay() + 6) % 7;
  const monday = new Date(anchor);
  monday.setDate(anchor.getDate() - offsetToMonday);

  return Array.from({ length: 7 }, (_, index) => {
    const day = new Date(monday);
    day.setDate(monday.getDate() + index);
    return {
      dayKey: toDayKey(day),
      dayLabel: day.toLocaleDateString(undefined, {
        weekday: "short",
        month: "short",
        day: "numeric",
      }),
      shortLabel: day.toLocaleDateString(undefined, {
        weekday: "short",
      }),
    };
  });
}

export function buildMonthCells(anchorIso: string): CalendarMonthCell[] {
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
      dayLabel: day.toLocaleDateString(undefined, {
        weekday: "short",
        month: "short",
        day: "numeric",
      }),
      shortLabel: String(day.getDate()),
      inCurrentMonth: day.getMonth() === anchor.getMonth(),
    };
  });
}
