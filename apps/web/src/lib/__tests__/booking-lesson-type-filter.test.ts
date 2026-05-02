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

  test("slotMatchesProduct allows a matching classTypeId", () => {
    expect(
      slotMatchesProduct(
        { classTypeId: "ty-conv" },
        { teacherClassTypeId: "ty-conv" },
      ),
    ).toBe(true);
  });

  test("slotMatchesProduct rejects when classTypeIds differ", () => {
    expect(
      slotMatchesProduct(
        { classTypeId: "ty-pron" },
        { teacherClassTypeId: "ty-conv" },
      ),
    ).toBe(false);
  });

  test("slotMatchesProduct falls back to allowing the slot when metadata is missing", () => {
    expect(slotMatchesProduct({}, { teacherClassTypeId: "ty-conv" })).toBe(true);
    expect(slotMatchesProduct({ classTypeId: "ty-conv" }, {})).toBe(true);
  });

  test("filterSlotsForSelection returns all slots when selection is undefined (All)", () => {
    const slots = [
      { classTypeId: "ty-conv" },
      { classTypeId: "ty-pron" },
    ];
    expect(filterSlotsForSelection(slots, undefined)).toEqual(slots);
  });

  test("filterSlotsForSelection hides slots with a non-matching classTypeId", () => {
    const slots = [
      { classTypeId: "ty-conv" },
      { classTypeId: "ty-pron" },
    ];
    expect(
      filterSlotsForSelection(slots, { teacherClassTypeId: "ty-pron" }),
    ).toEqual([{ classTypeId: "ty-pron" }]);
  });
});
