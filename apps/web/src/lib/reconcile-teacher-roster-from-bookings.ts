import type { PrismaClient } from "@/generated/prisma/client";
import { BookingStatus } from "@/generated/prisma/client";
import { syncTeacherRosterAfterStudentBooking } from "@/lib/sync-teacher-roster-after-student-booking";

const ROSTER_RECONCILE_STATUSES: BookingStatus[] = [
  BookingStatus.CONFIRMED,
  BookingStatus.PENDING_PAYMENT,
  BookingStatus.COMPLETED,
];

/** Prisma subset needed to read bookings and run roster sync. */
export type ReconcileRosterPrisma = Pick<PrismaClient, "booking" | "teacherRosterEntry" | "user">;

/**
 * Repairs `TeacherRosterEntry` rows from bookings (e.g. bookings created before
 * roster sync, or edge paths that skipped sync). Safe to call on each GET; work
 * is bounded by distinct teachers/students with active bookings.
 */
export async function reconcileTeacherRosterFromBookings(
  prisma: ReconcileRosterPrisma,
  scope: { studentUserId: string } | { teacherProfileId: string },
): Promise<void> {
  if ("studentUserId" in scope) {
    const rows = await prisma.booking.findMany({
      where: {
        studentId: scope.studentUserId,
        status: { in: ROSTER_RECONCILE_STATUSES },
      },
      select: { teacherId: true },
      distinct: ["teacherId"],
    });
    for (const r of rows) {
      await syncTeacherRosterAfterStudentBooking(prisma, {
        teacherId: r.teacherId,
        studentUserId: scope.studentUserId,
      });
    }
    return;
  }

  const rows = await prisma.booking.findMany({
    where: {
      teacherId: scope.teacherProfileId,
      status: { in: ROSTER_RECONCILE_STATUSES },
    },
    select: { studentId: true },
    distinct: ["studentId"],
  });
  for (const r of rows) {
    await syncTeacherRosterAfterStudentBooking(prisma, {
      teacherId: scope.teacherProfileId,
      studentUserId: r.studentId,
    });
  }
}
