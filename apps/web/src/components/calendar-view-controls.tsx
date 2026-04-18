"use client";

import type { CalendarViewMode } from "@/lib/calendar-view";

type Props = {
  view: CalendarViewMode;
  onViewChange: (view: CalendarViewMode) => void;
  onPrevious: () => void;
  onNext: () => void;
  label: string;
  dayLabel: string;
  weekLabel: string;
  monthLabel: string;
  previousLabel: string;
  nextLabel: string;
};

export function CalendarViewControls({
  view,
  onViewChange,
  onPrevious,
  onNext,
  label,
  dayLabel,
  weekLabel,
  monthLabel,
  previousLabel,
  nextLabel,
}: Props) {
  return (
    <>
      <div className="mb-3 inline-flex rounded-lg border border-border bg-surface p-1">
        {(
          [
            { id: "day", label: dayLabel },
            { id: "week", label: weekLabel },
            { id: "month", label: monthLabel },
          ] as const
        ).map((item) => (
          <button
            key={item.id}
            type="button"
            onClick={() => onViewChange(item.id)}
            className={`rounded-md px-2.5 py-1 text-xs font-semibold sm:px-3 ${
              view === item.id ? "bg-primary text-primary-foreground" : "text-muted hover:bg-[var(--app-hover)]"
            }`}
          >
            {item.label}
          </button>
        ))}
      </div>
      <div className="mb-3 grid grid-cols-[auto_1fr_auto] items-center gap-2">
        <button
          type="button"
          onClick={onPrevious}
          className="justify-self-start rounded-md border border-border bg-surface px-2.5 py-1.5 text-xs font-medium text-foreground hover:bg-[var(--app-hover)] sm:px-3"
        >
          {previousLabel}
        </button>
        <p className="text-center text-xs font-semibold text-foreground sm:text-sm">{label}</p>
        <button
          type="button"
          onClick={onNext}
          className="justify-self-end rounded-md border border-border bg-surface px-2.5 py-1.5 text-xs font-medium text-foreground hover:bg-[var(--app-hover)] sm:px-3"
        >
          {nextLabel}
        </button>
      </div>
    </>
  );
}
