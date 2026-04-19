"use client";

import { useMemo, type ReactNode, type ReactElement } from "react";
import {
  buildMonthCells,
  buildWeekDays,
  buildWeekdayColumnHeaders,
  dayKeyFromIso,
  groupSlotsByDay,
  type SlotOption,
} from "@/lib/slot-calendar";
import { CalendarViewControls } from "@/components/calendar-view-controls";
import { shiftCalendarAnchor, type CalendarViewMode } from "@/lib/calendar-view";

const MAX_MONTH_CHIPS = 3;

/** Prefer showing reserved/taken slots so they are not hidden behind “+N more” when many open slots precede them chronologically. */
function pickMonthDayChips(slots: SlotOption[], max: number): SlotOption[] {
  const sorted = [...slots].sort((a, b) => a.startsAtIso.localeCompare(b.startsAtIso));
  const booked = sorted.filter((s) => s.kind === "booked");
  const available = sorted.filter((s) => s.kind !== "booked");
  const out: SlotOption[] = [];
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

function formatMonthChipTimeRange(locale: string, startsAtIso: string, endsAtIso?: string) {
  const start = new Date(startsAtIso).toLocaleTimeString(locale, {
    hour: "numeric",
    minute: "2-digit",
  });
  if (!endsAtIso) return start;
  const end = new Date(endsAtIso).toLocaleTimeString(locale, {
    hour: "numeric",
    minute: "2-digit",
  });
  return `${start} – ${end}`;
}

export type SlotSelectionCalendarCopy = {
  noAvailabilityYet: string;
  unavailableShort: string;
  calendarDay: string;
  calendarWeek: string;
  calendarMonth: string;
  previous: string;
  next: string;
};

export type SlotSelectionCalendarSlot = SlotOption;

type Props = {
  locale: string;
  copy: SlotSelectionCalendarCopy;
  slots: SlotSelectionCalendarSlot[];
  calendarView: CalendarViewMode;
  onCalendarViewChange: (view: CalendarViewMode) => void;
  calendarAnchor: string;
  onCalendarAnchorChange: (iso: string) => void;
  selectedStartsAtIso: string | null;
  /** Prefer matching `groupKey` when both this and `selectedStartsAtIso` are used. */
  selectedGroupKey?: string | null;
  onSelectSlot: (startsAtIso: string, groupKey?: string) => void;
  /** When set, week columns show an add control for that calendar day. */
  weekColumnAddLabel?: string;
  onAddForDayKey?: (dayKey: string) => void;
  /**
   * When set, clicking a day in month view calls this instead of switching to day view
   * (e.g. teacher availability opens an add modal).
   */
  onMonthDayClick?: (dayKey: string) => void;
  /** Rendered below the day view slot list (e.g. “Add” for that calendar day). */
  dayViewExtra?: (ctx: { dayKey: string }) => ReactNode;
  /** "neutral" avoids strong primary/red selection styling (e.g. teacher availability). */
  selectionStyle?: "accent" | "neutral";
  /**
   * Use inside an outer card (e.g. teacher dashboard) to avoid double border/padding
   * that shrinks the grid.
   */
  variant?: "default" | "embedded";
  /** When set, replaces the default week list with a custom surface (e.g. time-grid week). */
  weekViewReplacement?: ReactElement | null;
  /** When set, replaces the default day list with a custom surface (e.g. time-grid day). */
  dayViewReplacement?: ReactElement | null;
  /** When set, replaces the default month grid with a custom surface (e.g. Google-style month). */
  monthViewReplacement?: ReactElement | null;
};

export function SlotSelectionCalendar({
  locale,
  copy,
  slots,
  calendarView,
  onCalendarViewChange,
  calendarAnchor,
  onCalendarAnchorChange,
  selectedStartsAtIso,
  selectedGroupKey = null,
  onSelectSlot,
  weekColumnAddLabel,
  onAddForDayKey,
  onMonthDayClick,
  dayViewExtra,
  selectionStyle = "accent",
  variant = "default",
  weekViewReplacement = null,
  dayViewReplacement = null,
  monthViewReplacement = null,
}: Props) {
  const daySelectedClass =
    selectionStyle === "neutral"
      ? "border-zinc-400 bg-zinc-100 text-zinc-900 ring-1 ring-zinc-300"
      : "border-primary bg-primary/10 text-zinc-900 ring-1 ring-primary/30";
  const weekSelectedClass =
    selectionStyle === "neutral"
      ? "border-zinc-400 bg-zinc-200 text-zinc-900 shadow-sm"
      : "border-primary bg-primary text-primary-foreground shadow-sm";
  const monthSelectedRing =
    selectionStyle === "neutral" ? "border-zinc-500 ring-1 ring-zinc-300" : "border-primary ring-1 ring-primary/25";
  const monthChipSelectedClass =
    selectionStyle === "neutral"
      ? "border-zinc-400 bg-zinc-200 text-zinc-900"
      : "border-primary bg-primary/10 text-foreground";
  const monthChipUnselectedClass =
    selectionStyle === "neutral"
      ? "border-border bg-background text-muted hover:bg-[var(--app-hover)]"
      : "border-border bg-surface text-foreground hover:bg-[var(--app-hover)]";
  const groupedSlots = groupSlotsByDay(slots, locale);
  const slotMap = new Map(groupedSlots.map((group) => [group.dayKey, group.slots]));
  const slotSelectedDayKey = selectedStartsAtIso ? dayKeyFromIso(selectedStartsAtIso) : "";
  /** In month view with custom day click, highlight anchor day when no slot is selected. */
  const monthCellSelectedDayKey =
    calendarView === "month" && onMonthDayClick
      ? slotSelectedDayKey || dayKeyFromIso(calendarAnchor)
      : slotSelectedDayKey;
  const weekDays = buildWeekDays(calendarAnchor, locale);
  const monthCells = buildMonthCells(calendarAnchor, locale);
  const monthWeekdayHeaders = useMemo(() => buildWeekdayColumnHeaders(locale), [locale]);

  function isSlotSelected(slot: SlotSelectionCalendarSlot) {
    if (selectedGroupKey && slot.groupKey) {
      return slot.groupKey === selectedGroupKey;
    }
    return slot.startsAtIso === selectedStartsAtIso;
  }

  function rangeLabel() {
    const d = new Date(calendarAnchor);
    if (calendarView === "month") {
      return d.toLocaleDateString(locale, { month: "long", year: "numeric" });
    }
    if (calendarView === "week") {
      const from = weekDays[0]?.dayKey ? new Date(`${weekDays[0].dayKey}T00:00:00`) : null;
      const to = weekDays[6]?.dayKey ? new Date(`${weekDays[6].dayKey}T00:00:00`) : null;
      if (!from || !to) return "";
      return `${from.toLocaleDateString(locale, { month: "short", day: "numeric" })} - ${to.toLocaleDateString(locale, { month: "short", day: "numeric", year: "numeric" })}`;
    }
    return d.toLocaleDateString(locale, {
      weekday: "long",
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  }

  const rootClassName =
    variant === "embedded"
      ? "rounded-none border-0 bg-transparent p-0 shadow-none"
      : "rounded-2xl border border-zinc-200 bg-zinc-50 p-4 shadow-sm";

  return (
    <div className={rootClassName}>
      <div className="mb-4 border-b border-zinc-200 pb-3">
        <CalendarViewControls
          view={calendarView}
          onViewChange={onCalendarViewChange}
          onPrevious={() =>
            onCalendarAnchorChange(shiftCalendarAnchor(calendarAnchor, calendarView, -1))
          }
          onNext={() =>
            onCalendarAnchorChange(shiftCalendarAnchor(calendarAnchor, calendarView, 1))
          }
          label={rangeLabel()}
          dayLabel={copy.calendarDay}
          weekLabel={copy.calendarWeek}
          monthLabel={copy.calendarMonth}
          previousLabel={copy.previous}
          nextLabel={copy.next}
        />
      </div>
      {calendarView === "day" &&
        (dayViewReplacement ?? (
          <>
            {(slotMap.get(dayKeyFromIso(calendarAnchor)) ?? []).length === 0 ? (
              <p className="rounded-lg border border-dashed border-zinc-300 px-3 py-6 text-center text-sm text-zinc-500">
                {copy.noAvailabilityYet}
              </p>
            ) : (
              <div className="space-y-2">
                {(slotMap.get(dayKeyFromIso(calendarAnchor)) ?? []).map((slot, idx) => {
                  if (slot.kind === "booked") {
                    return (
                      <div
                        key={`reserved:${slot.startsAtIso}:${idx}`}
                        data-testid="slot-reserved"
                        aria-disabled="true"
                        className="flex w-full items-center justify-between rounded-lg border border-dashed border-zinc-300 bg-zinc-100 px-3 py-2 text-left text-sm text-zinc-500"
                      >
                        <span className="font-medium">
                          {new Date(slot.startsAtIso).toLocaleTimeString(locale, {
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </span>
                        <span className="truncate pl-3 text-xs uppercase tracking-wide text-zinc-500">
                          {slot.label}
                        </span>
                      </div>
                    );
                  }
                  const selected = isSlotSelected(slot);
                  return (
                    <button
                      key={`${slot.startsAtIso}:${slot.groupKey ?? idx}`}
                      type="button"
                      onClick={() => onSelectSlot(slot.startsAtIso, slot.groupKey)}
                      className={`flex w-full items-center justify-between rounded-lg border px-3 py-2 text-left text-sm transition ${
                        selected ? daySelectedClass : "border-zinc-200 bg-white text-zinc-800 hover:bg-zinc-100"
                      }`}
                    >
                      <span className="font-medium">
                        {new Date(slot.startsAtIso).toLocaleTimeString(locale, {
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </span>
                      <span className="truncate pl-3 text-xs text-zinc-500">{slot.label}</span>
                    </button>
                  );
                })}
              </div>
            )}
            {dayViewExtra ? (
              <div className="mt-3">{dayViewExtra({ dayKey: dayKeyFromIso(calendarAnchor) })}</div>
            ) : null}
          </>
        ))}
      {calendarView === "week" &&
        (weekViewReplacement ?? (
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4 md:grid-cols-7">
            {weekDays.map((day) => {
              const daySlots = slotMap.get(day.dayKey) ?? [];
              const dayDate = new Date(`${day.dayKey}T00:00:00`);
              return (
                <div
                  key={day.dayKey}
                  className={`rounded-lg border p-2 ${
                    daySlots.length > 0 ? "border-border bg-surface" : "border-border bg-background"
                  }`}
                >
                  <div className="mb-2 flex items-start justify-between gap-1 border-b border-border pb-1">
                    <p className="text-xs font-semibold text-muted">
                      {day.shortLabel} {dayDate.getDate()}
                    </p>
                    {onAddForDayKey && weekColumnAddLabel ? (
                      <button
                        type="button"
                        onClick={() => onAddForDayKey(day.dayKey)}
                        className="shrink-0 rounded-md border border-border bg-surface px-1.5 py-0.5 text-[10px] font-semibold text-foreground hover:bg-[var(--app-hover)]"
                      >
                        {weekColumnAddLabel}
                      </button>
                    ) : null}
                  </div>
                  <div className="space-y-1">
                    {daySlots.slice(0, 5).map((slot, idx) => {
                      if (slot.kind === "booked") {
                        return (
                          <div
                            key={`reserved:${slot.startsAtIso}:${idx}`}
                            data-testid="slot-reserved-week"
                            aria-disabled="true"
                            className="w-full rounded-md border border-dashed border-border bg-background px-2 py-1 text-xs text-muted"
                          >
                            <span className="block whitespace-nowrap font-medium">
                              {new Date(slot.startsAtIso).toLocaleTimeString(locale, {
                                hour: "2-digit",
                                minute: "2-digit",
                              })}
                            </span>
                            <span className="block text-[10px] uppercase tracking-wide">
                              {slot.label}
                            </span>
                          </div>
                        );
                      }
                      const selected = isSlotSelected(slot);
                      return (
                        <button
                          key={`${slot.startsAtIso}:${slot.groupKey ?? idx}`}
                          type="button"
                          onClick={() => {
                            onSelectSlot(slot.startsAtIso, slot.groupKey);
                            onCalendarAnchorChange(slot.startsAtIso);
                          }}
                          className={`w-full rounded-md border px-2 py-1 text-xs transition ${
                            selected ? weekSelectedClass : "border-border bg-surface text-foreground hover:bg-[var(--app-hover)]"
                          }`}
                          aria-pressed={selected}
                        >
                          <span className="whitespace-nowrap font-medium">
                            {new Date(slot.startsAtIso).toLocaleTimeString(locale, {
                              hour: "2-digit",
                              minute: "2-digit",
                            })}
                          </span>
                        </button>
                      );
                    })}
                    {daySlots.length > 5 && (
                      <p className="text-center text-[10px] text-muted">+{daySlots.length - 5}</p>
                    )}
                    {daySlots.length === 0 && (
                      <p className="rounded-md border border-border bg-background px-2 py-1 text-center text-[11px] leading-4 text-muted">
                        {copy.unavailableShort}
                      </p>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        ))}
      {calendarView === "month" &&
        (monthViewReplacement ?? (
          <div className="overflow-x-auto pb-1" data-testid="slot-calendar-month-grid">
            <div className="min-w-[720px]">
              <div className="mb-2 grid grid-cols-7 gap-px bg-border">
                {monthWeekdayHeaders.map((day, index) => (
                  <p
                    key={`${day}-${index}`}
                    className="bg-background py-1.5 text-center text-[11px] font-semibold text-muted"
                  >
                    {day}
                  </p>
                ))}
              </div>
              <div className="grid grid-cols-7 gap-px bg-border">
                {monthCells.map((cell) => {
                  const isSelected = monthCellSelectedDayKey === cell.dayKey;
                  const raw = slotMap.get(cell.dayKey) ?? [];
                  const sorted = [...raw].sort((a, b) => a.startsAtIso.localeCompare(b.startsAtIso));
                  const chips = pickMonthDayChips(sorted, MAX_MONTH_CHIPS);
                  const more = sorted.length - chips.length;
                  const bookableSlots = sorted.filter((s) => s.kind !== "booked");
                  const hasBookable = bookableSlots.length > 0;
                  const isAvailable = cell.inCurrentMonth && hasBookable;
                  const isUnavailable = cell.inCurrentMonth && !hasBookable;
                  const showMonthAdd = Boolean(
                    onAddForDayKey && weekColumnAddLabel && cell.inCurrentMonth,
                  );
                  return (
                    <div
                      key={cell.dayKey}
                      data-month-day-cell={cell.dayKey}
                      className={`flex min-h-[96px] flex-col border p-1 text-left text-xs transition ${
                        isSelected ? monthSelectedRing : "border-border"
                      } ${
                        !cell.inCurrentMonth
                          ? "bg-[var(--app-canvas)] text-muted/50"
                          : isAvailable
                            ? "bg-surface text-foreground"
                            : isUnavailable
                              ? "bg-background text-muted"
                              : "bg-[var(--app-canvas)] text-muted/50"
                      }`}
                    >
                      <div className="flex items-start justify-between gap-0.5">
                        <button
                          type="button"
                          data-day-key={cell.dayKey}
                          onClick={() => {
                            if (onMonthDayClick) {
                              onMonthDayClick(cell.dayKey);
                              return;
                            }
                            onCalendarAnchorChange(`${cell.dayKey}T00:00:00.000Z`);
                            onCalendarViewChange("day");
                          }}
                          className="min-w-0 rounded px-0.5 text-left text-sm font-semibold hover:bg-[var(--app-hover)]"
                        >
                          {cell.shortLabel}
                        </button>
                        {showMonthAdd ? (
                          <button
                            type="button"
                            data-month-day-add={cell.dayKey}
                            title={weekColumnAddLabel}
                            onClick={(e) => {
                              e.stopPropagation();
                              onAddForDayKey!(cell.dayKey);
                            }}
                            className="shrink-0 rounded border border-border bg-surface px-1 py-0.5 text-[9px] font-semibold text-foreground shadow-sm hover:bg-[var(--app-hover)]"
                          >
                            {weekColumnAddLabel}
                          </button>
                        ) : null}
                      </div>
                      <div className="mt-1 flex min-h-0 flex-1 flex-col gap-0.5">
                        {chips.map((slot, idx) => {
                          if (slot.kind === "booked") {
                            const range = formatMonthChipTimeRange(
                              locale,
                              slot.startsAtIso,
                              slot.endsAtIso,
                            );
                            return (
                              <div
                                key={`reserved:${slot.startsAtIso}:${idx}`}
                                data-testid="slot-reserved-month"
                                role="status"
                                aria-label={`${slot.label}: ${range}`}
                                className="w-full truncate rounded border border-dashed border-amber-300/80 bg-amber-50 px-1 py-0.5 text-left text-[9px] font-medium leading-tight text-amber-950 shadow-sm dark:border-amber-600/50 dark:bg-amber-950/30 dark:text-amber-100"
                              >
                                <span className="font-semibold">{range}</span>
                                <span className="mt-0.5 block truncate text-[9px] font-semibold text-amber-900 dark:text-amber-50">
                                  {slot.label}
                                </span>
                              </div>
                            );
                          }
                          const selected = isSlotSelected(slot);
                          return (
                            <button
                              key={`${slot.startsAtIso}:${slot.groupKey ?? idx}`}
                              type="button"
                              data-testid="month-slot-chip"
                              data-starts-at={slot.startsAtIso}
                              onClick={(e) => {
                                e.stopPropagation();
                                onSelectSlot(slot.startsAtIso, slot.groupKey);
                                onCalendarAnchorChange(slot.startsAtIso);
                              }}
                              className={`w-full truncate rounded border px-1 py-0.5 text-left text-[9px] font-medium leading-tight shadow-sm ${
                                selected ? monthChipSelectedClass : monthChipUnselectedClass
                              }`}
                            >
                              {formatMonthChipTimeRange(locale, slot.startsAtIso, slot.endsAtIso)}
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
        ))}
    </div>
  );
}
