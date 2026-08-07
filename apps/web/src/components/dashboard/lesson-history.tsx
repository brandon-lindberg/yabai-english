import type { ReactNode } from "react";

/**
 * Past lessons, grouped by the person on the other side.
 *
 * The teacher's history was rebuilt to group by student — name once as a
 * heading, lessons beneath — while the student's history stayed a flat list.
 * A student with twenty lessons across three teachers got twenty
 * undifferentiated rows, and the two screens gave different answers to the
 * same question.
 *
 * Grouping is the part that is genuinely shared, so it lives here. The rows
 * are not: a teacher's row opens an editor for their own notes, a student's
 * row shows what the teacher wrote. That is `renderLesson`.
 *
 * Deliberately no hooks, so the server-rendered student history and the
 * interactive teacher history can both use it.
 */

export type LessonHistoryGroup<T> = { key: string; counterpart: string; lessons: T[] };

/**
 * Group consecutive runs, rather than collecting all lessons for a name.
 *
 * The caller has already sorted; a run is a group. Re-sorting here would
 * silently reorder a list the caller deliberately arranged, and merging
 * non-adjacent runs would move lessons out of the order they were given in.
 */
export function groupLessonsByCounterpart<T>(
  lessons: T[],
  counterpartOf: (lesson: T) => string,
  keyOf: (lesson: T) => string,
): LessonHistoryGroup<T>[] {
  const groups: LessonHistoryGroup<T>[] = [];
  for (const lesson of lessons) {
    const counterpart = counterpartOf(lesson);
    const last = groups[groups.length - 1];
    if (last && last.counterpart === counterpart) last.lessons.push(lesson);
    // Keyed by the run's first lesson, not the name: the same person can appear
    // in two separate runs, and two groups keyed by name collide.
    else groups.push({ key: keyOf(lesson), counterpart, lessons: [lesson] });
  }
  return groups;
}

export function LessonHistory<T>({
  lessons,
  counterpartOf,
  keyOf,
  countLabel,
  renderLesson,
  empty,
}: {
  lessons: T[];
  /** The other person: a teacher for students, a student for teachers. */
  counterpartOf: (lesson: T) => string;
  keyOf: (lesson: T) => string;
  countLabel: (count: number) => string;
  renderLesson: (lesson: T) => ReactNode;
  empty: ReactNode;
}) {
  if (lessons.length === 0) return <>{empty}</>;

  return (
    <div className="space-y-10">
      {groupLessonsByCounterpart(lessons, counterpartOf, keyOf).map((group) => (
        <section key={group.key}>
          <h3 className="border-b border-border pb-2 text-lg font-bold tracking-[-0.02em] text-foreground">
            {group.counterpart}{" "}
            <span className="ml-1 text-sm font-medium tabular-nums text-muted">
              {countLabel(group.lessons.length)}
            </span>
          </h3>
          <ul className="list-none p-0">{group.lessons.map(renderLesson)}</ul>
        </section>
      ))}
    </div>
  );
}
