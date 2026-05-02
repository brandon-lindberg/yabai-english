import { describe, expect, test } from "vitest";
import {
  expandRecurringOccurrencesInRange,
  expandWeeklyOccurrencesInRange,
} from "@/lib/recurring-slot-occurrences";

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

describe("expandRecurringOccurrencesInRange", () => {
  const baseTime = { startMin: 540, endMin: 600, timezone: "Asia/Tokyo" };

  test("WEEKLY with daysOfWeek expands all selected days", () => {
    // Mon/Wed/Fri 09:00-10:00 JST in week of Apr 20-26 (Mon-Sun)
    const occ = expandRecurringOccurrencesInRange(
      {
        ...baseTime,
        recurrence: "WEEKLY",
        daysOfWeek: [1, 3, 5],
        dayOfWeek: 1,
      },
      new Date("2026-04-20T00:00:00+09:00"),
      new Date("2026-04-26T23:59:59+09:00"),
    );
    const isos = occ.map((o) => o.startsAtIso).sort();
    expect(isos).toEqual([
      "2026-04-20T00:00:00.000Z", // Mon
      "2026-04-22T00:00:00.000Z", // Wed
      "2026-04-24T00:00:00.000Z", // Fri
    ]);
  });

  test("WEEKLY with empty daysOfWeek falls back to single dayOfWeek (back-compat)", () => {
    const occ = expandRecurringOccurrencesInRange(
      {
        ...baseTime,
        recurrence: "WEEKLY",
        daysOfWeek: [],
        dayOfWeek: 2, // Tuesday only
      },
      new Date("2026-04-20T00:00:00+09:00"),
      new Date("2026-04-26T23:59:59+09:00"),
    );
    expect(occ).toHaveLength(1);
    expect(occ[0].startsAtIso).toBe("2026-04-21T00:00:00.000Z"); // Tue
  });

  test("DAILY emits one occurrence per day in range", () => {
    const occ = expandRecurringOccurrencesInRange(
      {
        ...baseTime,
        recurrence: "DAILY",
        daysOfWeek: [],
        dayOfWeek: 1,
      },
      new Date("2026-04-20T00:00:00+09:00"),
      new Date("2026-04-22T23:59:59+09:00"),
    );
    expect(occ).toHaveLength(3);
    expect(occ[0].startsAtIso).toBe("2026-04-20T00:00:00.000Z");
    expect(occ[1].startsAtIso).toBe("2026-04-21T00:00:00.000Z");
    expect(occ[2].startsAtIso).toBe("2026-04-22T00:00:00.000Z");
  });

  test("ONE_OFF emits exactly one occurrence on startsOn", () => {
    const occ = expandRecurringOccurrencesInRange(
      {
        ...baseTime,
        recurrence: "ONE_OFF",
        daysOfWeek: [],
        dayOfWeek: 0,
        startsOn: "2026-04-22", // Wed
      },
      new Date("2026-04-20T00:00:00+09:00"),
      new Date("2026-04-30T23:59:59+09:00"),
    );
    expect(occ).toHaveLength(1);
    expect(occ[0].startsAtIso).toBe("2026-04-22T00:00:00.000Z");
  });

  test("ONE_OFF outside range yields no occurrences", () => {
    const occ = expandRecurringOccurrencesInRange(
      {
        ...baseTime,
        recurrence: "ONE_OFF",
        daysOfWeek: [],
        dayOfWeek: 0,
        startsOn: "2026-05-15",
      },
      new Date("2026-04-20T00:00:00+09:00"),
      new Date("2026-04-30T23:59:59+09:00"),
    );
    expect(occ).toEqual([]);
  });

  test("startsOn / endsOn bounds clip WEEKLY occurrences", () => {
    // Slot is Mon, but bounded to only the week of Apr 27 (no Apr 20 occurrence).
    const occ = expandRecurringOccurrencesInRange(
      {
        ...baseTime,
        recurrence: "WEEKLY",
        daysOfWeek: [1],
        dayOfWeek: 1,
        startsOn: "2026-04-27",
        endsOn: "2026-05-03",
      },
      new Date("2026-04-20T00:00:00+09:00"),
      new Date("2026-05-31T23:59:59+09:00"),
    );
    expect(occ).toHaveLength(1);
    expect(occ[0].startsAtIso).toBe("2026-04-27T00:00:00.000Z");
  });

  test("DAILY honors endsOn upper bound", () => {
    const occ = expandRecurringOccurrencesInRange(
      {
        ...baseTime,
        recurrence: "DAILY",
        daysOfWeek: [],
        dayOfWeek: 1,
        endsOn: "2026-04-21", // inclusive
      },
      new Date("2026-04-20T00:00:00+09:00"),
      new Date("2026-04-30T23:59:59+09:00"),
    );
    expect(occ).toHaveLength(2);
    expect(occ[0].startsAtIso).toBe("2026-04-20T00:00:00.000Z");
    expect(occ[1].startsAtIso).toBe("2026-04-21T00:00:00.000Z");
  });
});
