import type { OrgRole } from "@/generated/prisma/client";
import { countDistinctMembers, membershipPersonKey } from "@/lib/org/member-identity";

/**
 * How many people are in an organization, or in one of its schools.
 *
 * Five surfaces asked this and five answered differently: the SUPER_ADMIN list,
 * the SUPER_ADMIN org page, the org dashboard, the school dashboard, and the
 * members API. The org said 2, the school said 1, and the members list printed
 * the same person twice — all for one person who happened to hold two grants.
 *
 * Two rules, and they were the whole disagreement:
 *
 * 1. **A member is a person, not a grant.** Org-wide OWNER plus SCHOOL_ADMIN of
 *    one school is one person and two rows. Roles are counted the same way: a
 *    teacher at two schools is one teacher.
 * 2. **A school's people include the organization's.** An org-wide grant has no
 *    `schoolId` and covers every school — that is already how
 *    `getViewerSchoolRole` decides access, so a count that excluded them
 *    disagreed with the app's own idea of who can open the page.
 */

/**
 * ACTIVE only: INVITED, INACTIVE and PENDING_APPROVAL are not members yet.
 *
 * For a nested relation `select`, use `ACTIVE_MEMBERS_FILTER` instead — the
 * parent already scopes it to the organization, and repeating `organizationId`
 * there matches nothing.
 */
export const ACTIVE_MEMBERS_FILTER = { status: "ACTIVE" as const };

export function orgMemberScope(orgId: string, schoolId?: string | null) {
  return {
    organizationId: orgId,
    status: "ACTIVE" as const,
    ...(schoolId ? { OR: [{ schoolId: null }, { schoolId }] } : {}),
  };
}

/** The columns any of these questions needs. Keep queries to this shape. */
export const ORG_MEMBER_SELECT = {
  userId: true,
  inviteEmail: true,
  orgRole: true,
  schoolId: true,
} as const;

export type OrgMemberRow = {
  userId: string | null;
  inviteEmail: string | null;
  orgRole: OrgRole;
  /** `null` means org-wide, which covers every school. */
  schoolId: string | null;
};

/**
 * The rows that count towards one school: its own, plus the organization's.
 *
 * A page listing every school wants this rather than a query each — one read of
 * the organization's memberships answers for the organization and for all of
 * its schools.
 */
export function rowsForSchool(
  rows: ReadonlyArray<OrgMemberRow>,
  schoolId: string,
): OrgMemberRow[] {
  return rows.filter((row) => row.schoolId === null || row.schoolId === schoolId);
}

export type OrgMemberCounts = {
  /** Distinct people. */
  members: number;
  /** Distinct people holding a TEACHER grant. */
  teachers: number;
  /** Distinct people holding a STUDENT grant. */
  students: number;
};

function countWithRole(rows: ReadonlyArray<OrgMemberRow>, role: OrgRole): number {
  const seen = new Set<string>();
  for (const row of rows) {
    if (row.orgRole !== role) continue;
    const key = membershipPersonKey(row);
    if (key) seen.add(key);
  }
  return seen.size;
}

export function summarizeOrgMembers(rows: ReadonlyArray<OrgMemberRow>): OrgMemberCounts {
  return {
    members: countDistinctMembers(rows),
    teachers: countWithRole(rows, "TEACHER"),
    students: countWithRole(rows, "STUDENT"),
  };
}

/** Minimal surface so this is callable from a page or a route with either client. */
type MembershipReader = {
  organizationMembership: {
    findMany: (args: {
      where: ReturnType<typeof orgMemberScope>;
      select: typeof ORG_MEMBER_SELECT;
    }) => Promise<OrgMemberRow[]>;
  };
};

/** Every active membership in the organization, once. */
export async function loadOrgMemberRows(
  db: MembershipReader,
  orgId: string,
): Promise<OrgMemberRow[]> {
  return db.organizationMembership.findMany({
    where: orgMemberScope(orgId),
    select: ORG_MEMBER_SELECT,
  });
}

export async function countOrgMembers(
  db: MembershipReader,
  orgId: string,
  schoolId?: string | null,
): Promise<OrgMemberCounts> {
  const rows = await db.organizationMembership.findMany({
    where: orgMemberScope(orgId, schoolId),
    select: ORG_MEMBER_SELECT,
  });
  return summarizeOrgMembers(rows);
}
