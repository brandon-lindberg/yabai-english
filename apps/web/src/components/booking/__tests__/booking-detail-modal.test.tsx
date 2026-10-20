// @vitest-environment jsdom

import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { NextIntlClientProvider } from "next-intl";
import en from "../../../../messages/en.json";
import {
  BookingDetailModal,
  type CalendarBookingDetail,
} from "@/components/booking/booking-detail-modal";

vi.mock("@/i18n/navigation", () => ({
  useRouter: () => ({ push: vi.fn(), refresh: vi.fn() }),
}));

const booking: CalendarBookingDetail = {
  id: "b-1",
  startsAtIso: "2026-07-05T01:30:00.000Z",
  endsAtIso: "2026-07-05T02:10:00.000Z",
  status: "CONFIRMED",
  counterpartLabel: "Kana Minami Miura",
  lessonLabel: "英会話 / Conversation",
  durationMin: 40,
  priceYen: 4000,
  meetUrl: "https://meet.example/abc",
  groupSeats: null,
};

function renderModal(overrides: Partial<CalendarBookingDetail> = {}) {
  return render(
    <NextIntlClientProvider locale="en" messages={en}>
      <BookingDetailModal
        viewer="student"
        timeZone="Asia/Tokyo"
        booking={{ ...booking, ...overrides }}
        onClose={() => {}}
      />
    </NextIntlClientProvider>,
  );
}

describe("BookingDetailModal", () => {
  beforeEach(() => {
    HTMLDialogElement.prototype.showModal = vi.fn(function (this: HTMLDialogElement) {
      this.open = true;
    });
    HTMLDialogElement.prototype.close = vi.fn(function (this: HTMLDialogElement) {
      this.open = false;
    });
    // The lesson in the fixture is still ahead unless a test says otherwise.
    vi.useFakeTimers({ toFake: ["Date"] });
    vi.setSystemTime(new Date("2026-07-01T00:00:00.000Z"));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  test("says when the lesson is in the viewer's timezone, not the machine's", () => {
    // The chips on the calendar behind this dialog are drawn in the dashboard's
    // timezone. A header formatted in the browser's own zone would put the same
    // lesson at two different times on one screen.
    renderModal();

    expect(screen.getByText(/10:30/)).toBeInTheDocument();
  });

  test("a lesson still ahead can be cancelled", () => {
    renderModal();

    expect(
      screen.getByRole("button", { name: en.dashboard.cancelBooking }),
    ).toBeInTheDocument();
  });

  test("a lesson already taught cannot be cancelled", () => {
    // Cancelling is about giving a time back. There is nothing to give back
    // once the lesson has happened, and the button would only fail at the API.
    renderModal({ status: "COMPLETED" });

    expect(screen.queryByRole("button", { name: en.dashboard.cancelBooking })).toBeNull();
  });

  test("a cancelled lesson is not offered for cancelling again", () => {
    renderModal({ status: "CANCELLED" });

    expect(screen.queryByRole("button", { name: en.dashboard.cancelBooking })).toBeNull();
  });

  test("a lapsed reservation offers neither payment nor cancelling", () => {
    // The hold ran out and the slot went back on sale; both actions point at
    // something that is no longer the student's to act on.
    renderModal({ status: "EXPIRED" });

    expect(screen.queryByRole("button", { name: en.booking.pendingReservationPay })).toBeNull();
    expect(screen.queryByRole("button", { name: en.dashboard.cancelBooking })).toBeNull();
  });

  test("a lesson under way can still be joined but no longer cancelled", () => {
    // Someone running late should still find the call; giving the time back
    // stopped being possible the moment it began.
    vi.setSystemTime(new Date("2026-07-05T01:45:00.000Z"));
    renderModal();

    expect(screen.getByRole("link", { name: en.dashboard.meetLink })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: en.dashboard.cancelBooking })).toBeNull();
  });

  test("a past lesson still shows its details but offers nothing to act on", () => {
    // Status alone does not say a lesson is over — it stays CONFIRMED after the
    // fact — so the clock has to.
    vi.setSystemTime(new Date("2026-07-06T00:00:00.000Z"));
    renderModal();

    expect(screen.getByText("Kana Minami Miura")).toBeInTheDocument();
    expect(screen.queryByRole("link", { name: en.dashboard.meetLink })).toBeNull();
    expect(screen.queryByRole("button", { name: en.dashboard.cancelBooking })).toBeNull();
  });

  test("an unpaid reservation whose time has come offers neither payment nor cancelling", () => {
    vi.setSystemTime(new Date("2026-07-06T00:00:00.000Z"));
    renderModal({ status: "PENDING_PAYMENT" });

    expect(screen.queryByRole("button", { name: en.booking.pendingReservationPay })).toBeNull();
    expect(screen.queryByRole("button", { name: en.dashboard.cancelBooking })).toBeNull();
  });
});
