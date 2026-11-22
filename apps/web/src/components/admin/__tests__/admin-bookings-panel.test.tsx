// @vitest-environment jsdom

import { render, screen } from "@testing-library/react";
import { NextIntlClientProvider } from "next-intl";
import { expect, test, vi } from "vitest";
import en from "../../../../messages/en.json";
import { AdminBookingsPanel, type AdminBookingRow } from "../admin-bookings-panel";

const { useBrowserTimezone } = vi.hoisted(() => ({
  useBrowserTimezone: vi.fn<() => string | undefined>(),
}));
vi.mock("@/hooks/use-browser-timezone", () => ({ useBrowserTimezone }));

test("shows pagination only once the time zone and booking results are ready", () => {
  const bookings: AdminBookingRow[] = [{
    id: "booking-1",
    learningLanguage: "JAPANESE",
    startsAtIso: "2025-02-12T23:30:00.000Z",
    lessonName: "Japanese conversation",
    studentName: "Student",
    teacherName: "Teacher",
    status: "CONFIRMED",
    reschedulePending: false,
    meetUrl: null,
  }];
  const panel = () => (
    <NextIntlClientProvider locale="en" messages={en}>
      <AdminBookingsPanel
        bookings={bookings}
        locale="en"
        search=""
        pagination={<a href="?page=2">Next page</a>}
      />
    </NextIntlClientProvider>
  );

  useBrowserTimezone.mockReturnValue(undefined);
  const { rerender } = render(panel());
  expect(screen.getByRole("status")).toHaveTextContent(en.admin.bookingsPanel.loadingTimes);
  expect(screen.queryByRole("link", { name: "Next page" })).not.toBeInTheDocument();

  useBrowserTimezone.mockReturnValue("America/Los_Angeles");
  rerender(panel());
  expect(screen.getByRole("link", { name: "Japanese conversation" })).toBeVisible();
  expect(screen.getByRole("link", { name: "Next page" })).toHaveAttribute("href", "?page=2");
});
