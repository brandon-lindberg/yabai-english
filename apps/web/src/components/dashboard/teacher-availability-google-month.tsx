"use client";

import type { CalendarMonthCell } from "@/lib/slot-calendar";

export type MonthDaySlotChip = {
  startsAtIso: string;
  endsAtIso: string;
  label: string;
  groupKey?: string;
  /** Booked lessons vs open availability (default: availability). */
  kind?: "availability" | "booking";
};

type Props = {
  locale: string;
  monthWeekdayHeaders: string[];
  monthCells: CalendarMonthCell[];
  slotsByDay: Map<string, MonthDaySlotChip[]>;
  /** Highlight ring for selected slot’s day, else anchor day when nothing selected. */
  focusedDayKey: string;
  selectedStartsAtIso: string | null;
  selectedGroupKey?: string | null;
  onOpenDay: (dayKey: string) => void;
  onAddForDayKey?: (dayKey: string) => void;
  addLabel?: string;
  onSelectSlot: (startsAtIso: string, groupKey?: string) => void;
  onCalendarAnchorChange: (iso: string) => void;
  selectionStyle?: "accent" | "neutral";
  /** Shown on booking chips (e.g. “Reserved”). */
  reservedLabel: string;
};

const MAX_CHIPS = 3;

function pickMonthChips(slots: MonthDaySlotChip[], max: number): MonthDaySlotChip[] {
  const sorted = [...slots].sort((a, b) => a.startsAtIso.localeCompare(b.startsAtIso));
  const booked = sorted.filter((s) => s.kind === "booking");
  const available = sorted.filter((s) => s.kind !== "booking");
  const out: MonthDaySlotChip[] = [];
  for (const s of booked) {
    if (out.length >= max) break;
    out.push(s);
  }
  for (const s of available) {
    if (out.length >= max) break;
    out.push(s);
  }
  out.sort((a, b) => a.startsAtIso.localeCompare(b.startsAtIso));
  return out;
}

function chipSelected(
  slot: MonthDaySlotChip,
  selectedStartsAtIso: string | null,
  selectedGroupKey: string | null | undefined,
) {
  if (selectedGroupKey && slot.groupKey) {
    return slot.groupKey === selectedGroupKey;
  }
  return slot.startsAtIso === selectedStartsAtIso;
}

export function TeacherAvailabilityGoogleMonth({
  locale,
  monthWeekdayHeaders,
  monthCells,
  slotsByDay,
  focusedDayKey,
  selectedStartsAtIso,
  selectedGroupKey = null,
  onOpenDay,
  onAddForDayKey,
  addLabel,
  onSelectSlot,
  onCalendarAnchorChange,
  selectionStyle = "accent",
  reservedLabel,
}: Props) {
  const monthSelectedRing =
    selectionStyle === "neutral" ? "border-zinc-500 ring-1 ring-zinc-300" : "border-primary ring-1 ring-primary/25";
  const chipOn =
    selectionStyle === "neutral"
      ? "border-zinc-500 bg-zinc-200 text-zinc-900"
      : "border-primary bg-primary/15 text-blue-900";
  const chipOff =
    selectionStyle === "neutral"
      ? "border-zinc-200 bg-zinc-100 text-zinc-800 hover:bg-zinc-200"
      : "border-blue-100 bg-blue-50 text-blue-900 hover:bg-blue-100";

  return (
    <div className="overflow-x-auto pb-1" data-testid="google-month-grid">
      <div className="min-w-[720px]">
        <div className="mb-2 grid grid-cols-7 gap-px bg-zinc-200">
          {monthWeekdayHeaders.map((day, index) => (
            <p
              key={`${day}-${index}`}
              className="bg-zinc-50 py-1.5 text-center text-[11px] font-semibold text-zinc-600"
            >
              {day}
            </p>
          ))}
        </div>
        <div className="grid grid-cols-7 gap-px bg-zinc-200">
          {monthCells.map((cell) => {
            const raw = slotsByDay.get(cell.dayKey) ?? [];
            const sorted = [...raw].sort((a, b) => a.startsAtIso.localeCompare(b.startsAtIso));
            const chips = pickMonthChips(sorted, MAX_CHIPS);
            const more = sorted.length - chips.length;
            const isSelected = focusedDayKey === cell.dayKey;
            const bookable = sorted.filter((s) => s.kind !== "booking");
            const hasBookable = bookable.length > 0;
            const isAvailable = cell.inCurrentMonth && hasBookable;
            const isUnavailable = cell.inCurrentMonth && !hasBookable;
            const showAdd = Boolean(onAddForDayKey && addLabel && cell.inCurrentMonth);

            return (
              <div
                key={cell.dayKey}
                data-month-day-cell={cell.dayKey}
                className={`flex min-h-[96px] flex-col border border-transparent p-1 text-left text-xs transition ${
                  isSelected ? monthSelectedRing : "border-zinc-100"
                } ${
                  !cell.inCurrentMonth
                    ? "bg-zinc-50/90 text-zinc-400"
                    : isAvailable
                      ? "bg-white text-zinc-900"
                      : isUnavailable
                        ? "bg-white text-zinc-500"
                        : "bg-zinc-50/80 text-zinc-400"
                }`}
              >
                <div className="flex items-start justify-between gap-0.5">
                  <button
                    type="button"
                    data-day-key={cell.dayKey}
                    onClick={() => onOpenDay(cell.dayKey)}
                    className="min-w-0 rounded px-0.5 text-left text-sm font-semibold hover:bg-zinc-100"
                  >
                    {cell.shortLabel}
                  </button>
                  {showAdd ? (
                    <button
                      type="button"
                      data-month-day-add={cell.dayKey}
                      title={addLabel}
                      onClick={(e) => {
                        e.stopPropagation();
                        onAddForDayKey!(cell.dayKey);
                      }}
                      className="shrink-0 rounded border border-zinc-200 bg-white px-1 py-0.5 text-[9px] font-semibold text-zinc-700 shadow-sm hover:bg-zinc-100"
                    >
                      {addLabel}
                    </button>
                  ) : null}
                </div>
                <div className="mt-1 flex min-h-0 flex-1 flex-col gap-0.5">
                  {chips.map((slot) => {
                    if (slot.kind === "booking") {
                      return (
                        <div
                          key={`booking-${slot.startsAtIso}-${slot.groupKey ?? ""}`}
                          data-testid="month-booking-chip"
                          data-starts-at={slot.startsAtIso}
                          className="w-full truncate rounded-md border border-amber-200/70 bg-amber-50/50 px-1 py-0.5 text-left text-[9px] font-medium leading-tight text-amber-950/90 dark:border-amber-800/40 dark:bg-amber-950/25 dark:text-amber-50/95"
                        >
                          <span className="block truncate font-medium text-amber-950 dark:text-amber-50">
                            {new Date(slot.startsAtIso).toLocaleTimeString(locale, {
                              hour: "numeric",
                              minute: "2-digit",
                            })}
                            {" – "}
                            {new Date(slot.endsAtIso).toLocaleTimeString(locale, {
                              hour: "numeric",
                              minute: "2-digit",
                            })}
                          </span>
                          <span className="mt-0.5 block truncate text-[8px] font-medium text-amber-900/85 dark:text-amber-100/90">
                            {reservedLabel}
                          </span>
                          {slot.label ? (
                            <span className="mt-0.5 block truncate text-[8px] text-amber-900/70 dark:text-amber-100/75">
                              {slot.label}
                            </span>
                          ) : null}
                        </div>
                      );
                    }
                    const sel = chipSelected(slot, selectedStartsAtIso, selectedGroupKey);
                    return (
                      <button
                        key={`${slot.startsAtIso}-${slot.groupKey ?? ""}`}
                        type="button"
                        data-testid="month-slot-chip"
                        data-starts-at={slot.startsAtIso}
                        onClick={(e) => {
                          e.stopPropagation();
                          onSelectSlot(slot.startsAtIso, slot.groupKey);
                          onCalendarAnchorChange(slot.startsAtIso);
                        }}
                        className={`w-full truncate rounded border px-1 py-0.5 text-left text-[9px] font-medium leading-tight shadow-sm ${
                          sel ? chipOn : chipOff
                        }`}
                      >
                        {new Date(slot.startsAtIso).toLocaleTimeString(locale, {
                          hour: "numeric",
                          minute: "2-digit",
                        })}
                        {" – "}
                        {new Date(slot.endsAtIso).toLocaleTimeString(locale, {
                          hour: "numeric",
                          minute: "2-digit",
                        })}
                      </button>
                    );
                  })}
                  {more > 0 ? (
                    <p className="px-0.5 text-[9px] font-medium text-zinc-500">+{more} more</p>
                  ) : null}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
