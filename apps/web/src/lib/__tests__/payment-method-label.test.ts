import { describe, expect, test } from "vitest";
import { paymentMethodLabel } from "@/lib/payment-method-label";

describe("paymentMethodLabel", () => {
  test("names each transaction type in English", () => {
    expect(paymentMethodLabel("CARD")).toBe("Credit card");
    expect(paymentMethodLabel("PAYPAY")).toBe("PayPay");
  });

  test("names each transaction type in Japanese", () => {
    expect(paymentMethodLabel("CARD", "ja")).toBe("クレジットカード");
    expect(paymentMethodLabel("PAYPAY", "ja")).toBe("PayPay");
  });

  test("renders nothing when the booking has no recorded payment", () => {
    expect(paymentMethodLabel(null)).toBe("");
    expect(paymentMethodLabel(undefined)).toBe("");
  });
});
