import { describe, expect, test } from "vitest";
import { formatLessonInstant } from "../format-lesson-datetime";

describe("formatLessonInstant", () => {
  test("uses IANA timeZone when provided (JST)", () => {
    const iso = "2026-05-03T01:30:00.000Z";
    const s = formatLessonInstant(iso, "en-US", "Asia/Tokyo");
    expect(s).toMatch(/10:30/);
    expect(s).toMatch(/May 3, 2026/i);
  });
});
