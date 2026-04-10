import { describe, expect, test } from "vitest";
import { weekdayLabel } from "@/lib/weekdays";

describe("weekdayLabel", () => {
  test("returns English weekday label", () => {
    expect(weekdayLabel(1, "en")).toBe("Monday");
  });

  test("returns Japanese weekday label", () => {
    expect(weekdayLabel(1, "ja")).toBe("月曜日");
  });
});
