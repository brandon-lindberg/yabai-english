import { describe, expect, test } from "vitest";
import {
  buildMonthCells,
  buildWeekDays,
  buildWeekdayColumnHeaders,
  groupSlotsByDay,
  weekRangeLabel,
} from "@/lib/slot-calendar";
import { shiftCalendarAnchor } from "@/lib/calendar-view";

describe("groupSlotsByDay", () => {
  test("groups slot options by local day key", () => {
    const groups = groupSlotsByDay(
      [
      { startsAtIso: "2026-04-20T01:00:00.000Z", label: "Mon 10:00" },
      { startsAtIso: "2026-04-20T03:00:00.000Z", label: "Mon 12:00" },
      { startsAtIso: "2026-04-21T01:00:00.000Z", label: "Tue 10:00" },
    ],
      "en-US",
    );

    expect(groups.length).toBe(2);
    expect(groups[0].slots).toHaveLength(2);
    expect(groups[1].slots).toHaveLength(1);
  });
});

describe("calendar helpers", () => {
  test("buildWeekDays returns 7 contiguous days", () => {
    const days = buildWeekDays("2026-04-22T09:00:00.000Z", "en-US");
    expect(days).toHaveLength(7);
    expect(days[0].dayKey <= days[6].dayKey).toBe(true);
  });

  test("buildWeekDays starts weeks on Monday", () => {
    const days = buildWeekDays("2026-04-22T09:00:00.000Z", "en-US");
    expect(days[0].dayKey).toBe("2026-04-20");
  });

  test("buildMonthCells returns full 6-week grid", () => {
    const cells = buildMonthCells("2026-04-22T09:00:00.000Z", "en-US");
    expect(cells).toHaveLength(42);
  });

  test("buildWeekdayColumnHeaders uses app locale (Japanese weekdays)", () => {
    const ja = buildWeekdayColumnHeaders("ja");
    expect(ja).toHaveLength(7);
    expect(ja[0]).toBe("月");
  });
});

describe("shiftCalendarAnchor", () => {
  test("moves day anchor by one day", () => {
    const next = shiftCalendarAnchor("2026-04-13T00:00:00.000Z", "day", 1);
    expect(next.startsWith("2026-04-14")).toBe(true);
  });

  test("moves week anchor by one week", () => {
    const next = shiftCalendarAnchor("2026-04-13T00:00:00.000Z", "week", 1);
    expect(next.startsWith("2026-04-20")).toBe(true);
  });

  test("moves month anchor by one month without skipping short months", () => {
    const next = shiftCalendarAnchor("2026-05-31T12:00:00.000Z", "month", 1);
    expect(next.startsWith("2026-06")).toBe(true);
  });

  test("moves month anchor backward from month-end dates", () => {
    const next = shiftCalendarAnchor("2026-03-31T12:00:00.000Z", "month", -1);
    expect(next.startsWith("2026-02")).toBe(true);
  });
});

describe("weekRangeLabel", () => {
  /*
    A week grid shows day numbers and weekday names, which is ambiguous the
    moment the week crosses a month: "Mon 31 · Tue 1" could be any pair of
    months in any year, and reads as a generic timetable rather than a
    particular week.
  */
  test("names both months when the week spans two", () => {
    const label = weekRangeLabel(["2026-08-31", "2026-09-06"], "en-US", "Asia/Tokyo");

    expect(label).toContain("Aug");
    expect(label).toContain("Sep");
  });

  test("carries the year, once", () => {
    const label = weekRangeLabel(["2026-09-07", "2026-09-13"], "en-US", "Asia/Tokyo");

    expect(label.match(/2026/g)).toHaveLength(1);
  });

  test("still names the month when the week sits inside one", () => {
    const label = weekRangeLabel(["2026-09-07", "2026-09-13"], "en-US", "Asia/Tokyo");

    expect(label).toContain("Sep");
  });
});
