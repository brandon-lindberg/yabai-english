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
export function formatLessonRange(
  startIso: string,
  endIso: string,
  locale: string,
  timeZone?: string,
  separator = " — ",
): string {
  const zone = timeZone ? { timeZone } : {};
  const start = new Date(startIso);
  const end = new Date(endIso);

  const dayKey = new Intl.DateTimeFormat(locale, {
    ...zone,
    year: "numeric",
    month: "numeric",
    day: "numeric",
  });

  if (dayKey.format(start) !== dayKey.format(end)) {
    return `${formatLessonInstant(startIso, locale, timeZone)}${separator}${formatLessonInstant(
      endIso,
      locale,
      timeZone,
    )}`;
  }

  const date = new Intl.DateTimeFormat(locale, { ...zone, dateStyle: "medium" }).format(start);
  const time = new Intl.DateTimeFormat(locale, { ...zone, timeStyle: "short" });
  return `${date} · ${time.format(start)}${separator}${time.format(end)}`;
}
