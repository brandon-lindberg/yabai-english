// @vitest-environment jsdom

import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { NextIntlClientProvider } from "next-intl";
import en from "../../../../messages/en.json";

const { pushMock, refreshMock } = vi.hoisted(() => ({
  pushMock: vi.fn(),
  refreshMock: vi.fn(),
}));

vi.mock("@/i18n/navigation", () => ({
  useRouter: () => ({ push: pushMock, refresh: refreshMock }),
}));

import { PendingReservationNotice } from "../pending-reservation-notice";

function renderNotice() {
  return render(
    <NextIntlClientProvider locale="en" messages={en} timeZone="Asia/Tokyo">
      <PendingReservationNotice
        bookingId="booking-1"
        startsAtIso="2026-09-05T01:00:00.000Z"
        expiresAtIso="2026-09-05T04:00:00.000Z"
        viewerTimezone="Asia/Tokyo"
      />
    </NextIntlClientProvider>,
  );
}

describe("PendingReservationNotice", () => {
  const fetchMock = vi.fn();

  beforeEach(() => {
    fetchMock.mockReset();
    pushMock.mockReset();
    refreshMock.mockReset();
    vi.stubGlobal("fetch", fetchMock);
    vi.stubGlobal("confirm", () => true);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  test("sends the student to checkout when they complete payment", async () => {
    fetchMock.mockResolvedValue({
      ok: true,
      json: async () => ({ checkoutUrl: "/book/checkout/booking-1" }),
    });

    renderNotice();
    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: "Complete payment" }));
    });

    expect(fetchMock).toHaveBeenCalledWith(
      "/api/bookings/booking-1/pay",
      expect.objectContaining({ method: "POST" }),
    );
    await waitFor(() => {
      expect(pushMock).toHaveBeenCalledWith("/book/checkout/booking-1");
    });
  });

  test("releases the slot when they cancel", async () => {
    fetchMock.mockResolvedValue({ ok: true, json: async () => ({ ok: true }) });

    renderNotice();
    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: "Cancel reservation" }));
    });

    expect(fetchMock).toHaveBeenCalledWith(
      "/api/bookings/booking-1/cancel",
      expect.objectContaining({ method: "POST" }),
    );
    await waitFor(() => {
      expect(refreshMock).toHaveBeenCalled();
    });
  });

  test("keeps the student on the page and explains when an action fails", async () => {
    fetchMock.mockResolvedValue({
      ok: false,
      json: async () => ({ error: "This reservation expired and the time was released." }),
    });

    renderNotice();
    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: "Complete payment" }));
    });

    expect(
      await screen.findByText("This reservation expired and the time was released."),
    ).toBeInTheDocument();
    expect(pushMock).not.toHaveBeenCalled();
  });

  test("does not cancel when the student backs out of the confirm dialog", async () => {
    vi.stubGlobal("confirm", () => false);

    renderNotice();
    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: "Cancel reservation" }));
    });

    expect(fetchMock).not.toHaveBeenCalled();
  });
});
