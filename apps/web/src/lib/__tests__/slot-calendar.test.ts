import { describe, expect, test } from "vitest";
import {
  buildMonthCells,
  buildWeekDays,
  buildWeekdayColumnHeaders,
  dayKeyFromIso,
  groupSlotsByDay,
  hasSlotMatchingAnchorDay,
} from "@/lib/slot-calendar";
import { shiftCalendarAnchor } from "@/lib/calendar-view";

describe("hasSlotMatchingAnchorDay", () => {
  test("is true when a slot shares the anchor's local calendar day", () => {
    const slotIso = "2026-04-20T01:00:00.000Z";
    const key = dayKeyFromIso(slotIso);
    expect(hasSlotMatchingAnchorDay([{ startsAtIso: slotIso }], `${key}T15:00:00`)).toBe(
      true,
    );
  });

  test("is false when no slot falls on the anchor day", () => {
    const slotIso = "2026-04-20T01:00:00.000Z";
    const key = dayKeyFromIso(slotIso);
    const d = new Date(`${key}T12:00:00`);
    d.setDate(d.getDate() + 1);
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    const nextKey = `${y}-${m}-${day}`;
    expect(hasSlotMatchingAnchorDay([{ startsAtIso: slotIso }], `${nextKey}T12:00:00`)).toBe(
      false,
    );
  });
});

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
});
