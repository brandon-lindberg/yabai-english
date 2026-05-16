import { describe, expect, test, vi } from "vitest";
import {
  calculateMonthlyPlatformFee,
  getTokyoPaymentMonthBounds,
  countSuccessfulPaidLessonsForFeePeriod,
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
      feePolicyVersion: "teacher-monthly-volume-v1",
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
