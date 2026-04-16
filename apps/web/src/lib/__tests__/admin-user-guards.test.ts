import { describe, expect, test } from "vitest";
import { Role } from "@prisma/client";
import { checkAdminCanDeleteUser } from "@/lib/admin-user-guards";

describe("checkAdminCanDeleteUser", () => {
  test("rejects self-delete", () => {
    const r = checkAdminCanDeleteUser({
      actorUserId: "a",
      targetUserId: "a",
      targetRole: Role.STUDENT,
      adminUserCount: 5,
    });
    expect(r.ok).toBe(false);
    if (!r.ok) {
      expect(r.status).toBe(400);
    }
  });

  test("rejects deleting last admin", () => {
    const r = checkAdminCanDeleteUser({
      actorUserId: "other",
      targetUserId: "admin1",
      targetRole: Role.ADMIN,
      adminUserCount: 1,
    });
    expect(r.ok).toBe(false);
    if (!r.ok) {
      expect(r.status).toBe(403);
    }
  });

  test("allows deleting an admin when another admin exists", () => {
    const r = checkAdminCanDeleteUser({
      actorUserId: "a",
      targetUserId: "b",
      targetRole: Role.ADMIN,
      adminUserCount: 2,
    });
    expect(r.ok).toBe(true);
  });

  test("allows deleting non-admin", () => {
    const r = checkAdminCanDeleteUser({
      actorUserId: "a",
      targetUserId: "b",
      targetRole: Role.STUDENT,
      adminUserCount: 1,
    });
    expect(r.ok).toBe(true);
  });
});
