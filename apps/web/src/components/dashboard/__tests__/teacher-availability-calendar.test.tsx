// @vitest-environment jsdom

import { describe, expect, test, vi, beforeEach, afterEach } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import { NextIntlClientProvider } from "next-intl";
import en from "../../../../messages/en.json";
import { TeacherAvailabilityCalendar } from "../teacher-availability-calendar";

function renderTeacherCalendar() {
  return render(
    <NextIntlClientProvider locale="en" messages={en}>
      <TeacherAvailabilityCalendar
        initialSlots={[]}
        initialOccurrenceSkips={[]}
        defaultTimezone="UTC"
      />
    </NextIntlClientProvider>,
  );
}

describe("TeacherAvailabilityCalendar", () => {
  beforeEach(() => {
    vi.useFakeTimers({ now: new Date("2026-04-15T12:00:00.000Z") });
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  test("defaults to month: tap the day opens day view for edit/remove; Add chip opens the dialog", () => {
    renderTeacherCalendar();

    expect(screen.getByTestId("google-month-grid")).toBeInTheDocument();

    fireEvent.click(document.querySelector('[data-day-key="2026-04-16"]')!);

    expect(
      screen.getByRole("button", { name: en.dashboard.teacherAvailability.addForThisDay }),
    ).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: en.dashboard.calendarMonth }));

    fireEvent.click(document.querySelector('[data-month-day-add="2026-04-16"]')!);

    expect(
      screen.getByRole("dialog", { name: en.dashboard.teacherAvailability.monthAddModalTitle }),
    ).toBeInTheDocument();
  });
});
