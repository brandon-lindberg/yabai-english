import type { Prisma } from "@/generated/prisma/client";

type AssignableSlot = { assignedStudentId: string | null };

/**
 * Who may see a slot a teacher reserved for one student.
 *
 * These lessons are private, so an assigned slot is *absent* for everyone else
 * rather than shown as taken: another student must not learn that the teacher
 * has a standing arrangement, or with whom. That is why this removes slots
 * instead of marking them.
 *
 * One rule, used by every student-facing read and by every endpoint that
 * validates a booking against availability — hiding a slot in the calendar
 * without also refusing it at the endpoint would leave the reservation
 * bookable by anyone who crafts the request.
 */
export function isAvailabilitySlotVisibleTo(
  slot: AssignableSlot,
  viewerStudentId: string | null,
): boolean {
  if (!slot.assignedStudentId) return true;
  return slot.assignedStudentId === viewerStudentId;
}

/** The subset of `slots` this viewer may see. */
export function visibleAvailabilitySlots<T extends AssignableSlot>(
  slots: readonly T[],
  viewerStudentId: string | null,
): T[] {
  return slots.filter((slot) => isAvailabilitySlotVisibleTo(slot, viewerStudentId));
}

/**
 * The same rule as a query fragment, for reads that can filter in the database
 * rather than loading slots they must then discard.
 */
export function visibleAvailabilityWhere(
  viewerStudentId: string | null,
): Prisma.AvailabilitySlotWhereInput {
  return viewerStudentId
    ? { OR: [{ assignedStudentId: null }, { assignedStudentId: viewerStudentId }] }
    : { assignedStudentId: null };
}
