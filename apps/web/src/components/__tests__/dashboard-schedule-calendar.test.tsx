// @vitest-environment jsdom

import { fireEvent, render, screen } from "@testing-library/react";
import { NextIntlClientProvider } from "next-intl";
import { describe, expect, test, vi } from "vitest";
import en from "../../../messages/en.json";
import { DashboardScheduleCalendar } from "../dashboard-schedule-calendar";

vi.mock("@/hooks/use-is-mobile", () => ({
  useIsMobile: () => false,
}));

function renderCalendar() {
  return render(
    <NextIntlClientProvider locale="en" messages={en}>
      <DashboardScheduleCalendar
        timeZone="Asia/Tokyo"
        items={[
          {
            id: "booking-1",
            startsAtIso: "2026-07-05T01:30:00.000Z",
            endsAtIso: "2026-07-05T02:10:00.000Z",
            title: "Conversation",
            teacherName: "Kana Minami Miura",
          },
        ]}
      />
    </NextIntlClientProvider>,
  );
}

describe("DashboardScheduleCalendar", () => {
  test("renders booked lesson times in the provided dashboard timezone", () => {
    renderCalendar();

    fireEvent.click(screen.getByRole("button", { name: en.dashboard.calendarMonth }));

    expect(screen.getByText("10:30 AM")).toBeInTheDocument();
    expect(screen.queryByText("07:30 PM")).toBeNull();
  });
});
