// @vitest-environment jsdom

import { describe, expect, test, vi } from "vitest";
import { fireEvent, render } from "@testing-library/react";
import { buildMonthCells, buildWeekdayColumnHeaders } from "@/lib/slot-calendar";
import {
  TeacherAvailabilityGoogleMonth,
  type MonthDaySlotChip,
} from "../teacher-availability-google-month";

describe("TeacherAvailabilityGoogleMonth", () => {
  test("clicking a slot chip selects that occurrence", () => {
    const anchor = new Date(2026, 5, 10, 12, 0, 0).toISOString();
    const monthCells = buildMonthCells(anchor, "en-US");
    const headers = buildWeekdayColumnHeaders("en-US");
    const wed = "2026-06-10";
    const start = new Date(`${wed}T14:00:00`);
    const end = new Date(`${wed}T15:00:00`);
    const m = new Map<string, MonthDaySlotChip[]>();
    m.set(wed, [
      {
        startsAtIso: start.toISOString(),
        endsAtIso: end.toISOString(),
        label: "slot",
        groupKey: "rule-1",
      },
    ]);

    const onSelect = vi.fn();
    const onAnchor = vi.fn();

    const { getAllByTestId } = render(
      <TeacherAvailabilityGoogleMonth
        locale="en-US"
        monthWeekdayHeaders={headers}
        monthCells={monthCells}
        slotsByDay={m}
        focusedDayKey={wed}
        selectedStartsAtIso={null}
        selectedGroupKey={null}
        onOpenDay={vi.fn()}
        onSelectSlot={onSelect}
        onCalendarAnchorChange={onAnchor}
        selectionStyle="neutral"
      />,
    );

    const chips = getAllByTestId("month-slot-chip");
    expect(chips.length).toBeGreaterThanOrEqual(1);
    fireEvent.click(chips[0]!);
    expect(onSelect).toHaveBeenCalledWith(start.toISOString(), "rule-1");
    expect(onAnchor).toHaveBeenCalledWith(start.toISOString());
  });
});
