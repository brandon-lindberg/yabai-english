"use client";

import type { CalendarMonthCell } from "@/lib/slot-calendar";
import { SLOT_BOOKED, SLOT_FIGURE, slotClasses } from "@/components/ui/slot-state";

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
  /** Shown on booking chips (e.g. “Reserved”). */
  reservedLabel: string;
  timeZone?: string;
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
  reservedLabel,
  timeZone,
}: Props) {
  const monthSelectedRing = "border-foreground ring-1 ring-foreground";
  const chipOn = slotClasses({ kind: "open", selected: true });
  const chipOff = slotClasses({ kind: "open" });

  return (
    <div className="overflow-x-auto pb-1" data-testid="google-month-grid">
      <div className="min-w-[720px]">
        <div className="mb-2 grid grid-cols-7 gap-px bg-border">
          {monthWeekdayHeaders.map((day, index) => (
            <p
              key={`${day}-${index}`}
              className="bg-surface py-1.5 text-center text-[11px] font-semibold text-muted"
            >
              {day}
            </p>
          ))}
        </div>
        <div className="grid grid-cols-7 gap-px bg-border">
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
                  isSelected ? monthSelectedRing : "border-border"
                } ${
                  !cell.inCurrentMonth
                    ? "bg-surface text-muted"
                    : isAvailable
                      ? "bg-surface text-foreground"
                      : isUnavailable
                        ? "bg-surface text-muted"
                        : "bg-surface text-muted"
                }`}
              >
                <div className="flex items-start justify-between gap-0.5">
                  <button
                    type="button"
                    data-day-key={cell.dayKey}
                    onClick={() => onOpenDay(cell.dayKey)}
                    className="inline-flex min-h-6 min-w-6 items-center rounded px-1 text-left text-sm font-semibold tabular-nums hover:bg-[var(--app-hover)]"
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
                      className="inline-flex min-h-6 min-w-6 shrink-0 items-center justify-center rounded border border-border bg-surface px-1.5 py-1 text-[10px] font-semibold text-foreground hover:bg-[var(--app-hover)]"
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
                          className={`w-full truncate rounded-md px-1 py-0.5 text-left text-[9px] font-medium leading-tight ${SLOT_BOOKED}`}
                        >
                          <span className="block truncate font-semibold tabular-nums">
                            {new Date(slot.startsAtIso).toLocaleTimeString(locale, {
                              hour: "numeric",
                              minute: "2-digit",
                              timeZone,
                            })}
                            {" – "}
                            {new Date(slot.endsAtIso).toLocaleTimeString(locale, {
                              hour: "numeric",
                              minute: "2-digit",
                              timeZone,
                            })}
                          </span>
                          <span className="mt-0.5 block truncate text-[8px] font-medium text-[var(--app-canvas)]/75">
                            {reservedLabel}
                          </span>
                          {slot.label ? (
                            <span className="mt-0.5 block truncate text-[8px] text-[var(--app-canvas)]/75">
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
                        className={`w-full truncate rounded px-1 py-0.5 text-left text-[9px] font-medium leading-tight ${SLOT_FIGURE} ${
                          sel ? chipOn : chipOff
                        }`}
                      >
                        {new Date(slot.startsAtIso).toLocaleTimeString(locale, {
                          hour: "numeric",
                          minute: "2-digit",
                          timeZone,
                        })}
                        {" – "}
                        {new Date(slot.endsAtIso).toLocaleTimeString(locale, {
                          hour: "numeric",
                          minute: "2-digit",
                          timeZone,
                        })}
                      </button>
                    );
                  })}
                  {more > 0 ? (
                    <p className="px-0.5 text-[9px] font-medium text-muted">+{more} more</p>
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
