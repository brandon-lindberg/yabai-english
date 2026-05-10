import { beforeEach, describe, expect, test, vi } from "vitest";
import { LessonTier } from "@/generated/prisma/client";

const { authMock, prismaMock } = vi.hoisted(() => ({
  authMock: vi.fn(),
  prismaMock: {
    lessonProduct: { findFirst: vi.fn() },
    teacherProfile: { findFirst: vi.fn() },
    teacherRosterEntry: { findFirst: vi.fn() },
    chatThread: { findUnique: vi.fn() },
    booking: { findFirst: vi.fn() },
    schoolScheduleSlot: { findMany: vi.fn() },
    teacherStudentLessonRate: { findUnique: vi.fn() },
    user: { findUnique: vi.fn() },
    $transaction: vi.fn(),
  },
}));

vi.mock("@/auth", () => ({ auth: authMock }));
vi.mock("@/lib/prisma", () => ({ prisma: prismaMock }));
vi.mock("@/lib/notifications", () => ({
  createUserNotification: vi.fn(),
}));

import { POST } from "@/app/api/bookings/route";

const startsAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();

function baseTeacher(overrides: Record<string, unknown> = {}) {
  return {
    id: "teacher-profile-1",
    userId: "teacher-user-1",
    offersFreeTrial: true,
    marketplaceHidden: false,
    rateYen: 3000,
    lessonOfferings: [
      {
        id: "off-1",
        durationMin: 60,
        rateYen: 5000,
        isGroup: false,
        active: true,
        classType: { code: "grammar" },
      },
    ],
    user: { email: "teacher@example.com", organizationMemberships: [] },
    ...overrides,
  };
}

describe("POST /api/bookings marketplace privacy", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    authMock.mockResolvedValue({ user: { id: "student-1", role: "STUDENT" } });
    prismaMock.lessonProduct.findFirst.mockResolvedValue({
      id: "lp-60",
      tier: LessonTier.STANDARD,
      active: true,
      durationMin: 60,
      nameEn: "Standard 60",
      nameJa: "標準 60",
    });
    prismaMock.chatThread.findUnique.mockResolvedValue(null);
    prismaMock.booking.findFirst.mockResolvedValue(null);
    prismaMock.schoolScheduleSlot.findMany.mockResolvedValue([]);
    prismaMock.teacherStudentLessonRate.findUnique.mockResolvedValue(null);
    prismaMock.user.findUnique.mockResolvedValue({
      id: "student-1",
      email: "student@example.com",
      studentProfile: { trialLessonUsedAt: null },
    });
    prismaMock.$transaction.mockImplementation(async (cb: (tx: unknown) => Promise<unknown>) =>
      cb({
        studentProfile: {
          findUnique: vi.fn().mockResolvedValue({ userId: "student-1" }),
        },
        booking: {
          create: vi.fn().mockResolvedValue({
            id: "booking-1",
            status: "PENDING_PAYMENT",
            quotedPriceYen: 5000,
            lessonProduct: { nameEn: "Standard 60", nameJa: "標準 60" },
            teacher: { user: { email: "teacher@example.com" } },
          }),
        },
        teacherRosterEntry: {
          upsert: vi.fn().mockResolvedValue({}),
          deleteMany: vi.fn().mockResolvedValue({ count: 0 }),
        },
        user: {
          findUnique: vi.fn().mockResolvedValue({ email: "student@example.com" }),
        },
      }),
    );
  });

  test("returns 403 when teacher is hidden from marketplace and student is not on roster", async () => {
    prismaMock.teacherProfile.findFirst.mockResolvedValue(
      baseTeacher({ marketplaceHidden: true }),
    );
    prismaMock.teacherRosterEntry.findFirst.mockResolvedValue(null);

    const res = await POST(
      new Request("http://localhost/api/bookings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          lessonProductId: "lp-60",
          teacherProfileId: "teacher-profile-1",
          startsAt,
        }),
      }),
    );

    expect(res.status).toBe(403);
    await expect(res.json()).resolves.toEqual({
      error: "This teacher is not available for booking.",
    });
    expect(prismaMock.$transaction).not.toHaveBeenCalled();
  });

  test("allows booking when teacher is hidden and student is on roster", async () => {
    prismaMock.teacherProfile.findFirst.mockResolvedValue(
      baseTeacher({ marketplaceHidden: true }),
    );
    prismaMock.teacherRosterEntry.findFirst.mockResolvedValue({ id: "roster-1" });

    const upsertMock = vi.fn().mockResolvedValue({});
    const deleteManyRosterMock = vi.fn().mockResolvedValue({ count: 0 });
    prismaMock.$transaction.mockImplementation(async (cb: (tx: unknown) => Promise<unknown>) =>
      cb({
        studentProfile: {
          findUnique: vi.fn().mockResolvedValue({ userId: "student-1" }),
        },
        booking: {
          create: vi.fn().mockResolvedValue({
            id: "booking-1",
            status: "PENDING_PAYMENT",
            quotedPriceYen: 5000,
            lessonProduct: { nameEn: "Standard 60", nameJa: "標準 60" },
            teacher: { user: { email: "teacher@example.com" } },
          }),
        },
        teacherRosterEntry: {
          upsert: upsertMock,
          deleteMany: deleteManyRosterMock,
        },
        user: {
          findUnique: vi.fn().mockResolvedValue({ email: "student@example.com" }),
        },
      }),
    );

    const res = await POST(
      new Request("http://localhost/api/bookings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          lessonProductId: "lp-60",
          teacherProfileId: "teacher-profile-1",
          startsAt,
        }),
      }),
    );

    expect(res.status).toBe(200);
    expect(prismaMock.$transaction).toHaveBeenCalled();
    expect(upsertMock).not.toHaveBeenCalled();
  });

  test("upserts roster inside transaction for public marketplace teacher", async () => {
    prismaMock.teacherProfile.findFirst.mockResolvedValue(baseTeacher());
    prismaMock.teacherRosterEntry.findFirst.mockResolvedValue(null);

    const upsertMock = vi.fn().mockResolvedValue({});
    const deleteManyRosterMock = vi.fn().mockResolvedValue({ count: 0 });
    prismaMock.$transaction.mockImplementation(async (cb: (tx: unknown) => Promise<unknown>) =>
      cb({
        studentProfile: {
          findUnique: vi.fn().mockResolvedValue({ userId: "student-1" }),
        },
        booking: {
          create: vi.fn().mockResolvedValue({
            id: "booking-1",
            status: "PENDING_PAYMENT",
            quotedPriceYen: 5000,
            lessonProduct: { nameEn: "Standard 60", nameJa: "標準 60" },
            teacher: { user: { email: "teacher@example.com" } },
          }),
        },
        teacherRosterEntry: {
          upsert: upsertMock,
          deleteMany: deleteManyRosterMock,
        },
        user: {
          findUnique: vi.fn().mockResolvedValue({ email: "student@example.com" }),
        },
      }),
    );

    const res = await POST(
      new Request("http://localhost/api/bookings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          lessonProductId: "lp-60",
          teacherProfileId: "teacher-profile-1",
          startsAt,
        }),
      }),
    );

    expect(res.status).toBe(200);
    expect(upsertMock).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          teacherId_studentId: {
            teacherId: "teacher-profile-1",
            studentId: "student-1",
          },
        },
      }),
    );
  });

  test("returns 403 when teacher has active organization membership", async () => {
    prismaMock.teacherProfile.findFirst.mockResolvedValue(
      baseTeacher({
        user: {
          email: "teacher@example.com",
          organizationMemberships: [{ id: "om-1" }],
        },
      }),
    );
    prismaMock.teacherRosterEntry.findFirst.mockResolvedValue(null);

    const res = await POST(
      new Request("http://localhost/api/bookings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          lessonProductId: "lp-60",
          teacherProfileId: "teacher-profile-1",
          startsAt,
        }),
      }),
    );

    expect(res.status).toBe(403);
    await expect(res.json()).resolves.toEqual({
      error: "This teacher is not available for marketplace booking.",
    });
  });
});
