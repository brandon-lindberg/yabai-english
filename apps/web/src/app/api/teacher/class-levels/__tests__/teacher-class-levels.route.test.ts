import { beforeEach, describe, expect, test, vi } from "vitest";

const { authMock, prismaMock } = vi.hoisted(() => ({
  authMock: vi.fn(),
  prismaMock: {
    teacherProfile: { findUnique: vi.fn() },
    teacherClassLevel: {
      findMany: vi.fn(),
      findUnique: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
    },
  },
}));

vi.mock("@/auth", () => ({ auth: authMock }));
vi.mock("@/lib/prisma", () => ({ prisma: prismaMock }));

import { GET, POST } from "@/app/api/teacher/class-levels/route";

const teacherId = "teacher-1";

function postReq(body: unknown) {
  return new Request("http://localhost/api/teacher/class-levels", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

describe("GET /api/teacher/class-levels", () => {
  beforeEach(() => vi.clearAllMocks());

  test("401 when unauthenticated", async () => {
    authMock.mockResolvedValue(null);
    const res = await GET();
    expect(res.status).toBe(401);
  });

  test("401 when caller is not a TEACHER/SUPER_ADMIN", async () => {
    authMock.mockResolvedValue({ user: { id: "u1", role: "STUDENT" } });
    const res = await GET();
    expect(res.status).toBe(401);
  });

  test("404 when caller has no teacher profile", async () => {
    authMock.mockResolvedValue({ user: { id: "u1", role: "TEACHER" } });
    prismaMock.teacherProfile.findUnique.mockResolvedValue(null);
    const res = await GET();
    expect(res.status).toBe(404);
  });

  test("200 returns the teacher's class levels", async () => {
    authMock.mockResolvedValue({ user: { id: "u1", role: "TEACHER" } });
    prismaMock.teacherProfile.findUnique.mockResolvedValue({ id: teacherId });
    prismaMock.teacherClassLevel.findMany.mockResolvedValue([
      { id: "lvl-1", code: "beginner", labelEn: "Beginner", labelJa: "初級", sortOrder: 0, active: true },
    ]);
    const res = await GET();
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.classLevels).toHaveLength(1);
    expect(prismaMock.teacherClassLevel.findMany).toHaveBeenCalledWith({
      where: { teacherId, active: true },
      orderBy: [{ sortOrder: "asc" }, { labelEn: "asc" }],
    });
  });
});

describe("POST /api/teacher/class-levels", () => {
  beforeEach(() => vi.clearAllMocks());

  test("400 when labelEn is missing", async () => {
    authMock.mockResolvedValue({ user: { id: "u1", role: "TEACHER" } });
    prismaMock.teacherProfile.findUnique.mockResolvedValue({ id: teacherId });
    const res = await POST(postReq({}));
    expect(res.status).toBe(400);
  });

  test("400 when labelEn slugifies to empty (e.g. only Japanese)", async () => {
    authMock.mockResolvedValue({ user: { id: "u1", role: "TEACHER" } });
    prismaMock.teacherProfile.findUnique.mockResolvedValue({ id: teacherId });
    const res = await POST(postReq({ labelEn: "初級" }));
    expect(res.status).toBe(400);
  });

  test("201 auto-generates code from labelEn and persists labelEn/labelJa", async () => {
    authMock.mockResolvedValue({ user: { id: "u1", role: "TEACHER" } });
    prismaMock.teacherProfile.findUnique.mockResolvedValue({ id: teacherId });
    prismaMock.teacherClassLevel.findUnique.mockResolvedValue(null);
    prismaMock.teacherClassLevel.findMany.mockResolvedValue([
      { sortOrder: 2 },
    ]);
    prismaMock.teacherClassLevel.create.mockResolvedValue({
      id: "lvl-new",
      teacherId,
      code: "year-7",
      labelEn: "Year 7",
      labelJa: "中学1年",
      sortOrder: 3,
      active: true,
    });

    const res = await POST(postReq({ labelEn: "Year 7", labelJa: "中学1年" }));
    expect(res.status).toBe(201);
    expect(prismaMock.teacherClassLevel.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        teacherId,
        code: "year-7",
        labelEn: "Year 7",
        labelJa: "中学1年",
        sortOrder: 3,
      }),
    });
  });

  test("409 when an active level with the same generated code already exists", async () => {
    authMock.mockResolvedValue({ user: { id: "u1", role: "TEACHER" } });
    prismaMock.teacherProfile.findUnique.mockResolvedValue({ id: teacherId });
    prismaMock.teacherClassLevel.findUnique.mockResolvedValue({
      id: "lvl-existing",
      active: true,
    });
    const res = await POST(postReq({ labelEn: "Beginner" }));
    expect(res.status).toBe(409);
    expect(prismaMock.teacherClassLevel.create).not.toHaveBeenCalled();
  });

  test("201 reactivates a soft-deleted row with the same code", async () => {
    authMock.mockResolvedValue({ user: { id: "u1", role: "TEACHER" } });
    prismaMock.teacherProfile.findUnique.mockResolvedValue({ id: teacherId });
    prismaMock.teacherClassLevel.findUnique.mockResolvedValue({
      id: "lvl-old",
      active: false,
    });
    prismaMock.teacherClassLevel.findMany.mockResolvedValue([]);
    prismaMock.teacherClassLevel.update.mockResolvedValue({
      id: "lvl-old",
      teacherId,
      code: "beginner",
      labelEn: "Beginner",
      labelJa: null,
      sortOrder: 0,
      active: true,
    });
    const res = await POST(postReq({ labelEn: "Beginner" }));
    expect(res.status).toBe(201);
    expect(prismaMock.teacherClassLevel.create).not.toHaveBeenCalled();
    expect(prismaMock.teacherClassLevel.update).toHaveBeenCalledWith({
      where: { id: "lvl-old" },
      data: expect.objectContaining({ active: true, labelEn: "Beginner" }),
    });
  });
});
