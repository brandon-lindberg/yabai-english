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

import { GET, POST } from "../route";

describe("GET /api/teacher/roster", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    authMock.mockResolvedValue({ user: { id: "tu-1", role: Role.TEACHER } });
    prismaMock.teacherProfile.findUnique.mockResolvedValue({ id: "tp-1" });
  });

  test("returns entries for the signed-in teacher", async () => {
    prismaMock.teacherRosterEntry.findMany.mockResolvedValue([
      {
        id: "e1",
        studentId: "s1",
        invitedEmail: null,
        student: { name: "Sam", email: "sam@example.com" },
      },
      {
        id: "e2",
        studentId: null,
        invitedEmail: "pending@example.com",
        student: null,
      },
    ]);

    const res = await GET();
    expect(res.status).toBe(200);
    await expect(res.json()).resolves.toEqual({
      entries: [
        {
          id: "e1",
          status: "active",
          displayName: "Sam",
          email: "sam@example.com",
        },
        {
          id: "e2",
          status: "pending",
          displayName: null,
          email: "pending@example.com",
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
});
