import { describe, expect, test } from "vitest";
import { LessonTier } from "@prisma/client";
import {
  canTeacherOfferProduct,
  filterLessonProductsForTeacher,
  filterProductsByIndividualOfferings,
  resolveTeacherRateForDuration,
} from "@/lib/lesson-products";

describe("lesson product availability by teacher", () => {
  test("filters out free trial when teacher does not offer it", () => {
    const products = [
      { id: "p1", tier: LessonTier.FREE_TRIAL },
      { id: "p2", tier: LessonTier.STANDARD },
    ];

    const result = filterLessonProductsForTeacher(products, false);

    expect(result).toEqual([{ id: "p2", tier: LessonTier.STANDARD }]);
  });

  test("keeps free trial when teacher offers it", () => {
    const products = [
      { id: "p1", tier: LessonTier.FREE_TRIAL },
      { id: "p2", tier: LessonTier.STANDARD },
    ];

    const result = filterLessonProductsForTeacher(products, true);

    expect(result).toEqual(products);
  });

  test("booking guard rejects free trial when teacher disabled trials", () => {
    expect(canTeacherOfferProduct(LessonTier.FREE_TRIAL, false)).toBe(false);
    expect(canTeacherOfferProduct(LessonTier.STANDARD, false)).toBe(true);
  });

  test("filters lesson products to offered individual durations", () => {
    const products = [
      { id: "p1", tier: LessonTier.STANDARD, durationMin: 30 },
      { id: "p2", tier: LessonTier.STANDARD, durationMin: 60 },
      { id: "p3", tier: LessonTier.FREE_TRIAL, durationMin: 20 },
    ];
    const result = filterProductsByIndividualOfferings(products, [
      { durationMin: 60, rateYen: 4000, isGroup: false, active: true },
    ]);
    expect(result.map((p) => p.id)).toEqual(["p2", "p3"]);
  });

  test("resolves teacher rate by lesson duration", () => {
    expect(
      resolveTeacherRateForDuration(
        [{ durationMin: 40, rateYen: 4500, isGroup: false, active: true }],
        40,
        3000,
      ),
    ).toBe(4500);
  });
});
