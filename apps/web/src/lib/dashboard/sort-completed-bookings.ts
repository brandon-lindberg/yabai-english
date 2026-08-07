/**
 * Order past lessons for a history screen: by the other person's name, then
 * most recent first.
 *
 * This existed only for teachers, which is why only the teacher's history could
 * be grouped — the student's list arrived in date order, so consecutive-run
 * grouping would have produced a group per lesson. The sort is the same
 * question from either side, so it takes an accessor for the counterpart.
 *
 * Sorting by name and then grouping consecutive runs keeps the two decisions
 * separate: this decides the order, `groupConsecutive` trusts it.
 */
export function sortCompletedByCounterpart<T extends { startsAt: Date }>(
  completed: T[],
  counterpartOf: (booking: T) => string,
): T[] {
  return [...completed].sort((a, b) => {
    const na = counterpartOf(a).toLowerCase();
    const nb = counterpartOf(b).toLowerCase();
    if (na !== nb) return na.localeCompare(nb);
    return b.startsAt.getTime() - a.startsAt.getTime();
  });
}

/** Teacher history: grouped by student. */
export function sortTeacherCompletedBookings<
  T extends { startsAt: Date; student: { name: string | null; email: string | null } },
>(completed: T[]): T[] {
  return sortCompletedByCounterpart(completed, (b) => b.student.name ?? b.student.email ?? "");
}

/** Student history: grouped by teacher. */
export function sortStudentCompletedBookings<
  T extends {
    startsAt: Date;
    teacher: { user: { name: string | null; email: string | null } };
  },
>(completed: T[]): T[] {
  return sortCompletedByCounterpart(
    completed,
    (b) => b.teacher.user.name ?? b.teacher.user.email ?? "",
  );
}
