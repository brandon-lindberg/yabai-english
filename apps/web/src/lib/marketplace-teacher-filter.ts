import type { Prisma } from "@/generated/prisma/client";

/**
 * Where clause for marketplace teacher discovery.
 *
 * Excludes any teacher who is an active member of any organization — those
 * teachers are reserved for org-managed scheduling and must not appear on the
 * public marketplace. Teachers who want marketplace presence must use a
 * separate account.
 *
 * A teacher who hides from the marketplace still appears to their own students,
 * so booking a next lesson starts from "Book a lesson" like anyone else instead
 * of hunting for the teacher's availability elsewhere. "Their own students" is
 * the teacher's roster — the same rule the teacher page and the booking API
 * already gate on, and every booking adds a roster row — so a teacher listed
 * here can always be booked.
 */
export function marketplaceTeacherWhere(
  viewerStudentId: string | null,
): Prisma.TeacherProfileWhereInput {
  const userWhere: Prisma.UserWhereInput = {
    organizationMemberships: { none: { status: "ACTIVE" } },
  };

  if (viewerStudentId) {
    userWhere.chatThreadsAsTeacher = {
      none: {
        studentId: viewerStudentId,
        teacherBlockedAt: { not: null },
      },
    };
  }

  if (!viewerStudentId) {
    return { marketplaceHidden: false, user: userWhere };
  }

  return {
    OR: [
      { marketplaceHidden: false },
      { rosterEntries: { some: { studentId: viewerStudentId } } },
    ],
    user: userWhere,
  };
}
