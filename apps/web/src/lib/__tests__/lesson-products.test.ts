import { describe, expect, test } from "vitest";
import { LessonTier } from "@prisma/client";
import {
  canTeacherOfferProduct,
  catalogProductMatchesOffering,
  filterLessonProductsForTeacher,
  filterProductsByIndividualOfferings,
  lessonTypeKeysForCatalogProduct,
  resolveTeacherRateForProduct,
  teacherHasOfferingForProduct,
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

  test("filters lesson products to offered individual durations (legacy null lessonType)", () => {
    const products = [
      { id: "p1", tier: LessonTier.STANDARD, durationMin: 30 },
      { id: "p2", tier: LessonTier.STANDARD, durationMin: 60 },
      { id: "p3", tier: LessonTier.FREE_TRIAL, durationMin: 20 },
    ];
    const result = filterProductsByIndividualOfferings(products, [
      { durationMin: 60, rateYen: 4000, isGroup: false, active: true, lessonType: null },
    ]);
    expect(result.map((p) => p.id)).toEqual(["p2", "p3"]);
  });

  test("filters by lesson focus: conversation 30 maps to EIKAWA, not STANDARD 30", () => {
    const products = [
      { id: "eik", tier: LessonTier.EIKAWA, durationMin: 30 },
      { id: "std", tier: LessonTier.STANDARD, durationMin: 30 },
    ];
    const result = filterProductsByIndividualOfferings(products, [
      {
        durationMin: 30,
        rateYen: 3500,
        isGroup: false,
        active: true,
        lessonType: "conversation",
      },
    ]);
    expect(result.map((p) => p.id)).toEqual(["eik"]);
  });

  test("resolves teacher rate for a specific catalog product", () => {
    expect(
      resolveTeacherRateForProduct(
        [
          {
            durationMin: 40,
            rateYen: 4500,
            isGroup: false,
            active: true,
            lessonType: "grammar",
          },
        ],
        { tier: LessonTier.STANDARD, durationMin: 40 },
        3000,
      ),
    ).toBe(4500);
  });

  test("teacherHasOfferingForProduct requires a matching row for paid products", () => {
    const product = { tier: LessonTier.EIKAWA, durationMin: 30 };
    expect(
      teacherHasOfferingForProduct(
        [
          {
            durationMin: 30,
            rateYen: 3000,
            isGroup: false,
            active: true,
            lessonType: "conversation",
          },
        ],
        product,
      ),
    ).toBe(true);
    expect(
      teacherHasOfferingForProduct(
        [
          {
            durationMin: 30,
            rateYen: 3000,
            isGroup: false,
            active: true,
            lessonType: "grammar",
          },
        ],
        product,
      ),
    ).toBe(false);
  });

  test("FREE_TRIAL booking allowed when any individual rate exists", () => {
    expect(
      teacherHasOfferingForProduct(
        [{ durationMin: 60, rateYen: 5000, isGroup: false, active: true, lessonType: "grammar" }],
        { tier: LessonTier.FREE_TRIAL, durationMin: 20 },
      ),
    ).toBe(true);
  });

  test("group offering can also satisfy paid product availability", () => {
    expect(
      teacherHasOfferingForProduct(
        [{ durationMin: 40, rateYen: 7200, isGroup: true, active: true, lessonType: "conversation" }],
        { tier: LessonTier.STANDARD, durationMin: 40 },
      ),
    ).toBe(true);
  });
});

describe("catalogProductMatchesOffering", () => {
  test("legacy null lessonType matches any product for duration", () => {
    expect(
      catalogProductMatchesOffering(
        { tier: LessonTier.STANDARD, durationMin: 30 },
        { durationMin: 30, rateYen: 1, isGroup: false, active: true, lessonType: null },
      ),
    ).toBe(true);
  });

  test("STANDARD 30 does not match conversation offering", () => {
    expect(
      catalogProductMatchesOffering(
        { tier: LessonTier.STANDARD, durationMin: 30 },
        { durationMin: 30, rateYen: 1, isGroup: false, active: true, lessonType: "conversation" },
      ),
    ).toBe(false);
  });
});

describe("lessonTypeKeysForCatalogProduct", () => {
  test("STANDARD 30 excludes conversation", () => {
    expect(lessonTypeKeysForCatalogProduct(LessonTier.STANDARD, 30)).not.toContain("conversation");
  });
  test("STANDARD 40 includes conversation", () => {
    expect(lessonTypeKeysForCatalogProduct(LessonTier.STANDARD, 40)).toContain("conversation");
  });
});
