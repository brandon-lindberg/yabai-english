"use client";

import { formatLessonRange } from "@/lib/format-lesson-datetime";
import { useViewerTimeZone } from "@/hooks/use-viewer-time-zone";

type Props = {
  locale: string;
  startsAtIso: string;
  endsAtIso: string;
  className?: string;
  /** Default matches long dash used elsewhere in dashboard copy. */
  separator?: string;
  /**
   * When set, formatting is identical on server and client (IANA zone).
   * When omitted, the range is formatted in the viewer's **browser** local zone after mount
   * so it matches client-side calendars and avoids server UTC drift.
   */
  timeZone?: string;
};

function buildRange(
  locale: string,
  startsAtIso: string,
  endsAtIso: string,
  separator: string,
  timeZone?: string,
) {
  return formatLessonRange(startsAtIso, endsAtIso, locale, timeZone, separator);
}

/**
 * Renders booking start/end in the viewer's local timezone when `timeZone` is omitted
 * (consistent with `DashboardScheduleCalendar`), or in a fixed IANA zone when provided.
 */
export function LocalBookingDateTimeRange({
  locale,
  startsAtIso,
  endsAtIso,
  className,
  separator = " — ",
  timeZone,
}: Props) {
  const resolvedTz = useViewerTimeZone(timeZone);

  if (!resolvedTz) {
    return (
      <span className={className} aria-busy="true">
        …
      </span>
    );
  }

  const text = buildRange(locale, startsAtIso, endsAtIso, separator, resolvedTz);
  return <span className={className}>{text}</span>;
}
