// @vitest-environment jsdom

import { describe, expect, test, vi } from "vitest";
import { fireEvent, render } from "@testing-library/react";
import { buildWeekDays } from "@/lib/slot-calendar";
import { placeSlotsOnWeekGrid } from "@/lib/time-grid-week";
import { TeacherAvailabilityTimeGridWeek } from "../teacher-availability-time-grid-week";

describe("TeacherAvailabilityTimeGridWeek", () => {
  test("renders a positioned block and selects it on click", () => {
    const weekDays = buildWeekDays(new Date(2026, 5, 10, 12, 0, 0).toISOString(), "en-US");
    const wed = weekDays[2]!.dayKey;
    const start = new Date(`${wed}T14:00:00`);
    const end = new Date(`${wed}T15:00:00`);
    const slots = [
      {
        startsAtIso: start.toISOString(),
        endsAtIso: end.toISOString(),
        groupKey: "slot-a",
        label: "x",
      },
    ];
    const blocksByDay = placeSlotsOnWeekGrid(
      weekDays.map((d) => d.dayKey),
      slots,
    );

    const onSelect = vi.fn();
    const onAnchor = vi.fn();

    const { getAllByTestId } = render(
      <TeacherAvailabilityTimeGridWeek
        locale="en-US"
        weekDays={weekDays}
        blocksByDay={blocksByDay}
        selectedStartsAtIso={null}
        selectedGroupKey={null}
        onSelectSlot={onSelect}
        onCalendarAnchorChange={onAnchor}
        selectionStyle="neutral"
      />,
    );

    const blocks = getAllByTestId("time-grid-block");
    expect(blocks.length).toBeGreaterThanOrEqual(1);
    const target = blocks.find((el) => el.getAttribute("data-starts-at") === start.toISOString());
    expect(target).toBeTruthy();
    fireEvent.click(target!);

    expect(onSelect).toHaveBeenCalledWith(start.toISOString(), "slot-a");
    expect(onAnchor).toHaveBeenCalledWith(start.toISOString());
  });
});
