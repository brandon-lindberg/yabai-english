import { describe, expect, test } from "vitest";
import { luxonWeekdayMod7FromDayKey } from "@/lib/availability-editor";

describe("luxonWeekdayMod7FromDayKey", () => {
  test("Monday in Asia/Tokyo is 1", () => {
    expect(luxonWeekdayMod7FromDayKey("2026-01-05", "Asia/Tokyo")).toBe(1);
  });

  test("Sunday in Asia/Tokyo is 0", () => {
    expect(luxonWeekdayMod7FromDayKey("2026-01-11", "Asia/Tokyo")).toBe(0);
  });
});
