import { describe, expect, test } from "vitest";
import {
  lessonOfferingCreateData,
  lessonOfferingInputSchema,
  lessonOfferingRateError,
  normalizeLessonOfferingInput,
} from "@/lib/teacher-lesson-offering-input";

const privateClass = {
  durationMin: 60,
  rateYen: 5000,
  isGroup: false as const,
  groupSize: null,
  classLevelId: "lvl-1",
  classTypeId: "ty-1",
};

const groupClass = {
  ...privateClass,
  isGroup: true as const,
  groupSize: 4,
  groupTotalRateYen: 16_000,
};

describe("normalizeLessonOfferingInput", () => {
  test("leaves a private lesson's price alone", () => {
    expect(normalizeLessonOfferingInput(privateClass)).toMatchObject({
      rateYen: 5000,
      groupTotalRateYen: null,
    });
  });

  // Two numbers claiming to describe one price is a bug waiting to happen.
  test("divides the class total itself rather than trusting the share sent", () => {
    expect(
      normalizeLessonOfferingInput({ ...groupClass, rateYen: 99_999 }),
    ).toMatchObject({ rateYen: 4000, groupTotalRateYen: 16_000 });
  });

  test("rounds the share up on an uneven split", () => {
    expect(
      normalizeLessonOfferingInput({ ...groupClass, groupSize: 3, groupTotalRateYen: 10_000 }),
    ).toMatchObject({ rateYen: 3334 });
  });

  test("a group class with no total keeps the share it was given", () => {
    expect(
      normalizeLessonOfferingInput({ ...groupClass, groupTotalRateYen: undefined }),
    ).toMatchObject({ rateYen: 5000, groupTotalRateYen: null });
  });
});

describe("lessonOfferingRateError", () => {
  test("accepts a price on the floor", () => {
    expect(lessonOfferingRateError({ rateYen: 3000 })).toBeNull();
  });

  // The floor is the share, so a generous-looking total can still be refused.
  test("refuses a share under the floor", () => {
    const share = normalizeLessonOfferingInput({ ...groupClass, groupTotalRateYen: 8000 });
    expect(share.rateYen).toBe(2000);
    expect(lessonOfferingRateError(share)).toMatch(/3,000/);
  });
});

describe("lessonOfferingCreateData", () => {
  test("writes a private lesson with no group fields", () => {
    expect(
      lessonOfferingCreateData(normalizeLessonOfferingInput(privateClass), "tp-1"),
    ).toMatchObject({
      teacherId: "tp-1",
      rateYen: 5000,
      isGroup: false,
      groupSize: null,
      groupTotalRateYen: null,
      ratePriceBasis: "TAX_INCLUDED",
      active: true,
    });
  });

  test("writes a group class with its size and total", () => {
    expect(
      lessonOfferingCreateData(normalizeLessonOfferingInput(groupClass), "tp-1"),
    ).toMatchObject({ rateYen: 4000, groupSize: 4, groupTotalRateYen: 16_000 });
  });

  test("keeps the basis the teacher typed in", () => {
    expect(
      lessonOfferingCreateData(
        normalizeLessonOfferingInput({ ...privateClass, ratePriceBasis: "TAX_EXCLUSIVE" }),
        "tp-1",
      ),
    ).toMatchObject({ ratePriceBasis: "TAX_EXCLUSIVE" });
  });
});

describe("lessonOfferingInputSchema", () => {
  test("accepts a well-formed class", () => {
    expect(lessonOfferingInputSchema.safeParse(privateClass).success).toBe(true);
  });

  test("refuses a group of one", () => {
    expect(
      lessonOfferingInputSchema.safeParse({ ...groupClass, groupSize: 1 }).success,
    ).toBe(false);
  });

  test("refuses a class with no level", () => {
    expect(
      lessonOfferingInputSchema.safeParse({ ...privateClass, classLevelId: "" }).success,
    ).toBe(false);
  });
});
