import { describe, expect, test } from "vitest";
import {
  getEnabledTeacherPaymentMethods,
  hasEnabledPaidPaymentMethod,
  paymentMethodDisplay,
} from "@/lib/payment-methods";

describe("payment method availability", () => {
  test("teacher with no payment accounts has no paid payment methods", () => {
    expect(getEnabledTeacherPaymentMethods([])).toEqual([]);
    expect(hasEnabledPaidPaymentMethod([])).toBe(false);
  });

  test("teacher with one enabled Stripe account exposes only card payments", () => {
    const methods = getEnabledTeacherPaymentMethods([
      {
        id: "acct-1",
        provider: "STRIPE",
        status: "ENABLED",
        chargesEnabled: true,
        payoutsEnabled: true,
        methods: [{ method: "CARD", enabled: true }],
      },
    ]);

    expect(methods).toEqual([
      expect.objectContaining({
        provider: "STRIPE",
        method: "CARD",
        label: "Credit card",
        logoLabel: "Stripe",
      }),
    ]);
    expect(hasEnabledPaidPaymentMethod(methods)).toBe(true);
  });

  test("teacher with multiple enabled accounts exposes all enabled methods", () => {
    const methods = getEnabledTeacherPaymentMethods([
      {
        id: "stripe",
        provider: "STRIPE",
        status: "ENABLED",
        chargesEnabled: true,
        payoutsEnabled: true,
        methods: [{ method: "CARD", enabled: true }],
      },
      {
        id: "komoju",
        provider: "KOMOJU",
        status: "ENABLED",
        chargesEnabled: true,
        payoutsEnabled: true,
        methods: [{ method: "PAYPAY", enabled: true }],
      },
    ]);

    expect(methods.map((m) => `${m.provider}:${m.method}`)).toEqual([
      "STRIPE:CARD",
      "KOMOJU:PAYPAY",
    ]);
  });

  test("disabled or incomplete accounts do not expose checkout methods", () => {
    const methods = getEnabledTeacherPaymentMethods([
      {
        id: "pending",
        provider: "STRIPE",
        status: "PENDING",
        chargesEnabled: true,
        payoutsEnabled: true,
        methods: [{ method: "CARD", enabled: true }],
      },
      {
        id: "no-payouts",
        provider: "KOMOJU",
        status: "ENABLED",
        chargesEnabled: true,
        payoutsEnabled: false,
        methods: [{ method: "PAYPAY", enabled: true }],
      },
    ]);

    expect(methods).toEqual([]);
  });

  test("payment method display metadata provides logo-safe labels", () => {
    expect(paymentMethodDisplay("PAYPAY")).toEqual({
      label: "PayPay",
      logoLabel: "PayPay",
      logoClassName: "bg-[#ff0033] text-white",
    });
  });
});
