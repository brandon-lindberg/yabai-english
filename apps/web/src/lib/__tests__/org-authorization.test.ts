import { describe, it, expect } from "vitest";
import {
  isOrgWideRole,
  isOrgWideAdmin,
  isSchoolAdmin,
  canManageSchedule,
  canManageMembers,
  canRequestTimeOff,
  canSelfEnroll,
  meetsMinimumRole,
  ORG_ROLE_HIERARCHY,
} from "../org-authorization";
import type { OrgRole, OrgMemberStatus } from "@/generated/prisma/client";

// Helper to build membership objects for testing
function membership(
  orgRole: OrgRole,
  opts: {
    schoolId?: string | null;
    status?: OrgMemberStatus;
    organizationId?: string;
  } = {},
) {
  return {
    id: "mem-1",
    organizationId: opts.organizationId ?? "org-1",
    userId: "user-1",
    schoolId: opts.schoolId ?? null,
    orgRole,
    status: (opts.status ?? "ACTIVE") as OrgMemberStatus,
  };
}

function school(opts: { selfEnrollmentEnabled?: boolean } = {}) {
  return {
    id: "school-1",
    selfEnrollmentEnabled: opts.selfEnrollmentEnabled ?? false,
  };
}

describe("org-authorization", () => {
  describe("ORG_ROLE_HIERARCHY", () => {
    it("ranks OWNER highest", () => {
      expect(ORG_ROLE_HIERARCHY.OWNER).toBeGreaterThan(
        ORG_ROLE_HIERARCHY.ORG_ADMIN,
      );
      expect(ORG_ROLE_HIERARCHY.OWNER).toBeGreaterThan(
        ORG_ROLE_HIERARCHY.SCHOOL_ADMIN,
      );
    });

    it("ranks ORG_ADMIN above SCHOOL_ADMIN", () => {
      expect(ORG_ROLE_HIERARCHY.ORG_ADMIN).toBeGreaterThan(
        ORG_ROLE_HIERARCHY.SCHOOL_ADMIN,
      );
    });

    it("ranks SCHOOL_ADMIN above TEACHER", () => {
      expect(ORG_ROLE_HIERARCHY.SCHOOL_ADMIN).toBeGreaterThan(
        ORG_ROLE_HIERARCHY.TEACHER,
      );
    });

    it("ranks TEACHER above STUDENT", () => {
      expect(ORG_ROLE_HIERARCHY.TEACHER).toBeGreaterThan(
        ORG_ROLE_HIERARCHY.STUDENT,
      );
    });
  });

  describe("isOrgWideRole", () => {
    it("returns true for OWNER", () => {
      expect(isOrgWideRole("OWNER")).toBe(true);
    });

    it("returns true for ORG_ADMIN", () => {
      expect(isOrgWideRole("ORG_ADMIN")).toBe(true);
    });

    it("returns false for school-scoped roles", () => {
      expect(isOrgWideRole("SCHOOL_ADMIN")).toBe(false);
      expect(isOrgWideRole("TEACHER")).toBe(false);
      expect(isOrgWideRole("STUDENT")).toBe(false);
    });
  });

  describe("isOrgWideAdmin", () => {
    it("returns true for OWNER membership", () => {
      expect(isOrgWideAdmin(membership("OWNER"))).toBe(true);
    });

    it("returns true for ORG_ADMIN membership", () => {
      expect(isOrgWideAdmin(membership("ORG_ADMIN"))).toBe(true);
    });

    it("returns false for SCHOOL_ADMIN", () => {
      expect(
        isOrgWideAdmin(membership("SCHOOL_ADMIN", { schoolId: "s1" })),
      ).toBe(false);
    });

    it("returns false for TEACHER", () => {
      expect(isOrgWideAdmin(membership("TEACHER", { schoolId: "s1" }))).toBe(
        false,
      );
    });

    it("returns false for inactive membership even if OWNER", () => {
      expect(isOrgWideAdmin(membership("OWNER", { status: "INACTIVE" }))).toBe(
        false,
      );
    });
  });

  describe("isSchoolAdmin", () => {
    it("returns true for SCHOOL_ADMIN at the school", () => {
      expect(
        isSchoolAdmin(membership("SCHOOL_ADMIN", { schoolId: "s1" }), "s1"),
      ).toBe(true);
    });

    it("returns true for OWNER (org-wide access)", () => {
      expect(isSchoolAdmin(membership("OWNER"), "s1")).toBe(true);
    });

    it("returns true for ORG_ADMIN (org-wide access)", () => {
      expect(isSchoolAdmin(membership("ORG_ADMIN"), "s1")).toBe(true);
    });

    it("returns false for SCHOOL_ADMIN at a different school", () => {
      expect(
        isSchoolAdmin(
          membership("SCHOOL_ADMIN", { schoolId: "s2" }),
          "s1",
        ),
      ).toBe(false);
    });

    it("returns false for TEACHER at the school", () => {
      expect(
        isSchoolAdmin(membership("TEACHER", { schoolId: "s1" }), "s1"),
      ).toBe(false);
    });
  });

  describe("canManageSchedule", () => {
    it("allows SCHOOL_ADMIN for their school", () => {
      expect(
        canManageSchedule(
          membership("SCHOOL_ADMIN", { schoolId: "s1" }),
          "s1",
        ),
      ).toBe(true);
    });

    it("allows org-wide admin for any school", () => {
      expect(canManageSchedule(membership("OWNER"), "s1")).toBe(true);
      expect(canManageSchedule(membership("ORG_ADMIN"), "s1")).toBe(true);
    });

    it("denies TEACHER", () => {
      expect(
        canManageSchedule(membership("TEACHER", { schoolId: "s1" }), "s1"),
      ).toBe(false);
    });

    it("denies STUDENT", () => {
      expect(
        canManageSchedule(membership("STUDENT", { schoolId: "s1" }), "s1"),
      ).toBe(false);
    });
  });

  describe("canManageMembers", () => {
    it("allows SCHOOL_ADMIN for their school", () => {
      expect(
        canManageMembers(
          membership("SCHOOL_ADMIN", { schoolId: "s1" }),
          "s1",
        ),
      ).toBe(true);
    });

    it("allows org-wide admin for any school", () => {
      expect(canManageMembers(membership("OWNER"), "s1")).toBe(true);
    });

    it("denies TEACHER", () => {
      expect(
        canManageMembers(membership("TEACHER", { schoolId: "s1" }), "s1"),
      ).toBe(false);
    });
  });

  describe("canRequestTimeOff", () => {
    it("allows TEACHER", () => {
      expect(
        canRequestTimeOff(membership("TEACHER", { schoolId: "s1" })),
      ).toBe(true);
    });

    it("denies STUDENT", () => {
      expect(
        canRequestTimeOff(membership("STUDENT", { schoolId: "s1" })),
      ).toBe(false);
    });

    it("denies SCHOOL_ADMIN", () => {
      expect(
        canRequestTimeOff(membership("SCHOOL_ADMIN", { schoolId: "s1" })),
      ).toBe(false);
    });

    it("denies inactive teacher", () => {
      expect(
        canRequestTimeOff(
          membership("TEACHER", { schoolId: "s1", status: "INACTIVE" }),
        ),
      ).toBe(false);
    });
  });

  describe("canSelfEnroll", () => {
    it("allows STUDENT when school has self-enrollment enabled", () => {
      expect(
        canSelfEnroll(
          membership("STUDENT", { schoolId: "s1" }),
          school({ selfEnrollmentEnabled: true }),
        ),
      ).toBe(true);
    });

    it("denies STUDENT when self-enrollment disabled", () => {
      expect(
        canSelfEnroll(
          membership("STUDENT", { schoolId: "s1" }),
          school({ selfEnrollmentEnabled: false }),
        ),
      ).toBe(false);
    });

    it("denies TEACHER even with self-enrollment enabled", () => {
      expect(
        canSelfEnroll(
          membership("TEACHER", { schoolId: "s1" }),
          school({ selfEnrollmentEnabled: true }),
        ),
      ).toBe(false);
    });

    it("denies inactive student", () => {
      expect(
        canSelfEnroll(
          membership("STUDENT", { schoolId: "s1", status: "INACTIVE" }),
          school({ selfEnrollmentEnabled: true }),
        ),
      ).toBe(false);
    });
  });

  describe("meetsMinimumRole", () => {
    it("OWNER meets any minimum", () => {
      expect(meetsMinimumRole("OWNER", "STUDENT")).toBe(true);
      expect(meetsMinimumRole("OWNER", "OWNER")).toBe(true);
    });

    it("STUDENT meets STUDENT minimum", () => {
      expect(meetsMinimumRole("STUDENT", "STUDENT")).toBe(true);
    });

    it("STUDENT does not meet TEACHER minimum", () => {
      expect(meetsMinimumRole("STUDENT", "TEACHER")).toBe(false);
    });

    it("SCHOOL_ADMIN meets TEACHER minimum", () => {
      expect(meetsMinimumRole("SCHOOL_ADMIN", "TEACHER")).toBe(true);
    });

    it("TEACHER does not meet SCHOOL_ADMIN minimum", () => {
      expect(meetsMinimumRole("TEACHER", "SCHOOL_ADMIN")).toBe(false);
    });
  });
});
