import { beforeEach, describe, expect, test, vi } from "vitest";
import { Role } from "@/generated/prisma/client";

const { authMock, prismaMock } = vi.hoisted(() => ({
  authMock: vi.fn(),
  prismaMock: {
    teacherProfile: { findUnique: vi.fn() },
    user: { findFirst: vi.fn() },
    teacherRosterEntry: {
      findMany: vi.fn(),
      findFirst: vi.fn(),
      create: vi.fn(),
      deleteMany: vi.fn(),
      upsert: vi.fn(),
    },
    $transaction: vi.fn(),
  },
}));

vi.mock("@/auth", () => ({ auth: authMock }));
vi.mock("@/lib/prisma", () => ({ prisma: prismaMock }));
vi.mock("@/lib/reconcile-teacher-roster-from-bookings", () => ({
  reconcileTeacherRosterFromBookings: vi.fn().mockResolvedValue(undefined),
}));

import { GET, POST } from "../route";
import { reconcileTeacherRosterFromBookings } from "@/lib/reconcile-teacher-roster-from-bookings";

function rosterRequest(scope?: "archived") {
  const url = scope
    ? `http://localhost/api/teacher/roster?scope=${scope}`
    : "http://localhost/api/teacher/roster";
  return new Request(url);
}

describe("GET /api/teacher/roster", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    authMock.mockResolvedValue({ user: { id: "tu-1", role: Role.TEACHER } });
    prismaMock.teacherProfile.findUnique.mockResolvedValue({ id: "tp-1" });
  });

  test("allows SUPER_ADMIN with a teacher profile", async () => {
    authMock.mockResolvedValue({ user: { id: "admin-1", role: Role.SUPER_ADMIN } });
    prismaMock.teacherRosterEntry.findMany.mockResolvedValue([]);

    const res = await GET(rosterRequest());
    expect(res.status).toBe(200);
    expect(reconcileTeacherRosterFromBookings).toHaveBeenCalledWith(prismaMock, {
      teacherProfileId: "tp-1",
    });
  });

  test("returns entries for the signed-in teacher", async () => {
    prismaMock.teacherRosterEntry.findMany.mockResolvedValue([
      {
        id: "e1",
        studentId: "s1",
        invitedEmail: null,
        archivedAt: null,
        student: { name: "Sam", email: "sam@example.com" },
      },
      {
        id: "e2",
        studentId: null,
        invitedEmail: "pending@example.com",
        archivedAt: null,
        student: null,
      },
    ]);

    const res = await GET(rosterRequest());
    expect(res.status).toBe(200);
    expect(reconcileTeacherRosterFromBookings).toHaveBeenCalledWith(prismaMock, {
      teacherProfileId: "tp-1",
    });
    await expect(res.json()).resolves.toEqual({
      entries: [
        {
          id: "e1",
          status: "active",
          displayName: "Sam",
          email: "sam@example.com",
          studentUserId: "s1",
          archivedAtIso: null,
        },
        {
          id: "e2",
          status: "pending",
          displayName: null,
          email: "pending@example.com",
          studentUserId: null,
          archivedAtIso: null,
        },
      ],
    });
  });
});

describe("POST /api/teacher/roster", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    authMock.mockResolvedValue({ user: { id: "tu-1", role: Role.TEACHER } });
    prismaMock.teacherProfile.findUnique.mockResolvedValue({ id: "tp-1" });
  });

  test("creates pending invite when no student user exists", async () => {
    prismaMock.user.findFirst.mockResolvedValue(null);
    prismaMock.teacherRosterEntry.findFirst.mockResolvedValue(null);
    prismaMock.teacherRosterEntry.create.mockResolvedValue({});

    const res = await POST(
      new Request("http://localhost/api/teacher/roster", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: "NEW@Example.com" }),
      }),
    );

    expect(res.status).toBe(200);
    expect(prismaMock.teacherRosterEntry.create).toHaveBeenCalledWith({
      data: { teacherId: "tp-1", invitedEmail: "new@example.com" },
    });
  });

  test("upserts active student and clears matching pending", async () => {
    prismaMock.user.findFirst.mockResolvedValue({
      id: "stu-99",
      email: "stu@example.com",
    });
    prismaMock.$transaction.mockImplementation(async (cb: (tx: unknown) => Promise<unknown>) =>
      cb({
        teacherRosterEntry: {
          deleteMany: vi.fn().mockResolvedValue({ count: 1 }),
          upsert: vi.fn().mockResolvedValue({}),
        },
      }),
    );

    const res = await POST(
      new Request("http://localhost/api/teacher/roster", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: "Stu@Example.com" }),
      }),
    );

    expect(res.status).toBe(200);
    expect(prismaMock.$transaction).toHaveBeenCalled();
  });

  test("returns the working roster by default, excluding archived students", async () => {
    prismaMock.teacherRosterEntry.findMany.mockResolvedValue([]);

    await GET(rosterRequest());

    expect(prismaMock.teacherRosterEntry.findMany.mock.calls[0][0].where).toMatchObject({
      teacherId: "tp-1",
      archivedAt: null,
    });
  });

  test("scope=archived returns only archived students, most recently archived first", async () => {
    prismaMock.teacherRosterEntry.findMany.mockResolvedValue([]);

    await GET(rosterRequest("archived"));

    const args = prismaMock.teacherRosterEntry.findMany.mock.calls[0][0];
    expect(args.where).toMatchObject({ teacherId: "tp-1", archivedAt: { not: null } });
    expect(args.orderBy).toEqual({ archivedAt: "desc" });
  });

  test("reports when a student was archived, so the tab can show it", async () => {
    prismaMock.teacherRosterEntry.findMany.mockResolvedValue([
      {
        id: "e1",
        studentId: "s1",
        invitedEmail: null,
        archivedAt: new Date("2026-08-20T00:00:00.000Z"),
        student: { name: "Sam", email: "sam@example.com" },
      },
    ]);

    const res = await GET(rosterRequest("archived"));
    const body = (await res.json()) as { entries: { archivedAtIso: string | null }[] };
    expect(body.entries[0].archivedAtIso).toBe("2026-08-20T00:00:00.000Z");
  });
});
