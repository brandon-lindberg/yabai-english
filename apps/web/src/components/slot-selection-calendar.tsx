"use client";

import { useMemo, type ReactNode, type ReactElement } from "react";
import {
  buildMonthCells,
  buildWeekDays,
  buildWeekdayColumnHeaders,
  dayKeyToIsoAtNoon,
  dayKeyFromIso,
  formatDayKeyLabel,
  groupSlotsByDay,
  groupSlotsByDayInTimeZone,
  type SlotOption,
} from "@/lib/slot-calendar";
import {
  CalendarEmpty,
  CalendarFrame,
  CalendarMonthGrid,
  CalendarWeekColumns,
} from "@/components/ui/calendar-frame";
import { shiftCalendarAnchor, type CalendarViewMode } from "@/lib/calendar-view";
import { slotClasses } from "@/components/ui/slot-state";

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

function formatMonthChipTimeRange(
  locale: string,
  startsAtIso: string,
  endsAtIso?: string,
  timeZone?: string,
) {
  const start = new Date(startsAtIso).toLocaleTimeString(locale, {
    hour: "numeric",
    minute: "2-digit",
    timeZone,
  });
  if (!endsAtIso) return start;
  const end = new Date(endsAtIso).toLocaleTimeString(locale, {
    hour: "numeric",
    minute: "2-digit",
    timeZone,
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
  /** When set, replaces the default week list with a custom surface (e.g. time-grid week). */
  weekViewReplacement?: ReactElement | null;
  /** When set, replaces the default day list with a custom surface (e.g. time-grid day). */
  dayViewReplacement?: ReactElement | null;
  /** When set, replaces the default month grid with a custom surface (e.g. Google-style month). */
  monthViewReplacement?: ReactElement | null;
  /** Calendar timezone for day grouping, navigation, and labels. Defaults to the browser timezone. */
  timeZone?: string;
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
  weekViewReplacement = null,
  dayViewReplacement = null,
  monthViewReplacement = null,
  timeZone,
}: Props) {
  // Students and teachers read the same slot vocabulary: an open slot is a
  // dashed outline, the one you picked is ringed in ink. See ui/slot-state.
  const groupedSlots = timeZone
    ? groupSlotsByDayInTimeZone(slots, locale, timeZone)
    : groupSlotsByDay(slots, locale);
  const slotMap = new Map(groupedSlots.map((group) => [group.dayKey, group.slots]));
  const slotSelectedDayKey = selectedStartsAtIso ? dayKeyFromIso(selectedStartsAtIso, timeZone) : "";
  const anchorDayKey = dayKeyFromIso(calendarAnchor, timeZone);
  /** In month view with custom day click, highlight anchor day when no slot is selected. */
  const monthCellSelectedDayKey =
    calendarView === "month" && onMonthDayClick
      ? slotSelectedDayKey || anchorDayKey
      : slotSelectedDayKey;
  const weekDays = buildWeekDays(calendarAnchor, locale, timeZone);
  const monthCells = buildMonthCells(calendarAnchor, locale, timeZone);
  const monthWeekdayHeaders = useMemo(() => buildWeekdayColumnHeaders(locale), [locale]);

  function isSlotSelected(slot: SlotSelectionCalendarSlot) {
    if (selectedGroupKey && slot.groupKey) {
      return slot.groupKey === selectedGroupKey;
    }
    return slot.startsAtIso === selectedStartsAtIso;
  }

  function slotTime(iso: string) {
    return new Date(iso).toLocaleTimeString(locale, {
      hour: "2-digit",
      minute: "2-digit",
      timeZone,
    });
  }

  function rangeLabel() {
    const dayLabel = (dayKey: string, options: Intl.DateTimeFormatOptions) =>
      formatDayKeyLabel(dayKey, locale, options, timeZone);
    const d = new Date(calendarAnchor);
    if (calendarView === "month") {
      return dayLabel(anchorDayKey, { month: "long", year: "numeric" });
    }
    if (calendarView === "week") {
      const from = weekDays[0]?.dayKey;
      const to = weekDays[6]?.dayKey;
      if (!from || !to) return "";
      return `${dayLabel(from, { month: "short", day: "numeric" })} - ${dayLabel(to, { month: "short", day: "numeric", year: "numeric" })}`;
    }
    if (!timeZone) {
      return d.toLocaleDateString(locale, {
        weekday: "long",
        month: "short",
        day: "numeric",
        year: "numeric",
      });
    }
    return dayLabel(anchorDayKey, {
      weekday: "long",
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  }

  return (
    <CalendarFrame
      label={rangeLabel()}
      view={calendarView}
      onViewChange={onCalendarViewChange}
      onPrevious={() =>
        onCalendarAnchorChange(shiftCalendarAnchor(calendarAnchor, calendarView, -1, timeZone))
      }
      onNext={() =>
        onCalendarAnchorChange(shiftCalendarAnchor(calendarAnchor, calendarView, 1, timeZone))
      }
      copy={copy}
    >
      {calendarView === "day" &&
        (dayViewReplacement ?? (
          <>
            {(slotMap.get(anchorDayKey) ?? []).length === 0 ? (
              <CalendarEmpty>{copy.noAvailabilityYet}</CalendarEmpty>
            ) : (
              <div className="space-y-2">
                {(slotMap.get(anchorDayKey) ?? []).map((slot, idx) => {
                  if (slot.kind === "booked") {
                    return (
                      <div
                        key={`reserved:${slot.startsAtIso}:${idx}`}
                        data-testid="slot-reserved"
                        aria-disabled="true"
                        className={`flex w-full items-center justify-between rounded-lg px-3 py-2.5 text-left text-sm tabular-nums ${slotClasses(
                          { kind: "booked" },
                        )}`}
                      >
                        <span className="font-semibold">{slotTime(slot.startsAtIso)}</span>
                        <span className="truncate pl-3 text-xs">{slot.label}</span>
                      </div>
                    );
                  }
                  const selected = isSlotSelected(slot);
                  return (
                    <button
                      key={`${slot.startsAtIso}:${slot.groupKey ?? idx}`}
                      type="button"
                      onClick={() => onSelectSlot(slot.startsAtIso, slot.groupKey)}
                      className={`flex w-full items-center justify-between rounded-lg px-3 py-2.5 text-left text-sm tabular-nums ${slotClasses(
                        { kind: "open", selected },
                      )}`}
                      aria-pressed={selected}
                    >
                      <span className="font-semibold">{slotTime(slot.startsAtIso)}</span>
                      <span className="truncate pl-3 text-xs text-muted">{slot.label}</span>
                    </button>
                  );
                })}
              </div>
            )}
            {dayViewExtra ? (
              <div className="mt-3">{dayViewExtra({ dayKey: anchorDayKey })}</div>
            ) : null}
          </>
        ))}

      {calendarView === "week" &&
        (weekViewReplacement ?? (
          <CalendarWeekColumns
            days={weekDays}
            dayAction={
              onAddForDayKey && weekColumnAddLabel
                ? (day) => (
                    <button
                      type="button"
                      onClick={() => onAddForDayKey(day.dayKey)}
                      className="shrink-0 rounded-md border border-border px-1.5 py-0.5 text-[10px] font-semibold text-foreground hover:bg-[var(--app-hover)]"
                    >
                      {weekColumnAddLabel}
                    </button>
                  )
                : undefined
            }
            renderDay={(day) => {
              const daySlots = slotMap.get(day.dayKey) ?? [];
              if (daySlots.length === 0) {
                return <CalendarEmpty size="cell">{copy.unavailableShort}</CalendarEmpty>;
              }
              return (
                <>
                  {daySlots.slice(0, 5).map((slot, idx) => {
                    if (slot.kind === "booked") {
                      return (
                        <div
                          key={`reserved:${slot.startsAtIso}:${idx}`}
                          data-testid="slot-reserved-week"
                          aria-disabled="true"
                          className={`w-full rounded-md px-2 py-1 text-xs tabular-nums ${slotClasses({
                            kind: "booked",
                          })}`}
                        >
                          <span className="block whitespace-nowrap font-semibold">
                            {slotTime(slot.startsAtIso)}
                          </span>
                          <span className="block truncate text-[10px]">{slot.label}</span>
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
                        className={`w-full rounded-md px-2 py-1 text-xs tabular-nums ${slotClasses({
                          kind: "open",
                          selected,
                        })}`}
                        aria-pressed={selected}
                      >
                        <span className="whitespace-nowrap font-semibold">
                          {slotTime(slot.startsAtIso)}
                        </span>
                      </button>
                    );
                  })}
                  {daySlots.length > 5 ? (
                    <p className="text-center text-[10px] text-muted">+{daySlots.length - 5}</p>
                  ) : null}
                </>
              );
            }}
          />
        ))}

      {calendarView === "month" &&
        (monthViewReplacement ?? (
          <CalendarMonthGrid
            testId="slot-calendar-month-grid"
            cells={monthCells}
            weekdayHeaders={monthWeekdayHeaders}
            isSelected={(cell) => monthCellSelectedDayKey === cell.dayKey}
            isQuiet={(cell) => !(slotMap.get(cell.dayKey) ?? []).some((s) => s.kind !== "booked")}
            onDayClick={(cell) => {
              if (onMonthDayClick) {
                onMonthDayClick(cell.dayKey);
                return;
              }
              onCalendarAnchorChange(dayKeyToIsoAtNoon(cell.dayKey, timeZone));
              onCalendarViewChange("day");
            }}
            dayAction={
              onAddForDayKey && weekColumnAddLabel
                ? (cell) =>
                    cell.inCurrentMonth ? (
                      <button
                        type="button"
                        data-month-day-add={cell.dayKey}
                        title={weekColumnAddLabel}
                        onClick={(e) => {
                          e.stopPropagation();
                          onAddForDayKey(cell.dayKey);
                        }}
                        className="shrink-0 rounded border border-border px-1 py-0.5 text-[9px] font-semibold text-foreground hover:bg-[var(--app-hover)]"
                      >
                        {weekColumnAddLabel}
                      </button>
                    ) : null
                : undefined
            }
            renderCell={(cell) => {
              const raw = slotMap.get(cell.dayKey) ?? [];
              const sorted = [...raw].sort((a, b) => a.startsAtIso.localeCompare(b.startsAtIso));
              const chips = pickMonthDayChips(sorted, MAX_MONTH_CHIPS);
              const more = sorted.length - chips.length;
              return (
                <>
                  {chips.map((slot, idx) => {
                    const range = formatMonthChipTimeRange(
                      locale,
                      slot.startsAtIso,
                      slot.endsAtIso,
                      timeZone,
                    );
                    if (slot.kind === "booked") {
                      return (
                        <div
                          key={`reserved:${slot.startsAtIso}:${idx}`}
                          data-testid="slot-reserved-month"
                          role="status"
                          aria-label={`${slot.label}: ${range}`}
                          className={`w-full truncate rounded px-1 py-0.5 text-left text-[9px] font-semibold leading-tight tabular-nums ${slotClasses(
                            { kind: "booked" },
                          )}`}
                        >
                          <span>{range}</span>
                          <span className="mt-0.5 block truncate">{slot.label}</span>
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
                        className={`w-full truncate rounded px-1 py-0.5 text-left text-[9px] font-semibold leading-tight tabular-nums ${slotClasses(
                          { kind: "open", selected },
                        )}`}
                        aria-pressed={selected}
                      >
                        {range}
                      </button>
                    );
                  })}
                  {more > 0 ? (
                    <p className="px-0.5 text-[9px] font-medium text-muted">+{more} more</p>
                  ) : null}
                </>
              );
            }}
          />
        ))}
    </CalendarFrame>
  );
}
