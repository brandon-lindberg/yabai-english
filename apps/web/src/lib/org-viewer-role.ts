import { cache } from "react";
import type { OrgRole } from "@/generated/prisma/client";
import { prisma } from "@/lib/prisma";
import { isOrgWideRole } from "@/lib/org-authorization";

export type ViewerSchoolRole = {
  orgRole: OrgRole;
  isOrgWide: boolean;
  /** True for OWNER, ORG_ADMIN, or SCHOOL_ADMIN of this school. */
  isSchoolAdmin: boolean;
  /** True for TEACHER assigned to this school. */
  isSchoolTeacher: boolean;
  /** True for STUDENT enrolled at this school. */
  isSchoolStudent: boolean;
};

/**
 * Resolve the viewer's effective role for a school. Returns null when the user
 * has no active membership that grants access.
 *
 * Org-wide roles (OWNER, ORG_ADMIN) cover every school in their org. School-
 * scoped roles only cover the matching school. Cached per request via React's
 * cache() so layout + page lookups dedupe.
 */
export const getViewerSchoolRole = cache(
  async (
    userId: string,
    orgId: string,
    schoolId: string,
  ): Promise<ViewerSchoolRole | null> => {
    const memberships = await prisma.organizationMembership.findMany({
      where: {
        userId,
        organizationId: orgId,
        status: "ACTIVE",
        OR: [{ schoolId: null }, { schoolId }],
      },
      select: { orgRole: true, schoolId: true },
    });

    if (memberships.length === 0) return null;

    const orgWide = memberships.find((m) => isOrgWideRole(m.orgRole));
    const scoped = memberships.find((m) => m.schoolId === schoolId);

    const effective = orgWide ?? scoped;
    if (!effective) return null;

    const orgRole = effective.orgRole;
    const isOrgWide = isOrgWideRole(orgRole);

    return {
      orgRole,
      isOrgWide,
      isSchoolAdmin: isOrgWide || orgRole === "SCHOOL_ADMIN",
      isSchoolTeacher: !isOrgWide && orgRole === "TEACHER",
      isSchoolStudent: !isOrgWide && orgRole === "STUDENT",
    };
  },
);
