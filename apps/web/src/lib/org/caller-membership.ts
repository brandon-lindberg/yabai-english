import { prisma } from "@/lib/prisma";
import type { MembershipForAuth } from "@/lib/org-authorization";

/**
 * Who the caller is inside an organization.
 *
 * Twenty org API routes each declared their own local `getCallerMembership`.
 * They had already drifted into four spellings — the differences turned out to
 * be formatting and comments rather than logic, so nothing was mis-authorizing
 * — but this is the query that decides what a caller may do, and twenty copies
 * means the next edit only has to land in nineteen of them to open a hole.
 *
 * The two shapes below are the two that genuinely exist. Everything else was
 * `return x` versus `const m = await …; return m;`.
 */

/** Fields every authorization check in `org-authorization` needs. */
const MEMBERSHIP_FIELDS = {
  id: true,
  organizationId: true,
  userId: true,
  schoolId: true,
  orgRole: true,
  status: true,
} as const;

/** The caller's active membership anywhere in this organization. */
export async function getOrgCallerMembership(
  userId: string,
  orgId: string,
): Promise<MembershipForAuth | null> {
  return prisma.organizationMembership.findFirst({
    where: { userId, organizationId: orgId, status: "ACTIVE" },
    select: MEMBERSHIP_FIELDS,
  });
}

/**
 * The caller's active membership as it applies to one school.
 *
 * Matches an org-wide membership (`schoolId: null`) or one scoped to this
 * school. `orderBy: { orgRole: "asc" }` makes OWNER sort first, so a caller who
 * holds both an org-wide role and a school-scoped one is authorized by the
 * stronger of the two rather than by whichever row the database returned first.
 */
export async function getSchoolCallerMembership(
  userId: string,
  orgId: string,
  schoolId: string,
): Promise<MembershipForAuth | null> {
  return prisma.organizationMembership.findFirst({
    where: {
      userId,
      organizationId: orgId,
      status: "ACTIVE",
      OR: [{ schoolId: null }, { schoolId }],
    },
    select: MEMBERSHIP_FIELDS,
    orderBy: { orgRole: "asc" },
  });
}
