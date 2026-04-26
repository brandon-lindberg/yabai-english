import { prisma } from "@/lib/prisma";
import { createUserNotification } from "@/lib/notifications";

/**
 * Look up every active admin who can manage a school: org-wide OWNER/ORG_ADMIN
 * for the org plus any SCHOOL_ADMIN scoped to the school. Returns deduped user
 * IDs (the same user could hold multiple memberships).
 */
export async function findSchoolAdminUserIds(
  organizationId: string,
  schoolId: string,
  excludeUserId?: string,
): Promise<string[]> {
  const memberships = await prisma.organizationMembership.findMany({
    where: {
      organizationId,
      status: "ACTIVE",
      OR: [
        { orgRole: "OWNER", schoolId: null },
        { orgRole: "ORG_ADMIN", schoolId: null },
        { orgRole: "SCHOOL_ADMIN", schoolId },
      ],
    },
    select: { userId: true },
  });

  const ids = new Set<string>();
  for (const m of memberships) {
    if (m.userId) ids.add(m.userId);
  }
  if (excludeUserId) ids.delete(excludeUserId);
  return [...ids];
}

/**
 * Fan a notification out to every school admin (org-wide + school-scoped).
 * Failures inside `createUserNotification` are surfaced — wrap in try/catch
 * at the call site if you want best-effort delivery.
 */
export async function notifySchoolAdmins(input: {
  organizationId: string;
  schoolId: string;
  excludeUserId?: string;
  titleJa: string;
  titleEn: string;
  bodyJa?: string;
  bodyEn?: string;
}): Promise<void> {
  const ids = await findSchoolAdminUserIds(
    input.organizationId,
    input.schoolId,
    input.excludeUserId,
  );

  await Promise.all(
    ids.map((userId) =>
      createUserNotification({
        userId,
        titleJa: input.titleJa,
        titleEn: input.titleEn,
        bodyJa: input.bodyJa,
        bodyEn: input.bodyEn,
      }),
    ),
  );
}
