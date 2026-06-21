import { DateTime } from "luxon";

export type SlotOption = {
  startsAtIso: string;
  /** When set, month (and other compact) views can show a start–end time range. */
  endsAtIso?: string;
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

function toDayKey(date: Date, timeZone?: string) {
  if (timeZone) {
    return DateTime.fromJSDate(date, { zone: "utc" })
      .setZone(timeZone)
      .toISODate()!;
  }
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function startOfDay(date: Date) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

function localDateTimeFromIso(iso: string, timeZone?: string) {
  return DateTime.fromISO(iso, { zone: "utc" }).setZone(timeZone ?? "local");
}

export function formatDayKeyLabel(
  dayKey: string,
  locale: string,
  options: Intl.DateTimeFormatOptions,
  timeZone?: string,
) {
  if (timeZone) {
    return DateTime.fromISO(dayKey, { zone: timeZone })
      .setLocale(locale)
      .toLocaleString(options);
  }
  return new Date(`${dayKey}T12:00:00.000Z`).toLocaleDateString(locale, {
    ...options,
  });
}

export function dayKeyFromIso(iso: string, timeZone?: string) {
  return toDayKey(new Date(iso), timeZone);
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

export function groupSlotsByDayInTimeZone(
  slots: SlotOption[],
  locale: string,
  timeZone: string,
) {
  const map = new Map<string, SlotDayGroup>();

  for (const slot of slots) {
    const dayKey = dayKeyFromIso(slot.startsAtIso, timeZone);
    const dayLabel = formatDayKeyLabel(
      dayKey,
      locale,
      {
        weekday: "short",
        month: "short",
        day: "numeric",
      },
      timeZone,
    );
    const existing = map.get(dayKey);
    if (existing) {
      existing.slots.push(slot);
    } else {
      map.set(dayKey, { dayKey, dayLabel, slots: [slot] });
    }
  }

  return [...map.values()].sort((a, b) => a.dayKey.localeCompare(b.dayKey));
}

export function buildWeekDays(anchorIso: string, locale: string, timeZone?: string): CalendarDay[] {
  if (timeZone) {
    const anchor = localDateTimeFromIso(anchorIso, timeZone).startOf("day");
    const offsetToMonday = (anchor.weekday + 6) % 7;
    const monday = anchor.minus({ days: offsetToMonday });

    return Array.from({ length: 7 }, (_, index) => {
      const day = monday.plus({ days: index });
      const dayKey = day.toISODate()!;
      return {
        dayKey,
        dayLabel: formatDayKeyLabel(
          dayKey,
          locale,
          {
            weekday: "short",
            month: "short",
            day: "numeric",
          },
          timeZone,
        ),
        shortLabel: formatDayKeyLabel(
          dayKey,
          locale,
          {
            weekday: "short",
          },
          timeZone,
        ),
      };
    });
  }

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

export function buildMonthCells(anchorIso: string, locale: string, timeZone?: string): CalendarMonthCell[] {
  if (timeZone) {
    const anchor = localDateTimeFromIso(anchorIso, timeZone).startOf("day");
    const firstOfMonth = anchor.startOf("month");
    const offsetToMonday = (firstOfMonth.weekday + 6) % 7;
    const gridStart = firstOfMonth.minus({ days: offsetToMonday });

    return Array.from({ length: 42 }, (_, index) => {
      const day = gridStart.plus({ days: index });
      const dayKey = day.toISODate()!;
      return {
        dayKey,
        dayLabel: formatDayKeyLabel(
          dayKey,
          locale,
          {
            weekday: "short",
            month: "short",
            day: "numeric",
          },
          timeZone,
        ),
        shortLabel: String(day.day),
        inCurrentMonth: day.month === anchor.month,
      };
    });
  }

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
