import { describe, expect, test } from "vitest";
import { marketplaceTeacherWhere } from "../marketplace-teacher-filter";

describe("marketplaceTeacherWhere", () => {
  test("returns base clause when no viewer", () => {
    const where = marketplaceTeacherWhere(null);
    expect(where.marketplaceHidden).toBe(false);
    expect(where.user?.organizationMemberships).toEqual({
      none: { status: "ACTIVE" },
    });
  });

  test("excludes teachers with any active org membership", () => {
    const where = marketplaceTeacherWhere("student-1");
    expect(where.user?.organizationMemberships).toEqual({
      none: { status: "ACTIVE" },
    });
  });

  test("preserves blocked-thread filter for student viewers", () => {
    const where = marketplaceTeacherWhere("student-1");
    expect(where.user?.chatThreadsAsTeacher).toEqual({
      none: { studentId: "student-1", teacherBlockedAt: { not: null } },
    });
  });

  test("does not include blocked-thread filter when no viewer", () => {
    const where = marketplaceTeacherWhere(null);
    expect(where.user?.chatThreadsAsTeacher).toBeUndefined();
  });

  test("excludes teachers who opted out of marketplace listing", () => {
    expect(marketplaceTeacherWhere(null).marketplaceHidden).toBe(false);
    expect(marketplaceTeacherWhere("student-1").marketplaceHidden).toBe(false);
  });
});
