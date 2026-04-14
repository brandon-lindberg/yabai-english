// @vitest-environment jsdom

import { describe, expect, test, vi } from "vitest";
import { fireEvent, render } from "@testing-library/react";
import { SlotSelectionCalendar } from "../slot-selection-calendar";

const copy = {
  noAvailabilityYet: "None",
  unavailableShort: "—",
  calendarDay: "Day",
  calendarWeek: "Week",
  calendarMonth: "Month",
  previous: "Prev",
  next: "Next",
};

describe("SlotSelectionCalendar", () => {
  test("month day invokes onMonthDayClick instead of changing view when provided", () => {
    const onMonthDayClick = vi.fn();
    const onCalendarViewChange = vi.fn();

    render(
      <SlotSelectionCalendar
        locale="en-US"
        copy={copy}
        slots={[]}
        calendarView="month"
        onCalendarViewChange={onCalendarViewChange}
        calendarAnchor="2026-04-15T12:00:00.000Z"
        onCalendarAnchorChange={vi.fn()}
        selectedStartsAtIso={null}
        onSelectSlot={vi.fn()}
        onMonthDayClick={onMonthDayClick}
      />,
    );

    const cell = document.querySelector('[data-day-key="2026-04-08"]');
    expect(cell).toBeTruthy();
    fireEvent.click(cell!);

    expect(onMonthDayClick).toHaveBeenCalledWith("2026-04-08");
    expect(onCalendarViewChange).not.toHaveBeenCalled();
  });
});
