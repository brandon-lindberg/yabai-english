/**
 * Order past lessons for a history screen: most recently seen counterpart
 * first, and within each of them, most recent lesson first.
 *
 * This existed only for teachers, which is why only the teacher's history could
 * be grouped — the student's list arrived in date order, so consecutive-run
 * grouping would have produced a group per lesson. The sort is the same
 * question from either side, so it takes an accessor for the counterpart.
 *
 * Sorting here and then grouping consecutive runs keeps the two decisions
 * separate: this decides the order, `groupConsecutive` trusts it. That is why
 * every lesson of one counterpart has to stay in a single unbroken run.
 */
export function sortCompletedByCounterpart<T extends { startsAt: Date }>(
  completed: T[],
  counterpartOf: (booking: T) => string,
): T[] {
  // Each counterpart is ranked by their own most recent lesson, so a student
  // taught yesterday leads one last seen a year ago however their names sort.
  const latestByCounterpart = new Map<string, number>();
  for (const booking of completed) {
    const key = counterpartOf(booking).toLowerCase();
    const at = booking.startsAt.getTime();
    const seen = latestByCounterpart.get(key);
    if (seen === undefined || at > seen) latestByCounterpart.set(key, at);
  }

  return [...completed].sort((a, b) => {
    const ka = counterpartOf(a).toLowerCase();
    const kb = counterpartOf(b).toLowerCase();
    if (ka !== kb) {
      const diff = (latestByCounterpart.get(kb) ?? 0) - (latestByCounterpart.get(ka) ?? 0);
      // Two counterparts last seen at the same moment would otherwise land in
      // input order, which reshuffles the page between loads.
      return diff !== 0 ? diff : ka.localeCompare(kb);
    }
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
