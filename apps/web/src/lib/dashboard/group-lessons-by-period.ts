/**
 * Break one counterpart's lessons into years, and each year into months.
 *
 * A full-time student accumulates hundreds of lessons, and a single flat run
 * under their name is unscannable however it is sorted. Year and month are the
 * units people actually navigate a teaching history by.
 *
 * Bucketing uses the same zone the rows are *rendered* in — the history screen
 * omits `timeZone` so lessons show in the viewer's local zone, and a lesson
 * displayed as "Aug 1" filed under July would look like a bug. Pass a zone
 * explicitly for deterministic server output, exactly as
 * `formatLessonInstant` does.
 *
 * Like `groupConsecutive`, this groups *runs* and never re-sorts: the caller
 * has already decided the order.
 */

export type LessonMonthGroup<T> = {
  /** Locale-independent and unique within the list; not for display. */
  key: string;
  /** e.g. "August 2026". */
  label: string;
  items: T[];
};

export type LessonYearGroup<T> = {
  /** Locale-independent and unique within the list; not for display. */
  key: string;
  label: string;
  /** Every lesson in the year, across its months. */
  count: number;
  months: LessonMonthGroup<T>[];
};

/** Year and zero-padded month in the target zone, independent of locale. */
function periodPartsOf(iso: string, timeZone?: string) {
  const parts = new Intl.DateTimeFormat("en-US", {
    ...(timeZone ? { timeZone } : {}),
    year: "numeric",
    month: "2-digit",
  }).formatToParts(new Date(iso));

  const year = parts.find((p) => p.type === "year")?.value ?? "";
  const month = parts.find((p) => p.type === "month")?.value ?? "";
  return { year, month };
}

export function groupLessonsByYearAndMonth<T>(
  items: T[],
  instantOf: (item: T) => string,
  locale: string,
  timeZone?: string,
): LessonYearGroup<T>[] {
  const monthLabel = new Intl.DateTimeFormat(locale, {
    ...(timeZone ? { timeZone } : {}),
    year: "numeric",
    month: "long",
  });

  const years: LessonYearGroup<T>[] = [];
  // The period a run belongs to is tracked alongside the group rather than
  // encoded into its key: the same month can head two separate runs, and two
  // groups sharing a key collide in React.
  let openYear: { period: string; group: LessonYearGroup<T> } | null = null;
  let openMonth: { period: string; group: LessonMonthGroup<T> } | null = null;
  let runs = 0;

  for (const item of items) {
    const iso = instantOf(item);
    const { year, month } = periodPartsOf(iso, timeZone);
    const monthPeriod = `${year}-${month}`;

    if (!openYear || openYear.period !== year) {
      runs += 1;
      const group: LessonYearGroup<T> = {
        key: `${year}#${runs}`,
        label: year,
        count: 0,
        months: [],
      };
      years.push(group);
      openYear = { period: year, group };
      openMonth = null;
    }
    openYear.group.count += 1;

    if (openMonth && openMonth.period === monthPeriod) {
      openMonth.group.items.push(item);
      continue;
    }
    runs += 1;
    const group: LessonMonthGroup<T> = {
      key: `${monthPeriod}#${runs}`,
      label: monthLabel.format(new Date(iso)),
      items: [item],
    };
    openYear.group.months.push(group);
    openMonth = { period: monthPeriod, group };
  }

  return years;
}
