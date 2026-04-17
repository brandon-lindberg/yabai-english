"use client";

import type { ReactNode } from "react";
import { useLayoutEffect, useRef } from "react";
import type { PlacedTimeGridBlock } from "@/lib/time-grid-week";
import {
  hourGutterLabels,
  initialScrollTopForTimeGrid,
  isTimeGridBlockSelected,
} from "@/lib/time-grid-week";

type Props = {
  locale: string;
  dayKey: string;
  /** e.g. "Wed, Jun 10" */
  dayHeading: string;
  blocks: PlacedTimeGridBlock[];
  hourPx?: number;
  selectedStartsAtIso: string | null;
  selectedGroupKey?: string | null;
  onSelectSlot: (startsAtIso: string, groupKey?: string) => void;
  onCalendarAnchorChange: (iso: string) => void;
  weekColumnAddLabel?: string;
  onAddForDayKey?: (dayKey: string) => void;
  selectionStyle?: "accent" | "neutral";
  footer?: ReactNode;
  emptyLabel: string;
};

export function TeacherAvailabilityTimeGridDay({
  locale,
  dayKey,
  dayHeading,
  blocks,
  hourPx = 48,
  selectedStartsAtIso,
  selectedGroupKey = null,
  onSelectSlot,
  onCalendarAnchorChange,
  weekColumnAddLabel,
  onAddForDayKey,
  selectionStyle = "accent",
  footer,
  emptyLabel,
}: Props) {
  const scrollRef = useRef<HTMLDivElement>(null);
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
  }, [dayKey, hourPx, locale]);

  return (
    <div className="flex max-h-[min(70vh,1200px)] flex-col" data-testid="time-grid-day">
      <div
        ref={scrollRef}
        className="min-h-0 flex-1 overflow-y-auto overflow-x-auto pb-1"
      >
        <div className="flex min-w-[280px] gap-0 rounded-lg border border-zinc-200 bg-white shadow-sm">
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

          <div className="min-w-0 flex-1 bg-white">
            <div className="flex h-[52px] items-center justify-between border-b border-zinc-200 px-2 py-1">
              <p className="text-sm font-semibold text-zinc-800">{dayHeading}</p>
              {onAddForDayKey && weekColumnAddLabel ? (
                <button
                  type="button"
                  onClick={() => onAddForDayKey(dayKey)}
                  className="shrink-0 rounded-md border border-zinc-200 bg-white px-2 py-0.5 text-[10px] font-semibold text-zinc-700 hover:bg-zinc-100"
                >
                  {weekColumnAddLabel}
                </button>
              ) : null}
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

              {blocks.length === 0 ? (
                <p className="absolute inset-x-2 top-1/3 rounded-md border border-dashed border-zinc-300 bg-white/90 px-2 py-4 text-center text-xs text-zinc-500">
                  {emptyLabel}
                </p>
              ) : null}

              {blocks.map((block) => {
                if (block.kind === "booking") {
                  return (
                    <div
                      key={`booking-${block.startsAtIso}-${block.groupKey ?? ""}`}
                      data-testid="time-grid-day-booking"
                      data-starts-at={block.startsAtIso}
                      className="absolute right-1 left-1 overflow-hidden rounded border border-amber-400 bg-amber-100 px-1.5 py-1 text-left text-xs leading-tight text-amber-900 shadow-sm"
                      style={{
                        top: `${block.topPct}%`,
                        height: `${block.heightPct}%`,
                      }}
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
                      {block.subtitle ? (
                        <span className="block truncate text-[11px] text-amber-800">
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
                    data-testid="time-grid-day-block"
                    data-starts-at={block.startsAtIso}
                    onClick={() => {
                      onSelectSlot(block.startsAtIso, block.groupKey);
                      onCalendarAnchorChange(block.startsAtIso);
                    }}
                    className={`absolute right-1 left-1 overflow-hidden rounded border px-1.5 py-1 text-left text-xs leading-tight shadow-sm transition ${
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
        </div>
      </div>
      {footer ? <div className="mt-3 shrink-0">{footer}</div> : null}
    </div>
  );
}
