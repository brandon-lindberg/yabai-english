import { describe, expect, test } from "vitest";
import {
  ALL_LESSON_TYPES_KEY,
  filterSlotsForSelection,
  slotMatchesProduct,
} from "@/lib/booking-lesson-type-filter";

describe("booking lesson-type filter", () => {
  test("ALL_LESSON_TYPES_KEY is a stable sentinel value", () => {
    expect(ALL_LESSON_TYPES_KEY).toBe("__all__");
  });

  test("slotMatchesProduct allows a matching non-custom lesson type", () => {
    expect(
      slotMatchesProduct(
        { lessonType: "conversation" },
        { teacherLessonType: "conversation" },
      ),
    ).toBe(true);
  });

  test("slotMatchesProduct rejects when lesson types differ", () => {
    expect(
      slotMatchesProduct(
        { lessonType: "pronunciation" },
        { teacherLessonType: "conversation" },
      ),
    ).toBe(false);
  });

  test("slotMatchesProduct compares trimmed/lowercase custom labels", () => {
    expect(
      slotMatchesProduct(
        { lessonType: "custom", lessonTypeCustom: "  Interview Prep  " },
        { teacherLessonType: "custom", teacherLessonTypeCustom: "interview prep" },
      ),
    ).toBe(true);
  });

  test("slotMatchesProduct falls back to allowing the slot when metadata is missing", () => {
    expect(slotMatchesProduct({}, { teacherLessonType: "conversation" })).toBe(true);
    expect(slotMatchesProduct({ lessonType: "conversation" }, {})).toBe(true);
  });

  test("filterSlotsForSelection returns all slots when selection is undefined (All)", () => {
    const slots = [
      { lessonType: "conversation" },
      { lessonType: "pronunciation" },
    ];
    expect(filterSlotsForSelection(slots, undefined)).toEqual(slots);
  });

  test("filterSlotsForSelection hides slots with a non-matching lesson type", () => {
    const slots = [
      { lessonType: "conversation", id: "a" },
      { lessonType: "pronunciation", id: "b" },
    ];
    expect(
      filterSlotsForSelection(slots, { teacherLessonType: "pronunciation" }),
    ).toEqual([{ lessonType: "pronunciation", id: "b" }]);
  });
});
