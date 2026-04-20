import type { OrgRole } from "@/generated/prisma/client";

/**
 * Numeric hierarchy for org roles. Higher number = more permissions.
 * OWNER > ORG_ADMIN > SCHOOL_ADMIN > TEACHER > STUDENT
 */
export const ORG_ROLE_HIERARCHY: Record<OrgRole, number> = {
  OWNER: 50,
  ORG_ADMIN: 40,
  SCHOOL_ADMIN: 30,
  TEACHER: 20,
  STUDENT: 10,
};

/** Org-wide roles that have access to all schools within the org. */
const ORG_WIDE_ROLES: Set<OrgRole> = new Set(["OWNER", "ORG_ADMIN"]);

/** Minimum membership shape needed for authorization checks. */
export interface MembershipForAuth {
  id: string;
  organizationId: string;
  userId: string;
  schoolId: string | null;
  orgRole: OrgRole;
  status: string;
}

/** Minimum school shape needed for enrollment checks. */
export interface SchoolForAuth {
  id: string;
  selfEnrollmentEnabled: boolean;
}

function isActive(m: MembershipForAuth): boolean {
  return m.status === "ACTIVE";
}

/** True if the role is org-wide (OWNER or ORG_ADMIN). */
export function isOrgWideRole(role: OrgRole): boolean {
  return ORG_WIDE_ROLES.has(role);
}

/** True if the membership is an active org-wide admin (OWNER or ORG_ADMIN). */
export function isOrgWideAdmin(m: MembershipForAuth): boolean {
  return isActive(m) && isOrgWideRole(m.orgRole);
}

/**
 * True if the membership has school-admin-or-higher access to the given school.
 * Org-wide admins (OWNER, ORG_ADMIN) can access any school.
 * SCHOOL_ADMIN can only access their assigned school.
 */
export function isSchoolAdmin(
  m: MembershipForAuth,
  schoolId: string,
): boolean {
  if (!isActive(m)) return false;
  if (isOrgWideRole(m.orgRole)) return true;
  return m.orgRole === "SCHOOL_ADMIN" && m.schoolId === schoolId;
}

/** True if the membership can manage schedules for the given school. */
export function canManageSchedule(
  m: MembershipForAuth,
  schoolId: string,
): boolean {
  return isSchoolAdmin(m, schoolId);
}

/** True if the membership can manage members for the given school. */
export function canManageMembers(
  m: MembershipForAuth,
  schoolId: string,
): boolean {
  return isSchoolAdmin(m, schoolId);
}

/** True if the membership can request time off (TEACHER only, must be active). */
export function canRequestTimeOff(m: MembershipForAuth): boolean {
  return isActive(m) && m.orgRole === "TEACHER";
}

/** True if the membership can self-enroll in classes at the given school. */
export function canSelfEnroll(
  m: MembershipForAuth,
  school: SchoolForAuth,
): boolean {
  return isActive(m) && m.orgRole === "STUDENT" && school.selfEnrollmentEnabled;
}

/** True if `role` meets or exceeds `minimumRole` in the hierarchy. */
export function meetsMinimumRole(
  role: OrgRole,
  minimumRole: OrgRole,
): boolean {
  return ORG_ROLE_HIERARCHY[role] >= ORG_ROLE_HIERARCHY[minimumRole];
}
