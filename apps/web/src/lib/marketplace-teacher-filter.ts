import type { Prisma } from "@/generated/prisma/client";

/**
 * Where clause for marketplace teacher discovery.
 * Excludes any teacher who is an active member of any organization — those
 * teachers are reserved for org-managed scheduling and must not appear on the
 * public marketplace. Teachers who want marketplace presence must use a
 * separate account.
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

  return { user: userWhere };
}
