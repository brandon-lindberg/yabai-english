// @vitest-environment jsdom

import { describe, expect, test, vi } from "vitest";
import { fireEvent, render } from "@testing-library/react";
import { placeSlotsOnDayColumn } from "@/lib/time-grid-week";
import { buildWeekDays } from "@/lib/slot-calendar";
import { TeacherAvailabilityTimeGridDay } from "../teacher-availability-time-grid-day";

describe("TeacherAvailabilityTimeGridDay", () => {
  test("clicking a block selects it", () => {
    const weekDays = buildWeekDays(new Date(2026, 5, 10, 12, 0, 0).toISOString(), "en-US");
    const wed = weekDays[2]!.dayKey;
    const start = new Date(`${wed}T10:00:00`);
    const end = new Date(`${wed}T10:30:00`);
    const slots = [
      {
        startsAtIso: start.toISOString(),
        endsAtIso: end.toISOString(),
        groupKey: "r1",
        label: "x",
      },
    ];
    const blocks = placeSlotsOnDayColumn(wed, slots);
    const onSelect = vi.fn();
    const onAnchor = vi.fn();

    const { getAllByTestId } = render(
      <TeacherAvailabilityTimeGridDay
        locale="en-US"
        dayKey={wed}
        dayHeading="Wednesday, June 10, 2026"
        blocks={blocks}
        selectedStartsAtIso={null}
        selectedGroupKey={null}
        onSelectSlot={onSelect}
        onCalendarAnchorChange={onAnchor}
        selectionStyle="neutral"
        emptyLabel="Empty day"
      />,
    );

    fireEvent.click(getAllByTestId("time-grid-day-block")[0]!);
    expect(onSelect).toHaveBeenCalledWith(start.toISOString(), "r1");
    expect(onAnchor).toHaveBeenCalledWith(start.toISOString());
  });
});
