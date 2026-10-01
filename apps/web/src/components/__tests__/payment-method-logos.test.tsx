// @vitest-environment jsdom

import { render, screen, within } from "@testing-library/react";
import { describe, expect, test } from "vitest";
import { NextIntlClientProvider } from "next-intl";
import en from "../../../messages/en.json";
import { CheckoutMethodBadges, PaymentMethodLogos } from "@/components/payment-method-logos";
import type { EnabledTeacherPaymentMethod } from "@/lib/payment-methods";

function renderWithIntl(ui: React.ReactNode) {
  return render(
    <NextIntlClientProvider locale="en" messages={en}>
      {ui}
    </NextIntlClientProvider>,
  );
}

function badgeTexts() {
  return within(screen.getByRole("list", { name: "Accepted payment methods" }))
    .getAllByRole("listitem")
    .map((item) => item.textContent);
}

const stripeCard = (checkoutMethods: EnabledTeacherPaymentMethod["checkoutMethods"]) => ({
  accountId: "stripe",
  provider: "STRIPE" as const,
  method: "CARD" as const,
  label: "Credit card",
  logoLabel: "Stripe",
  logoClassName: "",
  checkoutMethods,
});

describe("CheckoutMethodBadges", () => {
  test("shows every method when there are no more than the cap", () => {
    renderWithIntl(<CheckoutMethodBadges methods={["card", "apple_pay"]} />);

    expect(badgeTexts()).toEqual(["Card", "Apple Pay"]);
  });

  test("folds methods past the cap into a count that still names them", () => {
    renderWithIntl(
      <CheckoutMethodBadges methods={["card", "apple_pay", "google_pay", "link", "alipay"]} />,
    );

    expect(badgeTexts()).toHaveLength(4);
    expect(badgeTexts().slice(0, 3)).toEqual(["Card", "Apple Pay", "Google Pay"]);
    expect(screen.getByText("+2")).toHaveAttribute("aria-hidden", "true");
    expect(screen.getByText("2 more: Link, Alipay")).toHaveClass("sr-only");
  });

  test("renders nothing when there is no method", () => {
    const { container } = renderWithIntl(<CheckoutMethodBadges methods={[]} />);

    expect(container).toBeEmptyDOMElement();
  });
});

describe("PaymentMethodLogos", () => {
  test("merges a teacher's options into one list in popularity order", () => {
    renderWithIntl(
      <PaymentMethodLogos
        methods={[
          stripeCard(["card", "link"]),
          { ...stripeCard(["paypay"]), accountId: "komoju", provider: "KOMOJU", method: "PAYPAY" },
        ]}
      />,
    );

    expect(badgeTexts()).toEqual(["Card", "PayPay", "Link"]);
  });

  test("lifts the cap when asked to show everything", () => {
    renderWithIntl(
      <PaymentMethodLogos
        methods={[stripeCard(["card", "apple_pay", "google_pay", "link", "alipay"])]}
        max={Infinity}
      />,
    );

    expect(badgeTexts()).toEqual(["Card", "Apple Pay", "Google Pay", "Link", "Alipay"]);
  });

  test("renders nothing when no teacher payment method is available", () => {
    const { container } = renderWithIntl(<PaymentMethodLogos methods={[]} />);

    expect(container).toBeEmptyDOMElement();
  });
});
