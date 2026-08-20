// @vitest-environment jsdom

import { render, screen } from "@testing-library/react";
import { describe, expect, test } from "vitest";
import { PaymentMethodLogos } from "@/components/payment-method-logos";

describe("PaymentMethodLogos", () => {
  test("renders only enabled teacher payment method logos", () => {
    render(
      <PaymentMethodLogos
        methods={[
          {
            accountId: "stripe",
            provider: "STRIPE",
            method: "CARD",
            label: "Credit card",
            logoLabel: "Stripe",
            logoClassName: "bg-[#635bff] text-white",
          },
          {
            accountId: "komoju",
            provider: "KOMOJU",
            method: "PAYPAY",
            label: "PayPay",
            logoLabel: "PayPay",
            logoClassName: "bg-[#ff0033] text-white",
          },
        ]}
      />,
    );

    expect(screen.getByLabelText("Stripe available")).toHaveTextContent("Stripe");
    expect(screen.getByLabelText("PayPay available")).toHaveTextContent("PayPay");
  });

  test("renders nothing when no teacher payment method is available", () => {
    const { container } = render(<PaymentMethodLogos methods={[]} />);

    expect(container).toBeEmptyDOMElement();
  });
});
