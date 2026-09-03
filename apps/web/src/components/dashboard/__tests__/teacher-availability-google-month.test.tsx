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
        reservedLabel="Reserved"
      />,
    );

    const chips = getAllByTestId("month-slot-chip");
    expect(chips.length).toBeGreaterThanOrEqual(1);
    fireEvent.click(chips[0]!);
    expect(onSelect).toHaveBeenCalledWith(start.toISOString(), "rule-1");
    expect(onAnchor).toHaveBeenCalledWith(start.toISOString());
  });

  test("a booking chip opens the reservation, never the availability editor", () => {
    const anchor = new Date(2026, 5, 10, 12, 0, 0).toISOString();
    const monthCells = buildMonthCells(anchor, "en-US");
    const headers = buildWeekdayColumnHeaders("en-US");
    const wed = "2026-06-10";
    const m = new Map<string, MonthDaySlotChip[]>();
    m.set(wed, [
      {
        startsAtIso: `${wed}T14:00:00.000Z`,
        endsAtIso: `${wed}T15:00:00.000Z`,
        label: "Alex Student",
        groupKey: "booking-1",
        kind: "booking",
      },
    ]);

    const onSelect = vi.fn();
    const onSelectBooking = vi.fn();

    const { getByTestId } = render(
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
        onSelectBooking={onSelectBooking}
        onCalendarAnchorChange={vi.fn()}
        reservedLabel="Reserved"
      />,
    );

    const bookingChip = getByTestId("month-booking-chip");
    // Two lines of room: when, and who with. "Reserved" is in the accessible
    // name so a short block cannot clip the name the teacher came to read.
    expect(bookingChip.textContent).toMatch(/Alex Student/);
    expect(bookingChip).toHaveAccessibleName(/Reserved/);

    fireEvent.click(bookingChip);
    expect(onSelectBooking).toHaveBeenCalledWith("booking-1");
    // A reservation is not an availability slot; it must not open that editor.
    expect(onSelect).not.toHaveBeenCalled();
  });

  test("does not render availability chips when only a booking is provided for a slot time", () => {
    const anchor = new Date(2026, 5, 10, 12, 0, 0).toISOString();
    const monthCells = buildMonthCells(anchor, "en-US");
    const headers = buildWeekdayColumnHeaders("en-US");
    const sun = "2026-06-07";
    const m = new Map<string, MonthDaySlotChip[]>();
    m.set(sun, [
      {
        startsAtIso: `${sun}T01:30:00.000Z`,
        endsAtIso: `${sun}T02:10:00.000Z`,
        label: "Kana Minami Miura",
        groupKey: "booking-1",
        kind: "booking",
      },
    ]);

    const { getByTestId, queryByTestId } = render(
      <TeacherAvailabilityGoogleMonth
        locale="en-US"
        monthWeekdayHeaders={headers}
        monthCells={monthCells}
        slotsByDay={m}
        focusedDayKey={sun}
        selectedStartsAtIso={null}
        selectedGroupKey={null}
        onOpenDay={vi.fn()}
        onSelectSlot={vi.fn()}
        onCalendarAnchorChange={vi.fn()}
        reservedLabel="Reserved"
      />,
    );

    expect(getByTestId("month-booking-chip")).toBeInTheDocument();
    expect(queryByTestId("month-slot-chip")).toBeNull();
  });
});
