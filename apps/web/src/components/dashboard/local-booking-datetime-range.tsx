"use client";

import { useEffect, useState } from "react";
import { formatLessonInstant } from "@/lib/format-lesson-datetime";

type Props = {
  locale: string;
  startsAtIso: string;
  endsAtIso: string;
  className?: string;
  /** Default matches long dash used elsewhere in dashboard copy. */
  separator?: string;
  /**
   * When set, formatting is identical on server and client (IANA zone).
   * When omitted, the range is formatted in the viewer’s **browser** local zone after mount
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
  const start = formatLessonInstant(startsAtIso, locale, timeZone);
  const end = formatLessonInstant(endsAtIso, locale, timeZone);
  return `${start}${separator}${end}`;
}

/**
 * Renders booking start/end in the viewer’s local timezone when `timeZone` is omitted
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
  const [text, setText] = useState<string | null>(() =>
    timeZone ? buildRange(locale, startsAtIso, endsAtIso, separator, timeZone) : null,
  );

  useEffect(() => {
    if (timeZone) {
      setText(buildRange(locale, startsAtIso, endsAtIso, separator, timeZone));
      return;
    }
    setText(buildRange(locale, startsAtIso, endsAtIso, separator, undefined));
  }, [locale, startsAtIso, endsAtIso, separator, timeZone]);

  if (!text) {
    return (
      <span className={className} aria-busy="true">
        …
      </span>
    );
  }

  return <span className={className}>{text}</span>;
}
