/**
 * Format an instant for lesson UI. Pass `timeZone` (IANA) for deterministic server output;
 * omit `timeZone` in the browser so the viewer’s local zone is used (matches calendar chips).
 */
export function formatLessonInstant(
  iso: string,
  locale: string,
  timeZone?: string,
): string {
  return new Date(iso).toLocaleString(locale, {
    dateStyle: "medium",
    timeStyle: "short",
    ...(timeZone ? { timeZone } : {}),
  });
}

/**
 * Format a lesson's start–end as one range.
 *
 * Lessons are almost always an hour inside one day, and repeating the full date
 * at both ends ("Aug 6, 2026, 8:30 PM — Aug 6, 2026, 9:30 PM") is noise. It read
 * as merely redundant at small sizes; at the display scale the dashboard now
 * uses for the next lesson it wrapped to two lines and buried the time.
 *
 * Same-day ranges therefore state the date once. Ranges that genuinely cross
 * midnight keep both full instants, because there the second date is real
 * information.
 */
export type LessonRangeParts = {
  /** The day, stated once — null when the range crosses midnight. */
  date: string | null;
  /** The clock range, or both full instants when the range crosses midnight. */
  time: string;
};

/**
 * The range as its two pieces, so a surface can size them separately.
 *
 * The dashboard's focal moment is the lesson's *time*; the date supports it.
 * Rendering both at display scale made a 34-character line that overflowed the
 * 848px column and wrapped, orphaning the meridiem.
 */
export function formatLessonRangeParts(
  startIso: string,
  endIso: string,
  locale: string,
  timeZone?: string,
  separator = " — ",
): LessonRangeParts {
  const zone = timeZone ? { timeZone } : {};
  const start = new Date(startIso);
  const end = new Date(endIso);

  const dayKey = new Intl.DateTimeFormat(locale, {
    ...zone,
    year: "numeric",
    month: "numeric",
    day: "numeric",
  });

  // A range that crosses midnight cannot state one date, so both ends stay whole.
  if (dayKey.format(start) !== dayKey.format(end)) {
    return {
      date: null,
      time: `${formatLessonInstant(startIso, locale, timeZone)}${separator}${formatLessonInstant(
        endIso,
        locale,
        timeZone,
      )}`,
    };
  }

  const time = new Intl.DateTimeFormat(locale, { ...zone, timeStyle: "short" });
  return {
    date: new Intl.DateTimeFormat(locale, { ...zone, dateStyle: "medium" }).format(start),
    time: `${time.format(start)}${separator}${time.format(end)}`,
  };
}

export function formatLessonRange(
  startIso: string,
  endIso: string,
  locale: string,
  timeZone?: string,
  separator = " — ",
): string {
  const { date, time } = formatLessonRangeParts(startIso, endIso, locale, timeZone, separator);
  return date ? `${date} · ${time}` : time;
}
