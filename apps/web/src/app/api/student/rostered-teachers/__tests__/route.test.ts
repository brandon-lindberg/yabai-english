import { beforeEach, describe, expect, test, vi } from "vitest";

const { authMock, findManyMock } = vi.hoisted(() => ({
  authMock: vi.fn(),
  findManyMock: vi.fn(),
}));

vi.mock("@/auth", () => ({ auth: authMock }));
vi.mock("@/lib/prisma", () => ({
  prisma: {
    teacherRosterEntry: { findMany: findManyMock },
  },
}));

import { GET } from "../route";

describe("GET /api/student/rostered-teachers", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  test("returns 401 when not a student", async () => {
    authMock.mockResolvedValue({ user: { id: "t1", role: "TEACHER" } });
    const res = await GET();
    expect(res.status).toBe(401);
  });

  test("returns teacher ids and display names for rostered student", async () => {
    authMock.mockResolvedValue({ user: { id: "stu-1", role: "STUDENT" } });
    findManyMock.mockResolvedValue([
      {
        id: "r1",
        teacher: {
          id: "tp-1",
          displayName: "Ms. A",
          user: { name: "Alice" },
        },
      },
      {
        id: "r2",
        teacher: {
          id: "tp-2",
          displayName: null,
          user: { name: "Bob Teacher" },
        },
      },
    ]);

    const res = await GET();
    expect(res.status).toBe(200);
    await expect(res.json()).resolves.toEqual({
      teachers: [
        { teacherProfileId: "tp-1", displayName: "Ms. A" },
        { teacherProfileId: "tp-2", displayName: "Bob Teacher" },
      ],
    });
  });
});
