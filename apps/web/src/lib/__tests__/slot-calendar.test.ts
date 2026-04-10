import { describe, expect, test } from "vitest";
import { buildMonthCells, buildWeekDays, groupSlotsByDay } from "@/lib/slot-calendar";
import { shiftCalendarAnchor } from "@/lib/calendar-view";

describe("groupSlotsByDay", () => {
  test("groups slot options by local day key", () => {
    const groups = groupSlotsByDay([
      { startsAtIso: "2026-04-20T01:00:00.000Z", label: "Mon 10:00" },
      { startsAtIso: "2026-04-20T03:00:00.000Z", label: "Mon 12:00" },
      { startsAtIso: "2026-04-21T01:00:00.000Z", label: "Tue 10:00" },
    ]);

    expect(groups.length).toBe(2);
    expect(groups[0].slots).toHaveLength(2);
    expect(groups[1].slots).toHaveLength(1);
  });
});

describe("calendar helpers", () => {
  test("buildWeekDays returns 7 contiguous days", () => {
    const days = buildWeekDays("2026-04-22T09:00:00.000Z");
    expect(days).toHaveLength(7);
    expect(days[0].dayKey <= days[6].dayKey).toBe(true);
  });

  test("buildWeekDays starts weeks on Monday", () => {
    const days = buildWeekDays("2026-04-22T09:00:00.000Z");
    expect(days[0].dayKey).toBe("2026-04-20");
  });

  test("buildMonthCells returns full 6-week grid", () => {
    const cells = buildMonthCells("2026-04-22T09:00:00.000Z");
    expect(cells).toHaveLength(42);
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
});
