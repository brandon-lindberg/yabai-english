import { describe, expect, test } from "vitest";
import { resolveQuotedPriceYen } from "@/lib/booking-price-resolution";
import { LessonTier } from "@/generated/prisma/client";

const product = {
  tier: LessonTier.STANDARD,
  durationMin: 40,
};

describe("resolveQuotedPriceYen", () => {
  test("uses the selected class offer price", () => {
    expect(
      resolveQuotedPriceYen({
        product,
        selectedOffering: {
          id: "offer-1",
          durationMin: 40,
          rateYen: 4200,
          isGroup: false,
          active: true,
          classType: { code: "grammar" },
        },
        fallbackRateYen: 3000,
        studentOverride: null,
      }),
    ).toBe(4200);
  });

  test("uses a student-specific override before the standard class offer price", () => {
    expect(
      resolveQuotedPriceYen({
        product,
        selectedOffering: {
          id: "offer-1",
          durationMin: 40,
          rateYen: 4200,
          isGroup: false,
          active: true,
          classType: { code: "grammar" },
        },
        fallbackRateYen: 3000,
        studentOverride: { rateYen: 3600 },
      }),
    ).toBe(3600);
  });

  test("free trials stay free even if an override exists", () => {
    expect(
      resolveQuotedPriceYen({
        product: { tier: LessonTier.FREE_TRIAL, durationMin: 20 },
        selectedOffering: null,
        fallbackRateYen: 3000,
        studentOverride: { rateYen: 3600 },
      }),
    ).toBe(0);
  });
});
