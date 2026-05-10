import { describe, expect, test, vi } from "vitest";
import {
  claimTeacherRosterInvites,
  normalizeRosterInviteEmail,
} from "../claim-teacher-roster-invites";

describe("normalizeRosterInviteEmail", () => {
  test("trims and lowercases", () => {
    expect(normalizeRosterInviteEmail("  Foo@BAR.com ")).toBe("foo@bar.com");
  });
});

describe("claimTeacherRosterInvites", () => {
  test("returns 0 when email missing", async () => {
    const prisma = {
      teacherRosterEntry: { updateMany: vi.fn() },
    };
    const r = await claimTeacherRosterInvites(prisma as never, {
      userId: "u1",
      email: null,
    });
    expect(r.claimed).toBe(0);
    expect(prisma.teacherRosterEntry.updateMany).not.toHaveBeenCalled();
  });

  test("updates pending rows for matching email", async () => {
    const updateMany = vi.fn().mockResolvedValue({ count: 2 });
    const prisma = { teacherRosterEntry: { updateMany } };
    const r = await claimTeacherRosterInvites(prisma as never, {
      userId: "stu-1",
      email: "Invited@Example.com",
    });
    expect(r.claimed).toBe(2);
    expect(updateMany).toHaveBeenCalledWith({
      where: {
        studentId: null,
        invitedEmail: { equals: "invited@example.com", mode: "insensitive" },
      },
      data: { studentId: "stu-1", invitedEmail: null },
    });
  });
});
