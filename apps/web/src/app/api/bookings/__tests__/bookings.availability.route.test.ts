import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
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
    freeTrialRedemption: { findUnique: vi.fn(), create: vi.fn() },
    user: { findUnique: vi.fn() },
    $transaction: vi.fn(),
  },
}));

vi.mock("@/auth", () => ({
  auth: authMock,
}));

vi.mock("@/lib/prisma", () => ({
  prisma: prismaMock,
}));

vi.mock("@/lib/notifications", () => ({ createUserNotification: vi.fn() }));

vi.mock("next/cache", () => ({
  revalidatePath: vi.fn(),
}));

import { POST } from "@/app/api/bookings/route";

const BOOKING_NOW = new Date("2026-07-01T00:00:00.000Z");

describe("POST /api/bookings availability matching", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Pin "now" so the hardcoded booking date below stays >48h in the future.
    vi.useFakeTimers();
    vi.setSystemTime(BOOKING_NOW);
    authMock.mockResolvedValue({ user: { id: "student-1", role: "STUDENT" } });
    prismaMock.lessonProduct.findFirst.mockResolvedValue({
      id: "lp-40",
      tier: LessonTier.STANDARD,
      active: true,
      durationMin: 40,
      nameEn: "Standard 40",
      nameJa: "標準 40",
    });
    prismaMock.teacherProfile.findFirst.mockResolvedValue({
      id: "teacher-profile-1",
      userId: "teacher-user-1",
      offersFreeTrial: true,
      marketplaceHidden: false,
      rateYen: 3000,
      user: { email: "teacher@example.com", organizationMemberships: [] },
      lessonOfferings: [
        {
          id: "offer-40",
          durationMin: 40,
          rateYen: 3500,
          isGroup: false,
          active: true,
          classTypeId: "ty-conv",
          classType: null,
        },
      ],
      availabilitySlots: [
        {
          id: "slot-1",
          dayOfWeek: 0,
          startMin: 10 * 60 + 30,
          endMin: 11 * 60 + 10,
          timezone: "Asia/Tokyo",
          recurrence: "WEEKLY",
          startsOn: new Date("2026-06-20T15:00:00.000Z"),
          endsOn: null,
          classLevelId: null,
          classTypeId: "ty-conv",
          teacherLessonOfferingId: "offer-40",
        },
      ],
      availabilityOccurrenceSkips: [],
    });
    prismaMock.teacherRosterEntry.findFirst.mockResolvedValue(null);
    prismaMock.chatThread.findUnique.mockResolvedValue(null);
    prismaMock.booking.findFirst.mockResolvedValue(null);
    prismaMock.schoolScheduleSlot.findMany.mockResolvedValue([]);
    prismaMock.teacherStudentLessonRate.findUnique.mockResolvedValue(null);
    prismaMock.user.findUnique.mockResolvedValue({
      id: "student-1",
      email: "student@example.com",
      studentProfile: { timezone: "Asia/Tokyo" },
    });
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  test("rejects UTC-clock payloads that do not match the teacher-local availability instant", async () => {
    // 10:30 UTC is 19:30 JST — the slot is 10:30 *JST*, so this must not match.
    const res = await POST(
      new Request("http://localhost/api/bookings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          lessonProductId: "lp-40",
          teacherProfileId: "teacher-profile-1",
          teacherLessonOfferingId: "offer-40",
          startsAt: "2026-07-05T10:30:00.000Z",
        }),
      }),
    );

    expect(res.status).toBe(409);
    await expect(res.json()).resolves.toEqual({
      error: "The selected time is not available.",
    });
    expect(prismaMock.$transaction).not.toHaveBeenCalled();
  });

  test("an abandoned reservation stops blocking its slot after three hours", async () => {
    // Returning a clash makes the route answer 409 right after the query we
    // care about, so the assertion does not depend on the rest of the flow.
    prismaMock.booking.findFirst.mockResolvedValue({ id: "clashing-booking" });

    const res = await POST(
      new Request("http://localhost/api/bookings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          lessonProductId: "lp-40",
          teacherProfileId: "teacher-profile-1",
          teacherLessonOfferingId: "offer-40",
          // 10:30 JST, matching the seeded availability slot.
          startsAt: "2026-07-05T01:30:00.000Z",
        }),
      }),
    );

    expect(res.status).toBe(409);
    const conflictCall = prismaMock.booking.findFirst.mock.calls[0]?.[0] as {
      where: { OR?: unknown; status?: unknown };
    };

    // Confirmed lessons always hold their slot; unpaid ones only inside the
    // three-hour payment window, so an abandoned checkout frees the slot on its
    // own rather than holding it until somebody cancels by hand.
    expect(conflictCall.where.status).toBeUndefined();
    expect(conflictCall.where.OR).toEqual([
      { status: "CONFIRMED" },
      { status: "PENDING_PAYMENT", holdExpiresAt: { gte: BOOKING_NOW } },
    ]);
  });


  test("refuses a slot another student has it reserved", async () => {
    prismaMock.teacherProfile.findFirst.mockResolvedValue({
      ...(await prismaMock.teacherProfile.findFirst()),
      availabilitySlots: [
        {
          id: "slot-reserved",
          dayOfWeek: 0,
          startMin: 10 * 60 + 30,
          endMin: 11 * 60 + 10,
          timezone: "Asia/Tokyo",
          recurrence: "WEEKLY",
          startsOn: null,
          endsOn: null,
          classLevelId: "lvl-int",
          classTypeId: "ty-conv",
          teacherLessonOfferingId: "offer-40",
          // Reserved for somebody else entirely.
          assignedStudentId: "student-someone-else",
          teacherLessonOffering: { id: "offer-40", durationMin: 40, lessonProductId: "lp-40" },
        },
      ],
    });

    const res = await POST(
      new Request("http://localhost/api/bookings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          lessonProductId: "lp-40",
          teacherProfileId: "teacher-profile-1",
          teacherLessonOfferingId: "offer-40",
          startsAt: "2026-07-05T01:30:00.000Z",
        }),
      }),
    );

    // Hiding it in the calendar is not enough: the endpoint must refuse it, and
    // say only that the time is unavailable — never that it is spoken for.
    expect(res.status).toBe(409);
    await expect(res.json()).resolves.toEqual({
      error: "The selected time is not available.",
    });
  });

});
