import { describe, expect, test, vi } from "vitest";
import {
  countTierEligiblePaidLessonsForPeriod,
  evaluateTierTransition,
  getTeacherTierPeriodBounds,
  resolveRecommendedTeacherTier,
} from "@/lib/teacher-tiers";

describe("teacher tier period bounds", () => {
  test("uses teacher-anniversary months in Asia/Tokyo", () => {
    expect(
      getTeacherTierPeriodBounds({
        firstPaidLessonAt: new Date("2026-01-15T03:00:00.000Z"),
        periodIndex: 1,
        months: 3,
      }),
    ).toEqual({
      periodStart: new Date("2026-04-15T03:00:00.000Z"),
      periodEnd: new Date("2026-07-15T03:00:00.000Z"),
      periodTimeZone: "Asia/Tokyo",
    });
  });

  test("handles month-end anniversaries consistently", () => {
    expect(
      getTeacherTierPeriodBounds({
        firstPaidLessonAt: new Date("2026-01-31T15:00:00.000Z"),
        periodIndex: 0,
        months: 3,
      }),
    ).toEqual({
      periodStart: new Date("2026-01-31T15:00:00.000Z"),
      periodEnd: new Date("2026-04-30T15:00:00.000Z"),
      periodTimeZone: "Asia/Tokyo",
    });
  });
});

describe("resolveRecommendedTeacherTier", () => {
  test.each([
    [0, "TIER_1"],
    [5, "TIER_1"],
    [5.01, "TIER_2"],
    [10, "TIER_2"],
    [10.01, "TIER_3"],
  ] as const)("maps average %s to %s", (averageLessons, expected) => {
    expect(resolveRecommendedTeacherTier(averageLessons)).toBe(expected);
  });
});

describe("evaluateTierTransition", () => {
  test("quarterly evaluation only applies upgrades", () => {
    expect(
      evaluateTierTransition({
        currentTier: "TIER_1",
        recommendedTier: "TIER_2",
        kind: "QUARTERLY",
      }),
    ).toEqual({ status: "APPLIED", appliedTier: "TIER_2" });

    expect(
      evaluateTierTransition({
        currentTier: "TIER_3",
        recommendedTier: "TIER_1",
        kind: "QUARTERLY",
      }),
    ).toEqual({ status: "NO_CHANGE", appliedTier: "TIER_3" });
  });

  test("annual lower recommendation requires admin approval", () => {
    expect(
      evaluateTierTransition({
        currentTier: "TIER_3",
        recommendedTier: "TIER_1",
        kind: "ANNUAL",
      }),
    ).toEqual({ status: "PENDING_ADMIN_APPROVAL", appliedTier: null });
  });
});

describe("countTierEligiblePaidLessonsForPeriod", () => {
  test("counts only paid, booked, non-refunded lessons", async () => {
    const count = vi.fn().mockResolvedValue(8);

    await expect(
      countTierEligiblePaidLessonsForPeriod(
        { payment: { count } },
        {
          teacherId: "teacher-1",
          periodStart: new Date("2026-04-01T00:00:00.000Z"),
          periodEnd: new Date("2026-05-01T00:00:00.000Z"),
        },
      ),
    ).resolves.toBe(8);

    expect(count).toHaveBeenCalledWith({
      where: {
        teacherId: "teacher-1",
        status: "SUCCEEDED",
        bookingId: { not: null },
        amountYen: { gt: 0 },
        paidAt: {
          gte: new Date("2026-04-01T00:00:00.000Z"),
          lt: new Date("2026-05-01T00:00:00.000Z"),
        },
        refunds: { none: { status: "SUCCEEDED" } },
      },
    });
  });
});
