import { describe, expect, test } from "vitest";
import { marketplaceTeacherWhere } from "../marketplace-teacher-filter";

describe("marketplaceTeacherWhere", () => {
  test("returns base clause when no viewer", () => {
    const where = marketplaceTeacherWhere(null);
    expect(where.marketplaceHidden).toBe(false);
    expect(where.OR).toBeUndefined();
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

  test("hides marketplace opt-outs from visitors with no history", () => {
    expect(marketplaceTeacherWhere(null).marketplaceHidden).toBe(false);
  });

  test("still lists a student's own teacher after they leave the marketplace", () => {
    const where = marketplaceTeacherWhere("student-1");

    // Same roster rule the teacher page and the booking API already gate on,
    // so anything listed here can actually be booked.
    expect(where.OR).toEqual([
      { marketplaceHidden: false },
      { rosterEntries: { some: { studentId: "student-1" } } },
    ]);
    // The flat opt-out clause must be gone, or it would AND with the OR and
    // exclude the hidden teacher again.
    expect(where.marketplaceHidden).toBeUndefined();
  });
});
