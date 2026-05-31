import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import { LessonTier } from "@/generated/prisma/client";
import { buildUpcomingSlotOptions } from "@/lib/availability";

const BOOKING_NOW = new Date("2026-05-10T00:00:00.000Z");
const testAvailabilitySlot = {
  id: "slot-1",
  dayOfWeek: 1,
  startMin: 10 * 60,
  endMin: 11 * 60,
  timezone: "Asia/Tokyo",
  recurrence: "WEEKLY" as const,
  startsOn: null,
  endsOn: null,
  classLevelId: null,
  classTypeId: null,
};

function validBookingStartsAtIso() {
  return buildUpcomingSlotOptions({
    availabilitySlots: [testAvailabilitySlot],
    viewerTimezone: "Asia/Tokyo",
    minimumLeadHours: 48,
    now: BOOKING_NOW,
  })[0]!.startsAtIso;
}

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
vi.mock("@/lib/notifications", () => ({ createUserNotification: vi.fn() }));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));

import { POST } from "@/app/api/bookings/route";

describe("POST /api/bookings slot validation", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(BOOKING_NOW);
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
      marketplaceHidden: false,
      paymentPolicyAcceptedAt: new Date("2026-05-01T00:00:00.000Z"),
      rateYen: 3000,
      lessonOfferings: [
        {
          durationMin: 60,
          rateYen: 5000,
          isGroup: false,
          active: true,
          classType: { code: "grammar" },
        },
      ],
      user: { email: "teacher@example.com", organizationMemberships: [] },
      availabilitySlots: [testAvailabilitySlot],
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
      studentProfile: { trialLessonUsedAt: null, timezone: "Asia/Tokyo" },
    });
    prismaMock.$transaction.mockImplementation(async (cb: (tx: unknown) => Promise<unknown>) =>
      cb({
        studentProfile: { findUnique: vi.fn().mockResolvedValue({ userId: "student-1" }) },
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
        user: { findUnique: vi.fn().mockResolvedValue({ email: "student@example.com" }) },
      }),
    );
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  test("accepts a booking when startsAt matches teacher availability", async () => {
    const res = await POST(
      new Request("http://localhost/api/bookings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          lessonProductId: "lp-60",
          teacherProfileId: "teacher-profile-1",
          startsAt: validBookingStartsAtIso(),
        }),
      }),
    );

    expect(res.status).toBe(200);
    expect(prismaMock.$transaction).toHaveBeenCalled();
  });

  test("returns 409 when startsAt is not on the teacher calendar", async () => {
    const res = await POST(
      new Request("http://localhost/api/bookings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          lessonProductId: "lp-60",
          teacherProfileId: "teacher-profile-1",
          startsAt: "2026-05-19T02:30:00.000Z",
        }),
      }),
    );

    expect(res.status).toBe(409);
    await expect(res.json()).resolves.toEqual({
      error: "The selected time is not available.",
    });
    expect(prismaMock.$transaction).not.toHaveBeenCalled();
  });

  test("returns 409 when the occurrence was skipped", async () => {
    const skippedStartsAt = validBookingStartsAtIso();
    prismaMock.teacherProfile.findFirst.mockResolvedValue({
      id: "teacher-profile-1",
      userId: "teacher-user-1",
      offersFreeTrial: true,
      marketplaceHidden: false,
      paymentPolicyAcceptedAt: new Date("2026-05-01T00:00:00.000Z"),
      rateYen: 3000,
      lessonOfferings: [
        {
          durationMin: 60,
          rateYen: 5000,
          isGroup: false,
          active: true,
          classType: { code: "grammar" },
        },
      ],
      user: { email: "teacher@example.com", organizationMemberships: [] },
      availabilitySlots: [testAvailabilitySlot],
      availabilityOccurrenceSkips: [{ startsAtIso: skippedStartsAt }],
    });

    const res = await POST(
      new Request("http://localhost/api/bookings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          lessonProductId: "lp-60",
          teacherProfileId: "teacher-profile-1",
          startsAt: skippedStartsAt,
        }),
      }),
    );

    expect(res.status).toBe(409);
    await expect(res.json()).resolves.toEqual({
      error: "The selected time is not available.",
    });
  });

  test("returns 409 when lesson duration exceeds the slot window", async () => {
    prismaMock.lessonProduct.findFirst.mockResolvedValue({
      id: "lp-90",
      tier: LessonTier.STANDARD,
      active: true,
      durationMin: 90,
      nameEn: "Standard 90",
      nameJa: "標準 90",
    });
    prismaMock.teacherProfile.findFirst.mockResolvedValue({
      id: "teacher-profile-1",
      userId: "teacher-user-1",
      offersFreeTrial: true,
      marketplaceHidden: false,
      paymentPolicyAcceptedAt: new Date("2026-05-01T00:00:00.000Z"),
      rateYen: 3000,
      lessonOfferings: [
        {
          durationMin: 90,
          rateYen: 7000,
          isGroup: false,
          active: true,
          classType: { code: "grammar" },
        },
      ],
      user: { email: "teacher@example.com", organizationMemberships: [] },
      availabilitySlots: [testAvailabilitySlot],
      availabilityOccurrenceSkips: [],
    });

    const res = await POST(
      new Request("http://localhost/api/bookings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          lessonProductId: "lp-90",
          teacherProfileId: "teacher-profile-1",
          startsAt: validBookingStartsAtIso(),
        }),
      }),
    );

    expect(res.status).toBe(409);
    await expect(res.json()).resolves.toEqual({
      error: "The lesson duration does not fit in the selected time slot.",
    });
  });
});
