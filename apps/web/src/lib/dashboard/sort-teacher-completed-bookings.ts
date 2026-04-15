/** Sort past lessons for the teacher dashboard: by student display name, then most recent first. */
export function sortTeacherCompletedBookings<
  T extends {
    startsAt: Date;
    student: { name: string | null; email: string | null };
  },
>(completed: T[]): T[] {
  return [...completed].sort((a, b) => {
    const na = (a.student.name ?? a.student.email ?? "").toLowerCase();
    const nb = (b.student.name ?? b.student.email ?? "").toLowerCase();
    if (na !== nb) return na.localeCompare(nb);
    return b.startsAt.getTime() - a.startsAt.getTime();
  });
}
