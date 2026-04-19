"use client";

import { useSyncExternalStore } from "react";
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
  const start = formatLessonInstant(startsAtIso, locale, timeZone);
  const end = formatLessonInstant(endsAtIso, locale, timeZone);
  return `${start}${separator}${end}`;
}

function subscribeNoop(onStoreChange: () => void) {
  // Browser timezone never changes during a session — nothing to subscribe to.
  void onStoreChange;
  return () => {};
}

function getBrowserTz() {
  return Intl.DateTimeFormat().resolvedOptions().timeZone;
}

function getServerTz(): string | undefined {
  return undefined;
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
  const browserTz = useSyncExternalStore(subscribeNoop, getBrowserTz, getServerTz);
  const resolvedTz = timeZone ?? browserTz;

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
