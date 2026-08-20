"use client";

import type { ReactNode } from "react";
import type { CalendarViewMode } from "@/lib/calendar-view";
import type { CalendarDay, CalendarMonthCell } from "@/lib/slot-calendar";
import { buttonClasses } from "@/components/ui/button";
import { tabClasses } from "@/components/ui/sub-nav";

/**
 * The calendar scaffolding, once.
 *
 * Four surfaces show a day/week/month calendar — the student's schedule, the
 * teacher's schedule, the booking slot picker, the teacher availability editor,
 * and the org school schedule. The slot picker's scaffolding was already shared
 * by three of them; the dashboard schedule calendar had a second, hand-built
 * copy of the same day list, seven-column week and forty-two-cell month, which
 * is why a student's schedule and a teacher's schedule had drifted into looking
 * like different products.
 *
 * What is genuinely shared is the *frame*: the period label, the view switcher,
 * the column and cell geometry, the empty rules. What is genuinely different is
 * what sits in a cell — a bookable slot is a button, a booked lesson is a link
 * to its row. So the frame owns structure and the caller renders its own items.
 *
 * Structure here is rules and space, per DESIGN.md §4: no box per day, no box
 * per calendar. A month is a table of dates, so it keeps its hairline grid —
 * that grid *is* the rule system, not a stack of cards.
 */

export type CalendarFrameCopy = {
  calendarDay: string;
  calendarWeek: string;
  calendarMonth: string;
  previous: string;
  next: string;
};

export function CalendarFrame({
  label,
  view,
  onViewChange,
  onPrevious,
  onNext,
  copy,
  viewsLabel,
  children,
}: {
  /** The period on screen — the calendar's focal line. */
  label: string;
  view: CalendarViewMode;
  onViewChange: (view: CalendarViewMode) => void;
  onPrevious: () => void;
  onNext: () => void;
  copy: CalendarFrameCopy;
  /** Accessible name for the view switcher group. */
  viewsLabel?: string;
  children: ReactNode;
}) {
  const views = [
    { id: "day", label: copy.calendarDay },
    { id: "week", label: copy.calendarWeek },
    { id: "month", label: copy.calendarMonth },
  ] as const;

  return (
    <div className="min-w-0">
      <div className="flex flex-wrap items-center justify-between gap-x-6 gap-y-2">
        {/* The period carries the weight here — it is the one thing you check
            before anything else on the grid. */}
        <p className="min-w-0 text-xl font-black tracking-[-0.03em] tabular-nums text-foreground sm:text-2xl">
          {label}
        </p>
        <div className="flex shrink-0 items-center gap-2">
          <button
            type="button"
            onClick={onPrevious}
            className={buttonClasses({ variant: "secondary", size: "sm" })}
          >
            {copy.previous}
          </button>
          <button
            type="button"
            onClick={onNext}
            className={buttonClasses({ variant: "secondary", size: "sm" })}
          >
            {copy.next}
          </button>
        </div>
      </div>

      {/* Same ruled tab vocabulary as every sub-nav in the app, so switching a
          calendar view reads like switching a section — not like a segmented
          control borrowed from somewhere else. */}
      <div className="mt-3 mb-6 w-full min-w-0 border-b border-border">
        <div role="group" aria-label={viewsLabel} className="flex gap-6">
          {views.map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => onViewChange(item.id)}
              aria-pressed={view === item.id}
              className={tabClasses(view === item.id)}
            >
              {item.label}
            </button>
          ))}
        </div>
      </div>

      {children}
    </div>
  );
}

/**
 * The seven-day week. Columns are separated by rules once there is room for
 * seven of them; below that they stack and the rule would only add noise.
 */
export function CalendarWeekColumns({
  days,
  renderDay,
  dayAction,
}: {
  days: CalendarDay[];
  renderDay: (day: CalendarDay) => ReactNode;
  /** Trailing control on a day's header, e.g. "add availability". */
  dayAction?: (day: CalendarDay) => ReactNode;
}) {
  return (
    <div className="grid grid-cols-2 gap-x-4 gap-y-6 sm:grid-cols-4 md:grid-cols-7 md:gap-x-0">
      {days.map((day, index) => (
        <div
          key={day.dayKey}
          className={`min-w-0 ${index > 0 ? "md:border-l md:border-border md:pl-3" : ""} ${
            index < days.length - 1 ? "md:pr-3" : ""
          }`}
        >
          <div className="mb-3 flex items-baseline justify-between gap-1 border-b border-border pb-2">
            <p className="min-w-0 truncate text-xs font-semibold text-muted">
              {day.shortLabel}{" "}
              <span className="text-sm font-black tabular-nums text-foreground">
                {Number(day.dayKey.slice(-2))}
              </span>
            </p>
            {dayAction ? dayAction(day) : null}
          </div>
          <div className="space-y-1.5">{renderDay(day)}</div>
        </div>
      ))}
    </div>
  );
}

/**
 * The month grid. `renderCell` fills a day; the frame owns the geometry, the
 * date button, and which days read as outside the month.
 */
export function CalendarMonthGrid({
  cells,
  weekdayHeaders,
  onDayClick,
  renderCell,
  isSelected,
  isQuiet,
  dayAction,
  testId,
}: {
  cells: CalendarMonthCell[];
  weekdayHeaders: string[];
  onDayClick: (cell: CalendarMonthCell) => void;
  renderCell: (cell: CalendarMonthCell) => ReactNode;
  /** Ringed: the day being acted on. */
  isSelected?: (cell: CalendarMonthCell) => boolean;
  /** In the month but with nothing to offer — present, not emphasised. */
  isQuiet?: (cell: CalendarMonthCell) => boolean;
  dayAction?: (cell: CalendarMonthCell) => ReactNode;
  testId?: string;
}) {
  return (
    <div className="overflow-x-auto pb-1" data-testid={testId}>
      <div className="min-w-[720px]">
        <div className="grid grid-cols-7 border-b border-border">
          {weekdayHeaders.map((day, index) => (
            <p
              key={`${day}-${index}`}
              className="py-2 text-center text-xs font-semibold text-muted"
            >
              {day}
            </p>
          ))}
        </div>
        <div className="grid grid-cols-7 border-l border-border">
          {cells.map((cell) => {
            const outside = !cell.inCurrentMonth;
            const selected = isSelected?.(cell) ?? false;
            const quiet = !outside && (isQuiet?.(cell) ?? false);
            return (
              <div
                key={cell.dayKey}
                data-month-day-cell={cell.dayKey}
                className={[
                  "flex min-h-[104px] min-w-0 flex-col border-b border-r border-border p-1.5 text-left text-xs",
                  selected ? "ring-1 ring-inset ring-foreground" : "",
                  outside ? "opacity-40" : "",
                ]
                  .filter(Boolean)
                  .join(" ")}
              >
                <div className="flex items-start justify-between gap-0.5">
                  <button
                    type="button"
                    data-day-key={cell.dayKey}
                    onClick={() => onDayClick(cell)}
                    className={`min-w-0 rounded px-1 py-0.5 text-sm font-black tabular-nums transition-colors hover:bg-[var(--app-hover)] ${
                      quiet ? "text-muted" : "text-foreground"
                    }`}
                  >
                    {cell.shortLabel}
                  </button>
                  {dayAction ? dayAction(cell) : null}
                </div>
                <div className="mt-1 flex min-h-0 flex-1 flex-col gap-1">{renderCell(cell)}</div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

/**
 * The one way a calendar says "nothing here".
 *
 * `block` spans a day or agenda view; `cell` sits inside a week column, where a
 * full rule would out-weigh the slots beside it.
 */
export function CalendarEmpty({
  size = "block",
  children,
}: {
  size?: "block" | "cell";
  children: ReactNode;
}) {
  if (size === "cell") {
    return <p className="py-1 text-center text-[11px] leading-4 text-muted">{children}</p>;
  }
  return <p className="border-y border-border py-8 text-center text-sm text-muted">{children}</p>;
}
