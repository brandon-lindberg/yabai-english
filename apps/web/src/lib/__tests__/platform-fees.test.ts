import { describe, expect, test, vi } from "vitest";
import {
  calculateMonthlyPlatformFee,
  calculateTieredPlatformFee,
  getTokyoPaymentMonthBounds,
  countSuccessfulPaidLessonsForFeePeriod,
  resolveEffectiveTeacherTier,
} from "@/lib/platform-fees";

describe("calculateMonthlyPlatformFee", () => {
  test.each([
    [0, 2000, 2000],
    [4, 2000, 2000],
    [5, 1500, 1500],
    [9, 1500, 1500],
    [10, 1000, 1000],
  ])("uses the correct tier for %i prior paid lessons", (priorPaidLessons, rateBps, feeYen) => {
    expect(calculateMonthlyPlatformFee({ amountYen: 10_000, priorPaidLessons })).toEqual({
      feePolicyVersion: "teacher-tiered-monthly-volume-v1",
      teacherTier: "TIER_1",
      paidLessonOrdinal: priorPaidLessons + 1,
      rateBps,
      applicationFeeAmountYen: feeYen,
    });
  });

  test("floors fractional yen fees", () => {
    expect(calculateMonthlyPlatformFee({ amountYen: 3_333, priorPaidLessons: 5 })).toEqual(
      expect.objectContaining({
        rateBps: 1500,
        applicationFeeAmountYen: 499,
      }),
    );
  });
});

describe("calculateTieredPlatformFee", () => {
  test.each([
    ["TIER_1", 0, 2000, 2000],
    ["TIER_1", 5, 1500, 1500],
    ["TIER_1", 10, 1000, 1000],
    ["TIER_2", 0, 1500, 1500],
    ["TIER_2", 9, 1500, 1500],
    ["TIER_2", 10, 1000, 1000],
    ["TIER_3", 0, 1000, 1000],
    ["TIER_3", 20, 1000, 1000],
  ] as const)(
    "uses %s rate schedule for %i prior paid lessons",
    (teacherTier, priorPaidLessons, rateBps, feeYen) => {
      expect(
        calculateTieredPlatformFee({
          amountYen: 10_000,
          priorPaidLessons,
          teacherTier,
        }),
      ).toEqual(
        expect.objectContaining({
          teacherTier,
          paidLessonOrdinal: priorPaidLessons + 1,
          rateBps,
          applicationFeeAmountYen: feeYen,
        }),
      );
    },
  );
});

describe("resolveEffectiveTeacherTier", () => {
  test("uses calculated tier when no active override exists", () => {
    expect(
      resolveEffectiveTeacherTier(
        {
          calculatedTier: "TIER_2",
          overrideTier: null,
          overrideStartsAt: null,
          overrideExpiresAt: null,
        },
        new Date("2026-05-19T00:00:00.000Z"),
      ),
    ).toEqual({ effectiveTier: "TIER_2", overrideActive: false });
  });

  test("active override wins over calculated tier", () => {
    expect(
      resolveEffectiveTeacherTier(
        {
          calculatedTier: "TIER_1",
          overrideTier: "TIER_3",
          overrideStartsAt: new Date("2026-05-01T00:00:00.000Z"),
          overrideExpiresAt: null,
        },
        new Date("2026-05-19T00:00:00.000Z"),
      ),
    ).toEqual({ effectiveTier: "TIER_3", overrideActive: true });
  });

  test("expired override does not affect fees", () => {
    expect(
      resolveEffectiveTeacherTier(
        {
          calculatedTier: "TIER_2",
          overrideTier: "TIER_3",
          overrideStartsAt: new Date("2026-01-01T00:00:00.000Z"),
          overrideExpiresAt: new Date("2026-05-01T00:00:00.000Z"),
        },
        new Date("2026-05-19T00:00:00.000Z"),
      ),
    ).toEqual({ effectiveTier: "TIER_2", overrideActive: false });
  });
});

describe("getTokyoPaymentMonthBounds", () => {
  test("returns UTC bounds for the Asia/Tokyo payment month", () => {
    expect(getTokyoPaymentMonthBounds(new Date("2026-05-31T15:30:00.000Z"))).toEqual({
      periodTimeZone: "Asia/Tokyo",
      periodStart: new Date("2026-05-31T15:00:00.000Z"),
      periodEnd: new Date("2026-06-30T15:00:00.000Z"),
    });
  });
});

describe("countSuccessfulPaidLessonsForFeePeriod", () => {
  test("counts successful paid payments in the teacher's Tokyo payment month", async () => {
    const count = vi.fn().mockResolvedValue(5);

    await expect(
      countSuccessfulPaidLessonsForFeePeriod(
        { payment: { count } },
        {
          teacherId: "teacher-1",
          at: new Date("2026-05-15T00:00:00.000Z"),
        },
      ),
    ).resolves.toBe(5);

    expect(count).toHaveBeenCalledWith({
      where: {
        teacherId: "teacher-1",
        status: "SUCCEEDED",
        paidAt: {
          gte: new Date("2026-04-30T15:00:00.000Z"),
          lt: new Date("2026-05-31T15:00:00.000Z"),
        },
      },
    });
  });
});
