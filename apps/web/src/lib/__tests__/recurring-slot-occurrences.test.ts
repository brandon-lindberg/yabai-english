import { describe, expect, test } from "vitest";
import { expandWeeklyOccurrencesInRange } from "@/lib/recurring-slot-occurrences";

describe("expandWeeklyOccurrencesInRange", () => {
  test("returns weekly occurrences within the inclusive range", () => {
    // Monday 9:00-10:00 JST, range Apr 20 (Mon) to May 4 (Mon)
    const occ = expandWeeklyOccurrencesInRange(
      { dayOfWeek: 1, startMin: 540, endMin: 600, timezone: "Asia/Tokyo" },
      new Date("2026-04-20T00:00:00+09:00"),
      new Date("2026-05-04T23:59:59+09:00"),
    );
    expect(occ.length).toBe(3);
    expect(occ[0].startsAtIso).toBe("2026-04-20T00:00:00.000Z");
    expect(occ[0].endsAtIso).toBe("2026-04-20T01:00:00.000Z");
    expect(occ[1].startsAtIso).toBe("2026-04-27T00:00:00.000Z");
    expect(occ[2].startsAtIso).toBe("2026-05-04T00:00:00.000Z");
  });

  test("returns empty when no matching weekday in range", () => {
    // Tuesday slot, range only covers Monday
    const occ = expandWeeklyOccurrencesInRange(
      { dayOfWeek: 2, startMin: 540, endMin: 600, timezone: "Asia/Tokyo" },
      new Date("2026-04-20T00:00:00+09:00"),
      new Date("2026-04-20T23:59:59+09:00"),
    );
    expect(occ).toEqual([]);
  });

  test("converts local timezone to UTC ISO output", () => {
    // 10:00 JST == 01:00 UTC
    const occ = expandWeeklyOccurrencesInRange(
      { dayOfWeek: 1, startMin: 600, endMin: 660, timezone: "Asia/Tokyo" },
      new Date("2026-05-04T00:00:00+09:00"),
      new Date("2026-05-04T23:59:59+09:00"),
    );
    expect(occ).toHaveLength(1);
    expect(occ[0].startsAtIso).toBe("2026-05-04T01:00:00.000Z");
    expect(occ[0].endsAtIso).toBe("2026-05-04T02:00:00.000Z");
  });

  test("handles Sunday (dayOfWeek 0) correctly", () => {
    // Sunday slot, range over a weekend
    const occ = expandWeeklyOccurrencesInRange(
      { dayOfWeek: 0, startMin: 600, endMin: 660, timezone: "UTC" },
      new Date("2026-05-03T00:00:00Z"), // Sunday
      new Date("2026-05-09T23:59:59Z"),
    );
    expect(occ).toHaveLength(1);
    expect(occ[0].startsAtIso).toBe("2026-05-03T10:00:00.000Z");
  });
});
