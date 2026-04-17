// @vitest-environment jsdom

import { describe, expect, test, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import { dayKeyFromIso } from "@/lib/slot-calendar";
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
  test("renders duplicate startsAtIso slots without React key collisions", () => {
    const errorSpy = vi.spyOn(console, "error").mockImplementation(() => undefined);
    const duplicateIso = "2026-04-20T01:00:00.000Z";
    try {
      const { container } = render(
        <SlotSelectionCalendar
          locale="en-US"
          copy={copy}
          slots={[
            { startsAtIso: duplicateIso, label: "Level A", groupKey: "slot-a" },
            { startsAtIso: duplicateIso, label: "Level B", groupKey: "slot-b" },
          ]}
          calendarView="day"
          onCalendarViewChange={vi.fn()}
          calendarAnchor={duplicateIso}
          onCalendarAnchorChange={vi.fn()}
          selectedStartsAtIso={null}
          onSelectSlot={vi.fn()}
        />,
      );

      expect(container.textContent).toContain("Level A");
      expect(container.textContent).toContain("Level B");
      const keyErrors = errorSpy.mock.calls.filter((call) =>
        call.some(
          (arg) => typeof arg === "string" && /same key|Each child in a list|unique "key"/i.test(arg),
        ),
      );
      expect(keyErrors, JSON.stringify(errorSpy.mock.calls)).toHaveLength(0);
    } finally {
      errorSpy.mockRestore();
    }
  });

  test("day view replacement supersedes default day list", () => {
    render(
      <SlotSelectionCalendar
        locale="en-US"
        copy={copy}
        slots={[]}
        calendarView="day"
        onCalendarViewChange={vi.fn()}
        calendarAnchor="2026-04-15T12:00:00.000Z"
        onCalendarAnchorChange={vi.fn()}
        selectedStartsAtIso={null}
        onSelectSlot={vi.fn()}
        dayViewReplacement={<div data-testid="custom-day">Custom day</div>}
      />,
    );

    expect(screen.getByTestId("custom-day")).toBeInTheDocument();
  });

  test("month view replacement supersedes default month grid", () => {
    render(
      <SlotSelectionCalendar
        locale="en-US"
        copy={copy}
        slots={[]}
        calendarView="month"
        onCalendarViewChange={vi.fn()}
        calendarAnchor="2026-04-15T12:00:00.000Z"
        onCalendarAnchorChange={vi.fn()}
        selectedStartsAtIso={null}
        onSelectSlot={vi.fn()}
        monthViewReplacement={<div data-testid="custom-month">Custom month</div>}
      />,
    );

    expect(screen.getByTestId("custom-month")).toBeInTheDocument();
  });

  test("week view replacement is rendered instead of default week columns", () => {
    render(
      <SlotSelectionCalendar
        locale="en-US"
        copy={copy}
        slots={[]}
        calendarView="week"
        onCalendarViewChange={vi.fn()}
        calendarAnchor="2026-04-15T12:00:00.000Z"
        onCalendarAnchorChange={vi.fn()}
        selectedStartsAtIso={null}
        onSelectSlot={vi.fn()}
        weekViewReplacement={<div data-testid="custom-week">Custom week</div>}
      />,
    );

    expect(screen.getByTestId("custom-week")).toHaveTextContent("Custom week");
  });

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

  test("month view highlights anchor day when onMonthDayClick is set and no slot is selected", () => {
    const anchorIso = "2026-04-15T12:00:00.000Z";
    const anchorDayKey = dayKeyFromIso(anchorIso);
    const { container } = render(
      <SlotSelectionCalendar
        locale="en-US"
        copy={copy}
        slots={[]}
        calendarView="month"
        onCalendarViewChange={vi.fn()}
        calendarAnchor={anchorIso}
        onCalendarAnchorChange={vi.fn()}
        selectedStartsAtIso={null}
        onSelectSlot={vi.fn()}
        onMonthDayClick={vi.fn()}
      />,
    );

    const cell = container.querySelector(`[data-month-day-cell="${anchorDayKey}"]`);
    expect(cell?.className).toMatch(/ring-/);
  });

  test("month add chip calls onAddForDayKey and does not change view", () => {
    const onAddForDayKey = vi.fn();
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
        weekColumnAddLabel="Add"
        onAddForDayKey={onAddForDayKey}
      />,
    );

    const chip = document.querySelector('[data-month-day-add="2026-04-16"]');
    expect(chip).toBeTruthy();
    fireEvent.click(chip!);

    expect(onAddForDayKey).toHaveBeenCalledWith("2026-04-16");
    expect(onCalendarViewChange).not.toHaveBeenCalled();
  });

  test("month day switches to day view when onMonthDayClick is omitted", () => {
    const onCalendarViewChange = vi.fn();
    const onCalendarAnchorChange = vi.fn();

    render(
      <SlotSelectionCalendar
        locale="en-US"
        copy={copy}
        slots={[]}
        calendarView="month"
        onCalendarViewChange={onCalendarViewChange}
        calendarAnchor="2026-04-15T12:00:00.000Z"
        onCalendarAnchorChange={onCalendarAnchorChange}
        selectedStartsAtIso={null}
        onSelectSlot={vi.fn()}
      />,
    );

    const cell = document.querySelector('[data-day-key="2026-04-08"]');
    fireEvent.click(cell!);

    expect(onCalendarAnchorChange).toHaveBeenCalledWith("2026-04-08T00:00:00.000Z");
    expect(onCalendarViewChange).toHaveBeenCalledWith("day");
  });

  test("embedded variant drops outer card padding and border", () => {
    const { container } = render(
      <SlotSelectionCalendar
        locale="en-US"
        copy={copy}
        slots={[]}
        calendarView="day"
        onCalendarViewChange={vi.fn()}
        calendarAnchor="2026-04-15T12:00:00.000Z"
        onCalendarAnchorChange={vi.fn()}
        selectedStartsAtIso={null}
        onSelectSlot={vi.fn()}
        variant="embedded"
      />,
    );

    const root = container.firstElementChild;
    expect(root?.className).not.toMatch(/rounded-2xl/);
    expect(root?.className).not.toMatch(/p-4/);
    expect(root?.className).toMatch(/p-0/);
  });

  test("day view renders kind=booked slots as non-clickable 'Reserved' markers", () => {
    const onSelect = vi.fn();
    const iso = "2026-04-08T14:00:00.000Z";

    render(
      <SlotSelectionCalendar
        locale="en-US"
        copy={copy}
        slots={[
          {
            startsAtIso: iso,
            label: "Reserved",
            kind: "booked",
          },
        ]}
        calendarView="day"
        onCalendarViewChange={vi.fn()}
        calendarAnchor={iso}
        onCalendarAnchorChange={vi.fn()}
        selectedStartsAtIso={null}
        onSelectSlot={onSelect}
      />,
    );

    const reserved = screen.getByTestId("slot-reserved");
    expect(reserved.tagName.toLowerCase()).not.toBe("button");
    expect(reserved.textContent).toMatch(/Reserved/i);

    fireEvent.click(reserved);
    expect(onSelect).not.toHaveBeenCalled();
  });

  test("week view renders kind=booked slots as non-clickable 'Reserved' markers", () => {
    const onSelect = vi.fn();
    const iso = "2026-04-08T14:00:00.000Z";

    render(
      <SlotSelectionCalendar
        locale="en-US"
        copy={copy}
        slots={[
          {
            startsAtIso: iso,
            label: "Reserved",
            kind: "booked",
          },
        ]}
        calendarView="week"
        onCalendarViewChange={vi.fn()}
        calendarAnchor={iso}
        onCalendarAnchorChange={vi.fn()}
        selectedStartsAtIso={null}
        onSelectSlot={onSelect}
      />,
    );

    const reservedBlocks = screen.getAllByTestId("slot-reserved-week");
    expect(reservedBlocks.length).toBeGreaterThanOrEqual(1);
    expect(reservedBlocks[0]!.tagName.toLowerCase()).not.toBe("button");
    expect(reservedBlocks[0]!.textContent).toMatch(/Reserved/i);

    fireEvent.click(reservedBlocks[0]!);
    expect(onSelect).not.toHaveBeenCalled();
  });

  test("dayViewExtra renders in day view", () => {
    const { rerender } = render(
      <SlotSelectionCalendar
        locale="en-US"
        copy={copy}
        slots={[{ startsAtIso: "2026-04-08T14:00:00.000Z", label: "x" }]}
        calendarView="month"
        onCalendarViewChange={vi.fn()}
        calendarAnchor="2026-04-15T12:00:00.000Z"
        onCalendarAnchorChange={vi.fn()}
        selectedStartsAtIso={null}
        onSelectSlot={vi.fn()}
        dayViewExtra={() => <button type="button">Extra</button>}
      />,
    );

    rerender(
      <SlotSelectionCalendar
        locale="en-US"
        copy={copy}
        slots={[{ startsAtIso: "2026-04-08T14:00:00.000Z", label: "x" }]}
        calendarView="day"
        onCalendarViewChange={vi.fn()}
        calendarAnchor="2026-04-08T12:00:00.000Z"
        onCalendarAnchorChange={vi.fn()}
        selectedStartsAtIso={null}
        onSelectSlot={vi.fn()}
        dayViewExtra={() => <button type="button">Extra</button>}
      />,
    );

    expect(screen.getByRole("button", { name: "Extra" })).toBeInTheDocument();
  });
});
