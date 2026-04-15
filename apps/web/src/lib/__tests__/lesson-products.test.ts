import { describe, expect, test } from "vitest";
import { LessonTier } from "@prisma/client";
import { canTeacherOfferProduct, filterLessonProductsForTeacher } from "@/lib/lesson-products";

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
});
