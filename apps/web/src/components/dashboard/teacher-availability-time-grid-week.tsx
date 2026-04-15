"use client";

import { useLayoutEffect, useRef } from "react";
import type { CalendarDay } from "@/lib/slot-calendar";
import type { PlacedTimeGridBlock } from "@/lib/time-grid-week";
import { hourGutterLabels, initialScrollTopForTimeGrid, isTimeGridBlockSelected } from "@/lib/time-grid-week";

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
  selectionStyle?: "accent" | "neutral";
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
  selectionStyle = "accent",
}: Props) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const weekRangeKey = weekDays.map((d) => d.dayKey).join("|");
  const dayHeightPx = 24 * hourPx;
  const hours = hourGutterLabels(locale);
  const weekSelectedClass =
    selectionStyle === "neutral"
      ? "border-zinc-600 bg-zinc-200 text-zinc-900 shadow-sm"
      : "border-primary bg-primary text-primary-foreground shadow-sm";
  const weekIdleClass =
    selectionStyle === "neutral"
      ? "border-zinc-300 bg-white text-zinc-900 hover:bg-zinc-50"
      : "border-blue-200 bg-blue-50 text-blue-900 hover:bg-blue-100";

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
      <div className="flex min-w-[880px] gap-0 rounded-lg border border-zinc-200 bg-white shadow-sm">
        <div
          className="w-14 shrink-0 border-r border-zinc-200 bg-zinc-50 text-right text-[10px] text-zinc-500"
          style={{ paddingTop: 52 }}
        >
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

        <div className="grid min-w-0 flex-1 grid-cols-7 divide-x divide-zinc-200">
          {weekDays.map((day) => {
            const dayDate = new Date(`${day.dayKey}T12:00:00`);
            const blocks = blocksByDay.get(day.dayKey) ?? [];
            return (
              <div key={day.dayKey} className="min-w-[100px] bg-white">
                <div className="flex h-[52px] flex-col justify-between border-b border-zinc-200 px-1 py-1">
                  <div className="flex items-start justify-between gap-0.5">
                    <p className="text-[11px] font-semibold leading-tight text-zinc-600">
                      {day.shortLabel}{" "}
                      <span className="text-zinc-900">{dayDate.getDate()}</span>
                    </p>
                    {onAddForDayKey && weekColumnAddLabel ? (
                      <button
                        type="button"
                        onClick={() => onAddForDayKey(day.dayKey)}
                        className="shrink-0 rounded border border-zinc-200 bg-white px-1 py-0.5 text-[9px] font-semibold text-zinc-700 hover:bg-zinc-100"
                      >
                        {weekColumnAddLabel}
                      </button>
                    ) : null}
                  </div>
                </div>

                <div
                  className="relative border-b border-zinc-100 bg-zinc-50/40"
                  style={{ height: dayHeightPx }}
                >
                  {Array.from({ length: 25 }, (_, i) => (
                    <div
                      key={i}
                      className="pointer-events-none absolute right-0 left-0 border-t border-zinc-200/80"
                      style={{ top: i * hourPx }}
                    />
                  ))}

                  {blocks.map((block) => {
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
                        className={`absolute right-0.5 left-0.5 overflow-hidden rounded border px-1 py-0.5 text-left text-[10px] leading-tight shadow-sm transition ${
                          selected ? weekSelectedClass : weekIdleClass
                        }`}
                        style={{
                          top: `${block.topPct}%`,
                          height: `${block.heightPct}%`,
                        }}
                        aria-pressed={selected}
                      >
                        <span className="block truncate font-semibold">
                          {new Date(block.startsAtIso).toLocaleTimeString(locale, {
                            hour: "numeric",
                            minute: "2-digit",
                          })}
                          {" – "}
                          {new Date(block.endsAtIso).toLocaleTimeString(locale, {
                            hour: "numeric",
                            minute: "2-digit",
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
