import { beforeEach, describe, expect, test, vi } from "vitest";
import { BookingStatus, LessonTier } from "@/generated/prisma/client";

const { authMock, prismaMock, createUserNotificationMock, createMeetMock } = vi.hoisted(
  () => ({
    authMock: vi.fn(),
    prismaMock: {
      lessonProduct: { findFirst: vi.fn() },
      teacherProfile: { findFirst: vi.fn() },
      chatThread: { findUnique: vi.fn() },
      booking: { findFirst: vi.fn(), findUnique: vi.fn(), update: vi.fn() },
      user: { findUnique: vi.fn() },
      invoice: { upsert: vi.fn() },
      $transaction: vi.fn(),
    },
    createUserNotificationMock: vi.fn(),
    createMeetMock: vi.fn(),
  }),
);

vi.mock("@/auth", () => ({ auth: authMock }));
vi.mock("@/lib/prisma", () => ({ prisma: prismaMock }));
vi.mock("@/lib/notifications", () => ({
  createUserNotification: createUserNotificationMock,
}));
vi.mock("@/lib/google-calendar", () => ({
  createMeetLessonEvent: createMeetMock,
}));
vi.mock("@/lib/chat-threads", () => ({
  ensureStudentTeacherThread: vi.fn(),
}));

import { POST } from "@/app/api/bookings/route";

describe("POST /api/bookings — teacher notification on confirmed booking", () => {
  const startsAt = new Date("2026-05-02T00:00:00Z");

  beforeEach(() => {
    vi.clearAllMocks();
    authMock.mockResolvedValue({ user: { id: "student-1", role: "STUDENT" } });
    prismaMock.lessonProduct.findFirst.mockResolvedValue({
      id: "lp-trial",
      tier: LessonTier.FREE_TRIAL,
      active: true,
      durationMin: 20,
      nameEn: "Free trial",
      nameJa: "無料トライアル",
    });
    prismaMock.teacherProfile.findFirst.mockResolvedValue({
      id: "teacher-profile-1",
      userId: "teacher-user-1",
      offersFreeTrial: true,
      rateYen: 3000,
      calendarId: "primary",
      googleCalendarRefreshToken: null,
      lessonOfferings: [
        {
          id: "off-1",
          durationMin: 20,
          rateYen: 0,
          isGroup: false,
          active: true,
          lessonType: "conversation",
        },
      ],
      availabilitySlots: [{ timezone: "Asia/Tokyo" }],
      user: { email: "teacher@example.com" },
    });
    prismaMock.chatThread.findUnique.mockResolvedValue(null);
    prismaMock.booking.findFirst.mockResolvedValue(null);
    prismaMock.booking.findUnique.mockResolvedValue(null);
    prismaMock.booking.update.mockResolvedValue({});
    prismaMock.invoice.upsert.mockResolvedValue({});
    prismaMock.user.findUnique.mockResolvedValue({
      id: "student-1",
      email: "student@example.com",
      name: "Alice Student",
      studentProfile: { trialLessonUsedAt: null },
    });
    createMeetMock.mockResolvedValue({ meetUrl: null, googleEventId: null });
    prismaMock.$transaction.mockImplementation(async (cb: (tx: unknown) => Promise<unknown>) =>
      cb({
        studentProfile: {
          findUnique: vi.fn().mockResolvedValue({ userId: "student-1" }),
          updateMany: vi.fn().mockResolvedValue({ count: 1 }),
        },
        booking: {
          create: vi.fn().mockResolvedValue({
            id: "booking-1",
            status: BookingStatus.CONFIRMED,
            quotedPriceYen: 0,
            startsAt,
            endsAt: new Date(startsAt.getTime() + 20 * 60 * 1000),
            lessonProduct: { nameEn: "Free trial", nameJa: "無料トライアル" },
            teacher: { user: { email: "teacher@example.com" } },
          }),
        },
      }),
    );
  });

  test("notifies the teacher with the student name and lesson time on a confirmed free-trial booking", async () => {
    const res = await POST(
      new Request("http://localhost/api/bookings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          lessonProductId: "lp-trial",
          teacherProfileId: "teacher-profile-1",
          startsAt: startsAt.toISOString(),
        }),
      }),
    );

    expect(res.status).toBe(200);

    const teacherCalls = createUserNotificationMock.mock.calls
      .map((c) => c[0] as { userId: string; titleJa: string; titleEn: string; bodyJa?: string; bodyEn?: string })
      .filter((c) => c.userId === "teacher-user-1");
    expect(teacherCalls).toHaveLength(1);
    const payload = teacherCalls[0];
    expect(payload.titleEn).toContain("Alice Student");
    expect(payload.bodyEn).toContain("Alice Student");
    expect(payload.bodyEn).toContain("09:00");
    expect(payload.titleJa).toContain("Alice Student");
    expect(payload.bodyJa).toContain("09:00");
  });

  test("does NOT notify the teacher when the booking is still pending payment", async () => {
    prismaMock.lessonProduct.findFirst.mockResolvedValue({
      id: "lp-std-30",
      tier: LessonTier.STANDARD,
      active: true,
      durationMin: 30,
      nameEn: "Standard 30",
      nameJa: "標準 30",
    });
    prismaMock.teacherProfile.findFirst.mockResolvedValue({
      id: "teacher-profile-1",
      userId: "teacher-user-1",
      offersFreeTrial: true,
      rateYen: 3000,
      lessonOfferings: [
        {
          id: "off-1",
          durationMin: 30,
          rateYen: 3500,
          isGroup: false,
          active: true,
          lessonType: "grammar",
        },
      ],
      availabilitySlots: [{ timezone: "Asia/Tokyo" }],
      user: { email: "teacher@example.com" },
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
            quotedPriceYen: 3500,
            startsAt,
            endsAt: new Date(startsAt.getTime() + 30 * 60 * 1000),
            lessonProduct: { nameEn: "Standard 30", nameJa: "標準 30" },
            teacher: { user: { email: "teacher@example.com" } },
          }),
        },
      }),
    );

    const res = await POST(
      new Request("http://localhost/api/bookings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          lessonProductId: "lp-std-30",
          teacherProfileId: "teacher-profile-1",
          startsAt: startsAt.toISOString(),
        }),
      }),
    );
    expect(res.status).toBe(200);

    const teacherCalls = createUserNotificationMock.mock.calls.filter(
      (c) => (c[0] as { userId: string }).userId === "teacher-user-1",
    );
    expect(teacherCalls).toHaveLength(0);
  });
});
