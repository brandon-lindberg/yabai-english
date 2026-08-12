export type OrgRole = "OWNER" | "ORG_ADMIN" | "SCHOOL_ADMIN" | "TEACHER" | "STUDENT";

export type AdminSchool = {
  id: string;
  slug: string;
  name: string;
  nameJa: string | null;
  nameEn: string | null;
  memberCount: number;
};

export type AdminMembership = {
  id: string;
  orgRole: OrgRole;
  schoolId: string | null;
  userId: string | null;
  /** Set until the invitee first signs in; with `userId`, it identifies a person. */
  inviteEmail: string | null;
  user: { id: string; name: string | null; email: string | null } | null;
};

/** The list page needs only the counts; the detail page loads the rest. */
export type AdminOrganizationSummary = {
  id: string;
  slug: string;
  name: string;
  timezone: string;
  schoolCount: number;
  memberCount: number;
};

export type AdminOrganization = AdminOrganizationSummary & {
  schools: AdminSchool[];
  memberships: AdminMembership[];
};
