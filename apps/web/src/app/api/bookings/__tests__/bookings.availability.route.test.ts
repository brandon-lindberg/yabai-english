import { beforeEach, describe, expect, test, vi } from "vitest";
import { LessonTier } from "@/generated/prisma/client";

const { authMock, prismaMock } = vi.hoisted(() => ({
  authMock: vi.fn(),
  prismaMock: {
    lessonProduct: { findFirst: vi.fn() },
    teacherProfile: { findFirst: vi.fn() },
    teacherRosterEntry: { findFirst: vi.fn() },
  },
}));

vi.mock("@/auth", () => ({
  auth: authMock,
}));

vi.mock("@/lib/prisma", () => ({
  prisma: prismaMock,
}));

vi.mock("next/cache", () => ({
  revalidatePath: vi.fn(),
}));

import { POST } from "@/app/api/bookings/route";

describe("POST /api/bookings availability matching", () => {
  beforeEach(() => {
    vi.clearAllMocks();
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
          dayOfWeek: 0,
          startMin: 10 * 60 + 30,
          endMin: 11 * 60 + 10,
          timezone: "Asia/Tokyo",
          recurrence: "WEEKLY",
          startsOn: new Date("2026-06-20T15:00:00.000Z"),
          endsOn: null,
          classTypeId: "ty-conv",
          teacherLessonOfferingId: "offer-40",
        },
      ],
      availabilityOccurrenceSkips: [],
    });
    prismaMock.teacherRosterEntry.findFirst.mockResolvedValue(null);
  });

  test("rejects UTC-clock payloads that do not match the teacher-local availability instant", async () => {
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
      error: "Selected time is no longer available.",
    });
  });
});
