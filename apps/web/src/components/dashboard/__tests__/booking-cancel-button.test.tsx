// @vitest-environment jsdom

import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { NextIntlClientProvider } from "next-intl";
import en from "../../../../messages/en.json";
import { BookingCancelButton } from "../booking-cancel-button";

const refreshMock = vi.fn();

vi.mock("@/i18n/navigation", () => ({
  useRouter: () => ({ refresh: refreshMock }),
}));

describe("BookingCancelButton", () => {
  beforeEach(() => {
    refreshMock.mockClear();
    vi.stubGlobal("confirm", vi.fn(() => true));
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ ok: true }),
    }) as unknown as typeof fetch;
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  test("POSTs cancel and refreshes the router when the user confirms", async () => {
    render(
      <NextIntlClientProvider locale="en" messages={en}>
        <BookingCancelButton bookingId="bk-1" />
      </NextIntlClientProvider>,
    );

    fireEvent.click(screen.getByRole("button", { name: en.dashboard.cancelBooking }));

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith("/api/bookings/bk-1/cancel", { method: "POST" });
    });
    await waitFor(() => {
      expect(refreshMock).toHaveBeenCalled();
    });
  });

  test("does not call the API when the user dismisses the confirm dialog", () => {
    vi.stubGlobal("confirm", vi.fn(() => false));

    render(
      <NextIntlClientProvider locale="en" messages={en}>
        <BookingCancelButton bookingId="bk-2" />
      </NextIntlClientProvider>,
    );

    fireEvent.click(screen.getByRole("button", { name: en.dashboard.cancelBooking }));

    expect(global.fetch).not.toHaveBeenCalled();
    expect(refreshMock).not.toHaveBeenCalled();
  });
});
