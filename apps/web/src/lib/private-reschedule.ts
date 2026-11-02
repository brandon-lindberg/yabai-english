/** A cancelled slot is reusable only through an explicit, unresolved private replacement request. */
export function hasPendingPrivateReschedule(booking: {
  status: string; privateRescheduleStatus?: string | null; groupLessonSessionId?: string | null;
}) {
  return booking.status === "CANCELLED" && booking.privateRescheduleStatus === "PENDING" && !booking.groupLessonSessionId;
}

export function canResolvePrivateReschedule(input: { role: string; userId: string; teacherUserId: string }) {
  return input.role === "SUPER_ADMIN" || (input.role === "TEACHER" && input.userId === input.teacherUserId);
}

export const privateRescheduleRestoredData = () => ({
  status: "CONFIRMED" as const,
  privateRescheduleStatus: "RESCHEDULED" as const,
  rescheduleResolvedAt: new Date(),
});
