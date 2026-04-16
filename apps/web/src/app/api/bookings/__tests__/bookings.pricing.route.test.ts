import { beforeEach, describe, expect, test, vi } from "vitest";
import { BookingStatus, LessonTier } from "@prisma/client";

const {
  authMock,
  prismaMock,
  createUserNotificationMock,
} = vi.hoisted(() => ({
  authMock: vi.fn(),
  prismaMock: {
    lessonProduct: { findFirst: vi.fn() },
    teacherProfile: { findFirst: vi.fn() },
    chatThread: { findUnique: vi.fn() },
    booking: { findFirst: vi.fn() },
    user: { findUnique: vi.fn() },
    $transaction: vi.fn(),
  },
  createUserNotificationMock: vi.fn(),
}));

vi.mock("@/auth", () => ({
  auth: authMock,
}));

vi.mock("@/lib/prisma", () => ({
  prisma: prismaMock,
}));

vi.mock("@/lib/notifications", () => ({
  createUserNotification: createUserNotificationMock,
}));

import { POST } from "@/app/api/bookings/route";

describe("POST /api/bookings pricing", () => {
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
    prismaMock.teacherProfile.findFirst.mockResolvedValue({
      id: "teacher-profile-1",
      userId: "teacher-user-1",
      offersFreeTrial: true,
      rateYen: 3000,
      lessonOfferings: [{ durationMin: 60, rateYen: 5000, isGroup: false, active: true }],
      user: { email: "teacher@example.com" },
    });
    prismaMock.chatThread.findUnique.mockResolvedValue(null);
    prismaMock.booking.findFirst.mockResolvedValue(null);
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
            status: BookingStatus.PENDING_PAYMENT,
            quotedPriceYen: 5000,
            lessonProduct: { nameEn: "Standard 60", nameJa: "標準 60" },
            teacher: { user: { email: "teacher@example.com" } },
          }),
        },
      }),
    );
  });

  test("uses configured duration rate for pending payment booking", async () => {
    const startsAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();
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
    await expect(res.json()).resolves.toEqual({
      bookingId: "booking-1",
      requiresPayment: true,
      checkoutUrl: "/book/checkout/booking-1",
    });
    expect(prismaMock.$transaction).toHaveBeenCalled();
    expect(createUserNotificationMock).toHaveBeenCalled();
  });
});
