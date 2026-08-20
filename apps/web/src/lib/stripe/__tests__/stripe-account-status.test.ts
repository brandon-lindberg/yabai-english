import { describe, expect, test } from "vitest";
import {
  resolveStripeAccountStatus,
  STRIPE_CAPABILITY_BY_METHOD,
} from "@/lib/stripe/stripe-account-status";

const ready = {
  charges_enabled: true,
  payouts_enabled: true,
  requirements: { currently_due: [], past_due: [] },
};

describe("resolveStripeAccountStatus", () => {
  test("reports a fully onboarded account as enabled", () => {
    const status = resolveStripeAccountStatus(ready);
    expect(status.status).toBe("ENABLED");
    expect(status.chargesEnabled).toBe(true);
    expect(status.payoutsEnabled).toBe(true);
    expect(status.requirementsDue).toEqual([]);
  });

  test("flags outstanding requirements", () => {
    const status = resolveStripeAccountStatus({
      ...ready,
      requirements: { currently_due: ["individual.id_number"], past_due: [] },
    });
    expect(status.status).toBe("REQUIREMENTS_DUE");
    expect(status.requirementsDue).toEqual(["individual.id_number"]);
  });
});

describe("payment methods derived from Stripe capabilities", () => {
  test("offers only what the connected account can actually charge", () => {
    const status = resolveStripeAccountStatus({
      ...ready,
      capabilities: { card_payments: "active" },
    });

    expect(status.enabledMethods).toEqual(["CARD"]);
  });

  test("a capability that is pending or inactive does not count as offerable", () => {
    const status = resolveStripeAccountStatus({
      ...ready,
      capabilities: { card_payments: "pending" },
    });

    expect(status.enabledMethods).toEqual([]);
  });

  // Stripe has no PayPay capability and no PayPay Checkout method, so the
  // TeacherPaymentMethodType value cannot be activated. It stays out of the map
  // rather than mapping to a capability that will never come back active.
  test("does not claim to offer a method Stripe cannot activate", () => {
    const status = resolveStripeAccountStatus({
      ...ready,
      capabilities: { card_payments: "active", paypay_payments: "active" },
    });

    expect(status.enabledMethods).toEqual(["CARD"]);
  });

  // Nothing should be offered by an account that cannot take a payment at all,
  // however its capabilities read.
  test("offers nothing while the account is not ready", () => {
    const status = resolveStripeAccountStatus({
      charges_enabled: false,
      payouts_enabled: false,
      requirements: { currently_due: ["external_account"], past_due: [] },
      capabilities: { card_payments: "active" },
    });

    expect(status.enabledMethods).toEqual([]);
  });

  // Accounts connected before we read capabilities report none at all. Treating
  // that as "no methods" would silently stop existing teachers being bookable.
  test("assumes card for a ready account that reports no capabilities", () => {
    const status = resolveStripeAccountStatus(ready);
    expect(status.enabledMethods).toEqual(["CARD"]);
  });

  test("maps only methods Stripe can actually activate", () => {
    expect(STRIPE_CAPABILITY_BY_METHOD).toEqual({ CARD: "card_payments" });
  });
});
