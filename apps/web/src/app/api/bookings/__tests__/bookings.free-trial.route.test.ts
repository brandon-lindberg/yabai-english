import { beforeEach, describe, expect, test, vi } from "vitest";
import { LessonTier } from "@/generated/prisma/client";

const { authMock, findProductMock, findTeacherMock } = vi.hoisted(() => ({
  authMock: vi.fn(),
  findProductMock: vi.fn(),
  findTeacherMock: vi.fn(),
}));

vi.mock("@/auth", () => ({
  auth: authMock,
}));

vi.mock("@/lib/prisma", () => ({
  prisma: {
    lessonProduct: {
      findFirst: findProductMock,
    },
    teacherProfile: {
      findFirst: findTeacherMock,
    },
  },
}));

import { POST } from "@/app/api/bookings/route";

describe("POST /api/bookings free trial guard", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    authMock.mockResolvedValue({ user: { id: "student-1", role: "STUDENT" } });
    findProductMock.mockResolvedValue({
      id: "lp-trial",
      tier: LessonTier.FREE_TRIAL,
      active: true,
      durationMin: 20,
      nameEn: "Free trial",
      nameJa: "無料トライアル",
    });
    findTeacherMock.mockResolvedValue({
      id: "teacher-profile-1",
      userId: "teacher-user-1",
      offersFreeTrial: false,
      user: { email: "teacher@example.com" },
    });
  });

  test("rejects free trial when teacher disabled free trial option", async () => {
    const startsAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();
    const res = await POST(
      new Request("http://localhost/api/bookings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          lessonProductId: "lp-trial",
          teacherProfileId: "teacher-profile-1",
          startsAt,
        }),
      }),
    );

    expect(res.status).toBe(409);
    await expect(res.json()).resolves.toEqual({
      error: "This teacher does not offer a free trial lesson.",
    });
  });

  test("rejects teacher role from creating bookings", async () => {
    authMock.mockResolvedValue({ user: { id: "teacher-1", role: "TEACHER" } });
    const startsAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();
    const res = await POST(
      new Request("http://localhost/api/bookings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          lessonProductId: "lp-trial",
          teacherProfileId: "teacher-profile-1",
          startsAt,
        }),
      }),
    );

    expect(res.status).toBe(403);
    await expect(res.json()).resolves.toEqual({
      error: "Students only",
    });
  });
});
