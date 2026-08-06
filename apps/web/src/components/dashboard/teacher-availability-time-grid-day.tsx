"use client";

import type { ReactNode } from "react";
import { useLayoutEffect, useRef } from "react";
import type { PlacedTimeGridBlock } from "@/lib/time-grid-week";
import {
  hourGutterLabels,
  initialScrollTopForTimeGrid,
  isTimeGridBlockSelected,
} from "@/lib/time-grid-week";
import { SLOT_BOOKED, SLOT_FIGURE, slotClasses } from "@/components/ui/slot-state";

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
  footer?: ReactNode;
  emptyLabel: string;
  /** Line shown on booked blocks (e.g. “Reserved”). */
  reservedBookingLabel?: string;
  timeZone?: string;
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
  footer,
  emptyLabel,
  reservedBookingLabel,
  timeZone,
}: Props) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const dayHeightPx = 24 * hourPx;
  const hours = hourGutterLabels(locale);
  const weekSelectedClass = slotClasses({ kind: "open", selected: true });
  const weekIdleClass = slotClasses({ kind: "open" });

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
        <div className="flex min-w-[280px] gap-0 rounded-lg border border-border bg-surface">
          <div className="w-14 shrink-0 border-r border-border bg-surface text-right text-[10px] text-muted">
            <div className="sticky top-0 z-20 h-[52px] border-b border-border bg-surface" />
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

          <div className="min-w-0 flex-1 bg-surface">
            <div className="sticky top-0 z-20 flex h-[52px] items-center justify-between border-b border-border bg-surface px-2 py-1">
              <p className="text-sm font-semibold text-foreground">{dayHeading}</p>
              {onAddForDayKey && weekColumnAddLabel ? (
                <button
                  type="button"
                  onClick={() => onAddForDayKey(dayKey)}
                  className="inline-flex min-h-6 shrink-0 items-center rounded-md border border-border bg-surface px-2 py-1 text-[11px] font-semibold text-foreground hover:bg-[var(--app-hover)]"
                >
                  {weekColumnAddLabel}
                </button>
              ) : null}
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

              {blocks.length === 0 ? (
                <p className="absolute inset-x-2 top-1/3 rounded-md border border-dashed border-border bg-surface/90 px-2 py-4 text-center text-xs text-muted">
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
                      className={`absolute right-1 left-1 overflow-hidden rounded-md px-1.5 py-1 text-left text-xs leading-tight ${SLOT_BOOKED}`}
                      style={{
                        top: `${block.topPct}%`,
                        height: `${block.heightPct}%`,
                      }}
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
                      {/* Secondary text sits on solid ink, so it tints from the
                          canvas rather than using the page's muted grey. */}
                      {reservedBookingLabel ? (
                        <span className="block truncate text-[10px] font-medium text-[var(--app-canvas)]/75">
                          {reservedBookingLabel}
                        </span>
                      ) : null}
                      {block.subtitle ? (
                        <span className="block truncate text-[11px] text-[var(--app-canvas)]/75">
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
                    className={`absolute right-1 left-1 overflow-hidden rounded border px-1.5 py-1 text-left text-xs leading-tight transition ${
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
        </div>
      </div>
      {footer ? <div className="mt-3 shrink-0">{footer}</div> : null}
    </div>
  );
}
