import { describe, expect, test } from "vitest";
import { buildWeekDays } from "@/lib/slot-calendar";
import {
  DAY_VIEW_FOCUS_END_MIN,
  DAY_VIEW_FOCUS_START_MIN,
  MINUTES_PER_DAY,
  TIME_GRID_HEADER_PX,
  focusDayGutterLabels,
  hourGutterLabels,
  initialScrollTopForTimeGrid,
  layoutTimedBlockInFocusWindow,
  minutesSinceLocalMidnight,
  placeSlotsOnDayColumn,
  placeSlotsOnWeekGrid,
} from "@/lib/time-grid-week";

describe("minutesSinceLocalMidnight", () => {
  test("uses the viewer's local clock", () => {
    const d = new Date(2026, 5, 10, 9, 15, 30, 0);
    const iso = d.toISOString();
    expect(minutesSinceLocalMidnight(iso)).toBeCloseTo(9 * 60 + 15 + 0.5, 1);
  });
});

describe("placeSlotsOnWeekGrid", () => {
  test("places a slot on the correct weekday column with proportional height", () => {
    const weekDays = buildWeekDays(new Date(2026, 5, 10, 12, 0, 0).toISOString(), "en-US");
    const keys = weekDays.map((d) => d.dayKey);
    const wed = weekDays[2]!.dayKey;

    const start = new Date(`${wed}T09:00:00`);
    const end = new Date(`${wed}T10:30:00`);
    const map = placeSlotsOnWeekGrid(keys, [
      {
        startsAtIso: start.toISOString(),
        endsAtIso: end.toISOString(),
        groupKey: "rule-1",
        label: "Lesson window",
      },
    ]);

    const blocks = map.get(wed)!;
    expect(blocks).toHaveLength(1);
    expect(blocks[0]!.startMin).toBe(9 * 60);
    expect(blocks[0]!.endMin).toBe(10 * 60 + 30);
    expect(blocks[0]!.topPct).toBeCloseTo((9 * 60 / MINUTES_PER_DAY) * 100, 5);
    expect(blocks[0]!.heightPct).toBeGreaterThanOrEqual((90 / MINUTES_PER_DAY) * 100);
    expect(blocks[0]!.groupKey).toBe("rule-1");
  });

  test("ignores slots that fall outside the visible week", () => {
    const weekDays = buildWeekDays(new Date(2026, 5, 10, 12, 0, 0).toISOString(), "en-US");
    const keys = weekDays.map((d) => d.dayKey);
    const far = new Date(2026, 7, 1, 12, 0, 0);
    const map = placeSlotsOnWeekGrid(keys, [
      {
        startsAtIso: far.toISOString(),
        endsAtIso: new Date(far.getTime() + 3600000).toISOString(),
        label: "x",
      },
    ]);
    expect([...map.values()].every((b) => b.length === 0)).toBe(true);
  });

  test("preserves kind and subtitle for non-availability inputs (e.g. bookings)", () => {
    const weekDays = buildWeekDays(new Date(2026, 5, 10, 12, 0, 0).toISOString(), "en-US");
    const keys = weekDays.map((d) => d.dayKey);
    const wed = weekDays[2]!.dayKey;
    const start = new Date(`${wed}T09:00:00`);
    const end = new Date(`${wed}T09:30:00`);

    const map = placeSlotsOnWeekGrid(keys, [
      {
        startsAtIso: start.toISOString(),
        endsAtIso: end.toISOString(),
        label: "Conversation",
        kind: "booking",
        subtitle: "Alice S.",
      },
    ]);

    const blocks = map.get(wed)!;
    expect(blocks).toHaveLength(1);
    expect(blocks[0]!.kind).toBe("booking");
    expect(blocks[0]!.subtitle).toBe("Alice S.");
  });

  test("clips end to end-of-day when the slot ends on the next local day", () => {
    const weekDays = buildWeekDays(new Date(2026, 5, 10, 12, 0, 0).toISOString(), "en-US");
    const keys = weekDays.map((d) => d.dayKey);
    const wed = weekDays[2]!.dayKey;

    const start = new Date(`${wed}T23:00:00`);
    const end = new Date(start);
    end.setDate(end.getDate() + 1);
    end.setHours(1, 0, 0, 0);

    const map = placeSlotsOnWeekGrid(keys, [
      {
        startsAtIso: start.toISOString(),
        endsAtIso: end.toISOString(),
        label: "overnight",
      },
    ]);

    const blocks = map.get(wed)!;
    expect(blocks).toHaveLength(1);
    expect(blocks[0]!.endMin).toBe(MINUTES_PER_DAY);
  });
});

describe("placeSlotsOnDayColumn", () => {
  test("returns blocks for one calendar day only", () => {
    const weekDays = buildWeekDays(new Date(2026, 5, 10, 12, 0, 0).toISOString(), "en-US");
    const wed = weekDays[2]!.dayKey;
    const start = new Date(`${wed}T11:00:00`);
    const end = new Date(`${wed}T11:45:00`);
    const slots = [
      { startsAtIso: start.toISOString(), endsAtIso: end.toISOString(), label: "a" },
    ];
    expect(placeSlotsOnDayColumn(wed, slots)).toHaveLength(1);
    expect(placeSlotsOnDayColumn(weekDays[0]!.dayKey, slots)).toHaveLength(0);
  });
});

describe("layoutTimedBlockInFocusWindow", () => {
  test("positions a block fully inside the 7am–10pm window", () => {
    const layout = layoutTimedBlockInFocusWindow(10 * 60, 11 * 60);
    expect(layout).not.toBeNull();
    const span = DAY_VIEW_FOCUS_END_MIN - DAY_VIEW_FOCUS_START_MIN;
    expect(layout!.topPct).toBeCloseTo(((10 * 60 - DAY_VIEW_FOCUS_START_MIN) / span) * 100, 5);
    expect(layout!.heightPct).toBeGreaterThan(0);
  });

  test("returns null when the block is entirely before the window", () => {
    expect(layoutTimedBlockInFocusWindow(2 * 60, 3 * 60)).toBeNull();
  });
});

describe("focusDayGutterLabels", () => {
  test("returns one label per hour in the focused span", () => {
    expect(focusDayGutterLabels("en-US")).toHaveLength(15);
  });
});

describe("initialScrollTopForTimeGrid", () => {
  test("offsets by header sync then anchor hour in pixels", () => {
    expect(initialScrollTopForTimeGrid(48, 7)).toBe(TIME_GRID_HEADER_PX + 7 * 48);
  });
});

describe("hourGutterLabels", () => {
  test("returns 24 entries", () => {
    expect(hourGutterLabels("en-US")).toHaveLength(24);
  });
});
