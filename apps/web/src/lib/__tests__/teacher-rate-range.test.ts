import { describe, expect, test } from "vitest";
import {
  formatYenRange,
  getTeacherRateRange,
  getTeacherRateRangeByType,
} from "@/lib/teacher-rate-range";

describe("getTeacherRateRange", () => {
  test("returns min and max across active offerings", () => {
    expect(
      getTeacherRateRange(
        [
          { active: true, rateYen: 3500 },
          { active: true, rateYen: 5200 },
          { active: true, rateYen: 4200 },
        ],
        null,
      ),
    ).toEqual({ minYen: 3500, maxYen: 5200 });
  });

  test("ignores inactive and invalid rates", () => {
    expect(
      getTeacherRateRange(
        [
          { active: false, rateYen: 1200 },
          { active: true, rateYen: 0 },
          { active: true, rateYen: -10 },
          { active: true, rateYen: 4400 },
        ],
        null,
      ),
    ).toEqual({ minYen: 4400, maxYen: 4400 });
  });

  test("falls back to profile rate when no active offerings", () => {
    expect(getTeacherRateRange([], 3000)).toEqual({ minYen: 3000, maxYen: 3000 });
  });

  test("returns null when no valid rates", () => {
    expect(getTeacherRateRange([], null)).toBeNull();
  });

  test("splits individual and group ranges", () => {
    const offerings = [
      { active: true, rateYen: 3500, isGroup: false },
      { active: true, rateYen: 5200, isGroup: false },
      { active: true, rateYen: 7000, isGroup: true },
      { active: true, rateYen: 9000, isGroup: true },
    ];
    expect(getTeacherRateRangeByType(offerings, "individual", 3000)).toEqual({
      minYen: 3500,
      maxYen: 5200,
    });
    expect(getTeacherRateRangeByType(offerings, "group")).toEqual({
      minYen: 7000,
      maxYen: 9000,
    });
  });

  test("formats ranges to display text", () => {
    expect(formatYenRange(null)).toBe("JPY —");
    expect(formatYenRange({ minYen: 3500, maxYen: 3500 })).toBe("JPY 3,500");
    expect(formatYenRange({ minYen: 3500, maxYen: 5200 })).toBe("JPY 3,500 - 5,200");
  });
});
