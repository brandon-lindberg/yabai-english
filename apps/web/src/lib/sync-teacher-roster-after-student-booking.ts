import type { PrismaClient } from "@/generated/prisma/client";
import { normalizeRosterInviteEmail } from "@/lib/claim-teacher-roster-invites";

/** Subset of Prisma client / transaction client used for roster sync. */
export type TeacherRosterBookingDb = Pick<PrismaClient, "teacherRosterEntry" | "user">;

/**
 * Ensures the student has an active roster row for this teacher and removes a
 * matching pending email invite. Call after any successful student booking
 * (public or hidden marketplace, including checkout payment confirmation).
 */
export async function syncTeacherRosterAfterStudentBooking(
  db: TeacherRosterBookingDb,
  args: { teacherId: string; studentUserId: string },
): Promise<void> {
  const { teacherId, studentUserId } = args;

  await db.teacherRosterEntry.upsert({
    where: {
      teacherId_studentId: {
        teacherId,
        studentId: studentUserId,
      },
    },
    create: {
      teacherId,
      studentId: studentUserId,
    },
    update: {},
  });

  const studentEmail = await db.user.findUnique({
    where: { id: studentUserId },
    select: { email: true },
  });
  if (studentEmail?.email) {
    await db.teacherRosterEntry.deleteMany({
      where: {
        teacherId,
        studentId: null,
        invitedEmail: {
          equals: normalizeRosterInviteEmail(studentEmail.email),
          mode: "insensitive",
        },
      },
    });
  }
}
