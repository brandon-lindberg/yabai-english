"use client";

import { useLayoutEffect, useRef } from "react";
import type { CalendarDay } from "@/lib/slot-calendar";
import type { PlacedTimeGridBlock } from "@/lib/time-grid-week";
import { hourGutterLabels, initialScrollTopForTimeGrid, isTimeGridBlockSelected } from "@/lib/time-grid-week";
import { SLOT_BOOKED, SLOT_FIGURE, slotClasses } from "@/components/ui/slot-state";

type Props = {
  locale: string;
  weekDays: CalendarDay[];
  blocksByDay: Map<string, PlacedTimeGridBlock[]>;
  /** Height of one hour in CSS pixels (Google Calendar–like density). */
  hourPx?: number;
  selectedStartsAtIso: string | null;
  selectedGroupKey?: string | null;
  onSelectSlot: (startsAtIso: string, groupKey?: string) => void;
  onCalendarAnchorChange: (iso: string) => void;
  weekColumnAddLabel?: string;
  onAddForDayKey?: (dayKey: string) => void;
  /** Line shown on booked blocks (e.g. “Reserved”). */
  reservedBookingLabel?: string;
  timeZone?: string;
};

export function TeacherAvailabilityTimeGridWeek({
  locale,
  weekDays,
  blocksByDay,
  hourPx = 48,
  selectedStartsAtIso,
  selectedGroupKey = null,
  onSelectSlot,
  onCalendarAnchorChange,
  weekColumnAddLabel,
  onAddForDayKey,
  reservedBookingLabel,
  timeZone,
}: Props) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const weekRangeKey = weekDays.map((d) => d.dayKey).join("|");
  const dayHeightPx = 24 * hourPx;
  const hours = hourGutterLabels(locale);
  const weekSelectedClass = slotClasses({ kind: "open", selected: true });
  const weekIdleClass = slotClasses({ kind: "open" });

  useLayoutEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    el.scrollTop = initialScrollTopForTimeGrid(hourPx, 7);
  }, [weekRangeKey, hourPx, locale]);

  return (
    <div
      ref={scrollRef}
      className="max-h-[min(70vh,1200px)] overflow-y-auto overflow-x-auto pb-1"
      data-testid="time-grid-week"
    >
      <div className="flex min-w-[640px] gap-0 rounded-lg border border-border bg-surface">
        <div className="w-10 shrink-0 border-r border-border bg-background text-right text-[10px] text-muted sm:w-14">
          {/* Matches the day-header height exactly (it previously padded 52px
              against a 44px header on mobile, so the hours sat a row low) and
              sticks so scrolling hours never ride up over the headings. */}
          <div className="sticky top-0 z-20 h-[44px] border-b border-border bg-background sm:h-[52px]" />
          <div style={{ height: dayHeightPx }} className="relative">
            {hours.map((label, i) => (
              <div
                key={`${i}-${label}`}
                className="absolute right-1 -translate-y-1/2 border-t border-transparent pt-0 text-[10px] leading-none"
                style={{ top: i * hourPx }}
              >
                {label}
              </div>
            ))}
          </div>
        </div>

        <div className="grid min-w-0 flex-1 grid-cols-7 divide-x divide-border">
          {weekDays.map((day) => {
            const dayDate = new Date(`${day.dayKey}T12:00:00`);
            const blocks = blocksByDay.get(day.dayKey) ?? [];
            return (
              <div key={day.dayKey} className="min-w-[72px] bg-surface sm:min-w-[100px]">
                {/*
                  Sticky: the grid scrolls to the working day on mount, which
                  used to carry the day headings out of view and leave seven
                  unlabelled columns. On the densest surface in the product the
                  teacher must always be able to see which column is which day.
                */}
                <div className="sticky top-0 z-20 flex h-[44px] flex-col justify-between border-b border-border bg-surface px-1 py-1 sm:h-[52px]">
                  <div className="flex items-start justify-between gap-0.5">
                    <p className="text-[10px] font-semibold leading-tight text-muted sm:text-[11px]">
                      {day.shortLabel}{" "}
                      <span className="tabular-nums text-foreground">{dayDate.getDate()}</span>
                    </p>
                    {onAddForDayKey && weekColumnAddLabel ? (
                      <button
                        type="button"
                        onClick={() => onAddForDayKey(day.dayKey)}
                        className="hidden min-h-6 min-w-6 shrink-0 items-center justify-center rounded border border-border bg-surface px-1 py-1 text-[10px] font-semibold text-foreground hover:bg-[var(--app-hover)] sm:inline-flex"
                      >
                        {weekColumnAddLabel}
                      </button>
                    ) : null}
                  </div>
                </div>

                <div
                  className="relative border-b border-border bg-surface"
                  style={{ height: dayHeightPx }}
                >
                  {Array.from({ length: 25 }, (_, i) => (
                    <div
                      key={i}
                      className="pointer-events-none absolute right-0 left-0 border-t border-border"
                      style={{ top: i * hourPx }}
                    />
                  ))}

                  {blocks.map((block) => {
                    if (block.kind === "booking") {
                      return (
                        <div
                          key={`booking-${block.startsAtIso}-${block.groupKey ?? ""}`}
                          data-testid="time-grid-booking"
                          data-starts-at={block.startsAtIso}
                          className={`absolute right-0.5 left-0.5 overflow-hidden rounded-md px-1 py-0.5 text-left text-[10px] leading-tight ${SLOT_BOOKED}`}
                          style={{
                            top: `${block.topPct}%`,
                            height: `${block.heightPct}%`,
                          }}
                        >
                          <span className="block truncate font-semibold tabular-nums">
                            {new Date(block.startsAtIso).toLocaleTimeString(locale, {
                              hour: "numeric",
                              minute: "2-digit",
                              timeZone,
                            })}
                            {" – "}
                            {new Date(block.endsAtIso).toLocaleTimeString(locale, {
                              hour: "numeric",
                              minute: "2-digit",
                              timeZone,
                            })}
                          </span>
                          {reservedBookingLabel ? (
                            <span className="block truncate text-[9px] font-medium text-muted">
                              {reservedBookingLabel}
                            </span>
                          ) : null}
                          {block.subtitle ? (
                            <span className="block truncate text-[10px] text-[var(--app-canvas)]/75">
                              {block.subtitle}
                            </span>
                          ) : null}
                        </div>
                      );
                    }
                    const selected = isTimeGridBlockSelected(block, selectedStartsAtIso, selectedGroupKey);
                    return (
                      <button
                        key={`${block.startsAtIso}-${block.groupKey ?? ""}`}
                        type="button"
                        data-testid="time-grid-block"
                        data-starts-at={block.startsAtIso}
                        onClick={() => {
                          onSelectSlot(block.startsAtIso, block.groupKey);
                          onCalendarAnchorChange(block.startsAtIso);
                        }}
                        className={`absolute right-0.5 left-0.5 overflow-hidden rounded border px-1 py-0.5 text-left text-[10px] leading-tight transition ${
                          selected ? weekSelectedClass : weekIdleClass
                        }`}
                        style={{
                          top: `${block.topPct}%`,
                          height: `${block.heightPct}%`,
                        }}
                        aria-pressed={selected}
                      >
                        <span className={`block truncate font-semibold ${SLOT_FIGURE}`}>
                          {new Date(block.startsAtIso).toLocaleTimeString(locale, {
                            hour: "numeric",
                            minute: "2-digit",
                            timeZone,
                          })}
                          {" – "}
                          {new Date(block.endsAtIso).toLocaleTimeString(locale, {
                            hour: "numeric",
                            minute: "2-digit",
                            timeZone,
                          })}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
