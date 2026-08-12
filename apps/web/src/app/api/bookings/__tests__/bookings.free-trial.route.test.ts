import { beforeEach, describe, expect, test, vi } from "vitest";
import { LessonTier } from "@/generated/prisma/client";

const { authMock, findProductMock, findTeacherMock, redemptionFindMock } = vi.hoisted(() => ({
  authMock: vi.fn(),
  findProductMock: vi.fn(),
  findTeacherMock: vi.fn(),
  redemptionFindMock: vi.fn(),
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
    freeTrialRedemption: { findUnique: redemptionFindMock, create: vi.fn() },
    teacherRosterEntry: {
      findFirst: vi.fn().mockResolvedValue(null),
    },
  },
}));

vi.mock("next/cache", () => ({
  revalidatePath: vi.fn(),
}));

import { POST } from "@/app/api/bookings/route";

describe("POST /api/bookings free trial guard", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    authMock.mockResolvedValue({ user: { id: "student-1", role: "STUDENT" } });
    redemptionFindMock.mockResolvedValue(null);
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
      marketplaceHidden: false,
      user: {
        email: "teacher@example.com",
        organizationMemberships: [],
      },
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
      reason: "TEACHER_DOES_NOT_OFFER",
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

  test("refuses a second trial with the same teacher", async () => {
    findTeacherMock.mockResolvedValue({
      id: "teacher-profile-1",
      userId: "teacher-user-1",
      offersFreeTrial: true,
      marketplaceHidden: false,
      user: { email: "teacher@example.com", organizationMemberships: [] },
    });
    redemptionFindMock.mockResolvedValue({ id: "redemption-1" });

    const res = await POST(
      new Request("http://localhost/api/bookings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          lessonProductId: "lp-trial",
          teacherProfileId: "teacher-profile-1",
          startsAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
        }),
      }),
    );

    expect(res.status).toBe(409);
    const body = await res.json();
    expect(body.reason).toBe("ALREADY_USED_WITH_TEACHER");
    // A used trial must never reach checkout: it is quoted at 0 yen, and Stripe
    // will not accept a zero-amount charge.
    expect(body.error).toMatch(/this teacher/i);
  });

  test("looks the trial up against the teacher being booked, not globally", async () => {
    findTeacherMock.mockResolvedValue({
      id: "teacher-profile-1",
      userId: "teacher-user-1",
      offersFreeTrial: true,
      marketplaceHidden: false,
      user: { email: "teacher@example.com", organizationMemberships: [] },
    });
    redemptionFindMock.mockResolvedValue({ id: "redemption-1" });

    await POST(
      new Request("http://localhost/api/bookings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          lessonProductId: "lp-trial",
          teacherProfileId: "teacher-profile-1",
          startsAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
        }),
      }),
    );

    expect(redemptionFindMock).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          studentId_teacherId: { studentId: "student-1", teacherId: "teacher-profile-1" },
        },
      }),
    );
  });
});
