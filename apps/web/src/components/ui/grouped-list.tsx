import type { ReactNode } from "react";

/**
 * A pre-sorted list, broken into runs under headings.
 *
 * This started as the lesson history: a teacher's past lessons grouped by
 * student, name once as a heading, lessons beneath. The student's history was a
 * flat list, so the same question got two different answers depending on who
 * asked it.
 *
 * The admin booking list then wanted the same shape for a different key — fifty
 * bookings in one undifferentiated run, grouped by the day they fall on — which
 * is what moved this out of `dashboard/` and gave the props honest names. What
 * is shared is the grouping and the heading. The rows are not: a teacher's row
 * opens a notes editor, a student's shows what the teacher wrote, an admin's
 * shows who both parties were. That is `renderItem`.
 *
 * Deliberately no hooks, so server-rendered and interactive lists can both use
 * it.
 */

export type Group<T> = { key: string; label: string; items: T[] };

/**
 * Group consecutive runs, rather than collecting every item with a given label.
 *
 * The caller has already sorted; a run is a group. Re-sorting here would
 * silently reorder a list the caller deliberately arranged, and merging
 * non-adjacent runs would move items out of the order they were given in.
 */
export function groupConsecutive<T>(
  items: T[],
  labelOf: (item: T) => string,
  keyOf: (item: T) => string,
): Group<T>[] {
  const groups: Group<T>[] = [];
  for (const item of items) {
    const label = labelOf(item);
    const last = groups[groups.length - 1];
    if (last && last.label === label) last.items.push(item);
    // Keyed by the run's first item, not the label: the same label can head two
    // separate runs, and two groups keyed by label collide.
    else groups.push({ key: keyOf(item), label, items: [item] });
  }
  return groups;
}

export function GroupedList<T>({
  items,
  labelOf,
  keyOf,
  countLabel,
  renderItem,
  empty,
}: {
  items: T[];
  /** The heading for a run — a counterpart's name, a date, whatever orders it. */
  labelOf: (item: T) => string;
  keyOf: (item: T) => string;
  countLabel: (count: number) => string;
  renderItem: (item: T) => ReactNode;
  empty: ReactNode;
}) {
  if (items.length === 0) return <>{empty}</>;

  return (
    <div className="space-y-10">
      {groupConsecutive(items, labelOf, keyOf).map((group) => (
        <section key={group.key}>
          <h3 className="border-b border-border pb-2 text-lg font-bold tracking-[-0.02em] text-foreground">
            {group.label}{" "}
            <span className="ml-1 text-sm font-medium tabular-nums text-muted">
              {countLabel(group.items.length)}
            </span>
          </h3>
          <ul className="list-none p-0">{group.items.map(renderItem)}</ul>
        </section>
      ))}
    </div>
  );
}
