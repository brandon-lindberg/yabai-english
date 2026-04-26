import { describe, expect, test, vi, beforeEach } from "vitest";
import { claimPendingMemberships } from "../claim-pending-memberships";

type MembershipRow = {
  id: string;
  userId: string | null;
  inviteEmail: string | null;
  status: "INVITED" | "ACTIVE" | "INACTIVE" | "PENDING_APPROVAL";
};

function fakePrisma(initialRows: MembershipRow[]) {
  let rows = [...initialRows];
  return {
    rows: () => rows,
    organizationMembership: {
      findMany: vi.fn(async (args: { where: Record<string, unknown> }) => {
        return rows.filter((r) => matchesWhere(r, args.where));
      }),
      updateMany: vi.fn(
        async (args: { where: Record<string, unknown>; data: Partial<MembershipRow> }) => {
          let count = 0;
          rows = rows.map((r) => {
            if (matchesWhere(r, args.where)) {
              count += 1;
              return { ...r, ...args.data };
            }
            return r;
          });
          return { count };
        },
      ),
    },
  };
}

function matchesWhere(row: MembershipRow, where: Record<string, unknown>): boolean {
  if ("status" in where && row.status !== where.status) return false;
  if ("id" in where) {
    const idClause = where.id as { in?: string[] } | string;
    if (typeof idClause === "string") {
      if (row.id !== idClause) return false;
    } else if (idClause.in) {
      if (!idClause.in.includes(row.id)) return false;
    }
  }
  if ("OR" in where) {
    const branches = where.OR as Array<Record<string, unknown>>;
    return branches.some((b) => matchesBranch(row, b));
  }
  return true;
}

function matchesBranch(row: MembershipRow, branch: Record<string, unknown>): boolean {
  if ("userId" in branch && row.userId !== branch.userId) return false;
  if ("inviteEmail" in branch) {
    const ie = branch.inviteEmail as { equals?: string; mode?: string } | string | null;
    const wanted = typeof ie === "string" ? ie : ie?.equals;
    if (!wanted) return false;
    if ((row.inviteEmail ?? "").toLowerCase() !== wanted.toLowerCase()) return false;
    if ("userId" in branch && row.userId !== branch.userId) return false;
  }
  return true;
}

describe("claimPendingMemberships", () => {
  beforeEach(() => vi.clearAllMocks());

  test("links INVITED rows by inviteEmail (case-insensitive) and activates them", async () => {
    const prisma = fakePrisma([
      { id: "m1", userId: null, inviteEmail: "Student@Test.COM", status: "INVITED" },
      { id: "m2", userId: null, inviteEmail: "other@test.com", status: "INVITED" },
    ]);

    const result = await claimPendingMemberships(prisma as never, {
      userId: "user-1",
      email: "student@test.com",
    });

    expect(result.claimed).toBe(1);
    const after = prisma.rows();
    expect(after.find((r) => r.id === "m1")).toMatchObject({
      userId: "user-1",
      status: "ACTIVE",
    });
    expect(after.find((r) => r.id === "m2")).toMatchObject({
      userId: null,
      status: "INVITED",
    });
  });

  test("also activates INVITED rows already linked to the user (no inviteEmail)", async () => {
    const prisma = fakePrisma([
      { id: "m1", userId: "user-1", inviteEmail: null, status: "INVITED" },
    ]);

    const result = await claimPendingMemberships(prisma as never, {
      userId: "user-1",
      email: "student@test.com",
    });

    expect(result.claimed).toBe(1);
    expect(prisma.rows()[0]).toMatchObject({
      userId: "user-1",
      status: "ACTIVE",
    });
  });

  test("noop when no pending memberships match", async () => {
    const prisma = fakePrisma([
      { id: "m1", userId: "user-other", inviteEmail: null, status: "ACTIVE" },
    ]);

    const result = await claimPendingMemberships(prisma as never, {
      userId: "user-1",
      email: "student@test.com",
    });

    expect(result.claimed).toBe(0);
  });

  test("ignores empty / nullish email gracefully", async () => {
    const prisma = fakePrisma([
      { id: "m1", userId: null, inviteEmail: "x@y.com", status: "INVITED" },
    ]);

    const result = await claimPendingMemberships(prisma as never, {
      userId: "user-1",
      email: null,
    });

    expect(result.claimed).toBe(0);
  });
});
