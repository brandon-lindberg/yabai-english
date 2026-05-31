import { beforeEach, describe, expect, test, vi } from "vitest";

const { authMock, prismaMock } = vi.hoisted(() => ({
  authMock: vi.fn(),
  prismaMock: {
    teacherLessonOffering: { findFirst: vi.fn() },
    user: { findFirst: vi.fn() },
    teacherStudentLessonRate: { upsert: vi.fn() },
  },
}));

vi.mock("@/auth", () => ({ auth: authMock }));
vi.mock("@/lib/prisma", () => ({ prisma: prismaMock }));

import { POST } from "@/app/api/admin/teacher-student-rates/route";

describe("POST /api/admin/teacher-student-rates", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    authMock.mockResolvedValue({ user: { id: "admin-1", role: "SUPER_ADMIN" } });
    prismaMock.teacherLessonOffering.findFirst.mockResolvedValue({ id: "off-1" });
    prismaMock.user.findFirst.mockResolvedValue({ id: "student-1" });
    prismaMock.teacherStudentLessonRate.upsert.mockResolvedValue({
      id: "rate-1",
      rateYen: 2500,
      active: true,
    });
  });

  test("allows SUPER_ADMIN to create a below-minimum student-specific legacy rate", async () => {
    const res = await POST(
      new Request("http://localhost/api/admin/teacher-student-rates", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          teacherId: "teacher-1",
          studentId: "student-1",
          teacherLessonOfferingId: "off-1",
          rateYen: 2500,
        }),
      }),
    );

    expect(res.status).toBe(200);
    expect(prismaMock.teacherStudentLessonRate.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        create: expect.objectContaining({
          teacherId: "teacher-1",
          studentId: "student-1",
          teacherLessonOfferingId: "off-1",
          rateYen: 2500,
          active: true,
          createdByAdminUserId: "admin-1",
        }),
      }),
    );
  });

  test("rejects non-admin requests", async () => {
    authMock.mockResolvedValue({ user: { id: "teacher-user-1", role: "TEACHER" } });

    const res = await POST(
      new Request("http://localhost/api/admin/teacher-student-rates", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          teacherId: "teacher-1",
          studentId: "student-1",
          teacherLessonOfferingId: "off-1",
          rateYen: 2500,
        }),
      }),
    );

    expect(res.status).toBe(401);
    expect(prismaMock.teacherStudentLessonRate.upsert).not.toHaveBeenCalled();
  });
});
