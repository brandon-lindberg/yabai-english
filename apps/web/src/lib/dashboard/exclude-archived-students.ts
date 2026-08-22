/**
 * Drop lessons belonging to students this teacher has archived.
 *
 * Applied to the *completed* history only, never to upcoming lessons. Archiving
 * is a tidying action — it says "I no longer teach this person", not "cancel my
 * obligations". A teacher who archives someone still holding a booked lesson
 * must keep seeing that lesson, or they will miss it.
 */
export function excludeArchivedStudents<T extends { studentId: string }>(
  bookings: T[],
  archivedStudentIds: ReadonlySet<string>,
): T[] {
  if (archivedStudentIds.size === 0) return bookings;
  return bookings.filter((booking) => !archivedStudentIds.has(booking.studentId));
}
