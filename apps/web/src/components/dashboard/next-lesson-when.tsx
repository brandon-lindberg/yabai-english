"use client";

import { formatLessonRangeParts } from "@/lib/format-lesson-datetime";
import { useViewerTimeZone } from "@/hooks/use-viewer-time-zone";

/**
 * When the next lesson is, as the dashboard's focal moment.
 *
 * DESIGN.md §4 names "the next lesson's *time*" as the largest thing on this
 * surface. Setting the whole range there instead put a 34-character line at
 * 52px into an 848px column: it overflowed, wrapped, and left the meridiem
 * alone on a second line — while beating the page title by only 4px, so the
 * hierarchy it was meant to establish barely read.
 *
 * The time leads at display scale and cannot overflow; the date sits under it
 * as the supporting fact. Not an eyebrow — that is a small label *above* a
 * heading, and DESIGN.md §4 bans it outright.
 */
export function NextLessonWhen({
  locale,
  startsAtIso,
  endsAtIso,
  className = "",
}: {
  locale: string;
  startsAtIso: string;
  endsAtIso: string;
  className?: string;
}) {
  const timeZone = useViewerTimeZone();

  if (!timeZone) {
    return (
      <div className={className}>
        <p
          aria-busy="true"
          className="text-[clamp(2rem,6vw,3.25rem)] font-black leading-[1.05] tracking-[-0.035em] text-foreground"
        >
          …
        </p>
      </div>
    );
  }

  const { date, time } = formatLessonRangeParts(startsAtIso, endsAtIso, locale, timeZone);

  return (
    <div className={className}>
      {/* The day first: a time with no date to anchor it reads as unmoored. */}
      {date ? (
        <p className="text-base font-semibold tabular-nums text-muted">{date}</p>
      ) : null}
      <p className="text-[clamp(2rem,6vw,3.25rem)] font-black leading-[1.05] tracking-[-0.035em] tabular-nums text-foreground">
        {time}
      </p>
    </div>
  );
}
