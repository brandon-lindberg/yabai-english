// @vitest-environment jsdom

import { NextIntlClientProvider } from "next-intl";
import { render, screen } from "@testing-library/react";
import { describe, expect, test, vi } from "vitest";
import en from "../../../../messages/en.json";
import { CheckoutConfirmationPoll } from "@/components/booking/checkout-confirmation-poll";

vi.mock("@/i18n/navigation", () => ({
  useRouter: () => ({ refresh: vi.fn() }),
}));

describe("CheckoutConfirmationPoll", () => {
  test("shows confirming message after Stripe success while booking is pending", () => {
    render(
      <NextIntlClientProvider locale="en" messages={en}>
        <CheckoutConfirmationPoll
          bookingId="booking-1"
          initialStatus="PENDING_PAYMENT"
          stripeSuccess
        />
      </NextIntlClientProvider>,
    );

    expect(screen.getByText(en.booking.checkoutConfirmingPayment)).toBeTruthy();
  });
});
