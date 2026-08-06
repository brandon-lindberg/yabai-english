"use client";

import { SLOT_FIGURE } from "@/components/ui/slot-state";

/**
 * One availability block positioned on a time grid.
 *
 * The day grid and the week grid each drew this themselves — same absolute
 * positioning from `topPct`/`heightPct`, same time range, same selected class,
 * same test hooks. The only real difference is how much room there is: a week
 * column is a seventh as wide, so it insets and shrinks. That is a `density`
 * prop, not a second component.
 */
export function TimeGridSlotBlock({
  startsAtIso,
  endsAtIso,
  topPct,
  heightPct,
  selected,
  selectedClass,
  idleClass,
  density,
  testId,
  locale,
  timeZone,
  onSelect,
}: {
  startsAtIso: string;
  endsAtIso: string;
  topPct: number;
  heightPct: number;
  selected: boolean;
  selectedClass: string;
  idleClass: string;
  /** `week` columns are a seventh the width, so they inset and shrink. */
  density: "day" | "week";
  /** Each grid keeps the hook its own tests already query. */
  testId: string;
  locale: string;
  timeZone?: string;
  onSelect: () => void;
}) {
  const time = (iso: string) =>
    new Date(iso).toLocaleTimeString(locale, {
      hour: "numeric",
      minute: "2-digit",
      timeZone,
    });

  const box =
    density === "day"
      ? "right-1 left-1 px-1.5 py-1 text-xs"
      : "right-0.5 left-0.5 px-1 py-0.5 text-[10px]";

  return (
    <button
      type="button"
      data-testid={testId}
      data-starts-at={startsAtIso}
      onClick={onSelect}
      aria-pressed={selected}
      className={`absolute overflow-hidden rounded border text-left leading-tight transition ${box} ${
        selected ? selectedClass : idleClass
      }`}
      style={{ top: `${topPct}%`, height: `${heightPct}%` }}
    >
      <span className={`block truncate font-semibold ${SLOT_FIGURE}`}>
        {time(startsAtIso)} – {time(endsAtIso)}
      </span>
    </button>
  );
}
