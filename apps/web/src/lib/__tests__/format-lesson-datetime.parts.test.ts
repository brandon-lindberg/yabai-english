import { describe, expect, test } from "vitest";
import {
  formatLessonRange,
  formatLessonRangeParts,
} from "@/lib/format-lesson-datetime";

const TZ = "Asia/Tokyo";
const start = "2026-08-23T01:30:00.000Z"; // 10:30 JST
const end = "2026-08-23T02:10:00.000Z"; //   11:10 JST

describe("formatLessonRangeParts", () => {
  test("separates the date from the time so each can be sized on its own", () => {
    const parts = formatLessonRangeParts(start, end, "en", TZ);

    expect(parts.date).toBe("Aug 23, 2026");
    expect(parts.time).toBe("10:30 AM — 11:10 AM");
  });

  // A lesson crossing midnight cannot state one date, so there is no separate
  // date to promote — the caller gets the whole thing as the time part.
  test("keeps a cross-midnight range whole, with no standalone date", () => {
    const parts = formatLessonRangeParts(
      "2026-08-23T14:30:00.000Z", // 23:30 JST
      "2026-08-23T15:30:00.000Z", // 00:30 JST next day
      "en",
      TZ,
    );

    expect(parts.date).toBeNull();
    expect(parts.time).toContain("—");
  });

  test("sets in Japanese too", () => {
    const parts = formatLessonRangeParts(start, end, "ja", TZ);

    expect(parts.date).toBeTruthy();
    expect(parts.time).toContain("10:30");
  });
});

describe("formatLessonRange still reads as one line", () => {
  // The combined string is used across lesson rows and summaries; splitting the
  // implementation must not change what those surfaces render.
  test("composes from the same parts it always did", () => {
    const parts = formatLessonRangeParts(start, end, "en", TZ);

    expect(formatLessonRange(start, end, "en", TZ)).toBe(`${parts.date} · ${parts.time}`);
  });

  test("is unchanged for a cross-midnight range", () => {
    const s = "2026-08-23T14:30:00.000Z";
    const e = "2026-08-23T15:30:00.000Z";

    expect(formatLessonRange(s, e, "en", TZ)).toBe(formatLessonRangeParts(s, e, "en", TZ).time);
  });
});
