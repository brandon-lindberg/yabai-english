// @vitest-environment jsdom

import { fireEvent, render, screen } from "@testing-library/react";
import { NextIntlClientProvider } from "next-intl";
import { describe, expect, test, vi } from "vitest";
import en from "../../../messages/en.json";
import { DashboardScheduleCalendar } from "../dashboard-schedule-calendar";

vi.mock("@/hooks/use-is-mobile", () => ({
  useIsMobile: () => false,
}));

const upcomingLesson = {
  id: "booking-1",
  startsAtIso: "2026-07-05T01:30:00.000Z",
  endsAtIso: "2026-07-05T02:10:00.000Z",
  title: "Conversation",
  teacherName: "Kana Minami Miura",
  isPast: false,
};

// Same week as the upcoming one, so a single month view holds both.
const pastLesson = {
  id: "booking-0",
  startsAtIso: "2026-07-02T01:30:00.000Z",
  endsAtIso: "2026-07-02T02:10:00.000Z",
  title: "Pronunciation",
  teacherName: "Kana Minami Miura",
  isPast: true,
};

function renderCalendar(items = [upcomingLesson]) {
  return render(
    <NextIntlClientProvider locale="en" messages={en}>
      <DashboardScheduleCalendar timeZone="Asia/Tokyo" items={items} />
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

  test("shows lessons already taught, so the calendar reads as a record", () => {
    renderCalendar([upcomingLesson, pastLesson]);

    fireEvent.click(screen.getByRole("button", { name: en.dashboard.calendarMonth }));

    expect(screen.getByText(en.dashboard.statusCompleted)).toBeInTheDocument();
    expect(screen.getByText(en.dashboard.slotReserved)).toBeInTheDocument();
  });

  test("sends a past lesson to the completed history, not a dead hash", () => {
    // The upcoming list sits under this calendar, so `#booking-…` resolves for a
    // future lesson but would land nowhere for one already taught.
    renderCalendar([upcomingLesson, pastLesson]);

    fireEvent.click(screen.getByRole("button", { name: en.dashboard.calendarMonth }));

    const links = screen.getAllByRole("link");
    const past = links.find((a) => a.getAttribute("href")?.includes("booking-0"));
    const upcoming = links.find((a) => a.getAttribute("href")?.includes("booking-1"));

    // Locale-prefixed, so the hash survives next-intl's routing rather than
    // dropping the visitor on the default locale's history page.
    expect(past?.getAttribute("href")).toBe("/en/dashboard/schedule/completed#booking-booking-0");
    expect(upcoming?.getAttribute("href")).toBe("#booking-booking-1");
  });

  test("marks a past lesson as spent rather than committed", () => {
    renderCalendar([upcomingLesson, pastLesson]);

    fireEvent.click(screen.getByRole("button", { name: en.dashboard.calendarMonth }));

    const links = screen.getAllByRole("link");
    const past = links.find((a) => a.getAttribute("href")?.includes("booking-0"));
    const upcoming = links.find((a) => a.getAttribute("href")?.includes("booking-1"));

    // Solid ink means "you are committed here" — a finished lesson must not claim it.
    expect(upcoming?.className).toContain("bg-foreground");
    expect(past?.className).not.toContain("bg-foreground");
  });

  test("opens on the next lesson even when the past archive is longer", () => {
    // `items` leads with upcoming but carries every past lesson behind it;
    // anchoring on items[0] blindly would open years back.
    renderCalendar([upcomingLesson, pastLesson]);

    expect(screen.getByText(/Jul 5, 2026|Jun 28/)).toBeInTheDocument();
  });
});
