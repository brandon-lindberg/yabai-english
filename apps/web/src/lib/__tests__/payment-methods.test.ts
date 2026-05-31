import { describe, expect, test } from "vitest";
import {
  canTeacherPublishAvailability,
  getEnabledTeacherPaymentMethods,
  hasEnabledPaidPaymentMethod,
  isLocalDevStripeAccountReady,
  isTeacherPaymentAccountReady,
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
        providerAccountId: "acct_123",
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
        providerAccountId: "acct_123",
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

  test("local dev Stripe accounts do not expose real checkout methods", () => {
    const methods = getEnabledTeacherPaymentMethods([
      {
        id: "local-stripe",
        provider: "STRIPE",
        providerAccountId: "acct_local_teacher-profile-1",
        status: "ENABLED",
        chargesEnabled: true,
        payoutsEnabled: true,
        methods: [{ method: "CARD", enabled: true }],
      },
    ]);

    expect(methods).toEqual([]);
    expect(hasEnabledPaidPaymentMethod(methods)).toBe(false);
  });

  test("isTeacherPaymentAccountReady distinguishes real and local Stripe accounts", () => {
    expect(
      isTeacherPaymentAccountReady({
        id: "acct-1",
        provider: "STRIPE",
        providerAccountId: "acct_123",
        status: "ENABLED",
        chargesEnabled: true,
        payoutsEnabled: true,
        methods: [{ method: "CARD", enabled: true }],
      }),
    ).toBe(true);
    expect(
      isLocalDevStripeAccountReady({
        id: "acct-1",
        provider: "STRIPE",
        providerAccountId: "acct_local_teacher-profile-1",
        status: "ENABLED",
        chargesEnabled: true,
        payoutsEnabled: true,
        methods: [{ method: "CARD", enabled: true }],
      }),
    ).toBe(true);
  });

  test("canTeacherPublishAvailability requires policy acceptance and a ready Stripe account", () => {
    const readyStripe = {
      id: "acct-1",
      provider: "STRIPE" as const,
      providerAccountId: "acct_123",
      status: "ENABLED" as const,
      chargesEnabled: true,
      payoutsEnabled: true,
      methods: [{ method: "CARD" as const, enabled: true }],
    };

    expect(
      canTeacherPublishAvailability(new Date("2026-05-01T00:00:00.000Z"), [readyStripe]),
    ).toBe(true);
    expect(canTeacherPublishAvailability(null, [readyStripe])).toBe(false);
    expect(canTeacherPublishAvailability(new Date("2026-05-01T00:00:00.000Z"), [])).toBe(false);
  });

  test("canTeacherPublishAvailability rejects incomplete and local-only Stripe accounts by default", () => {
    const policyAcceptedAt = new Date("2026-05-01T00:00:00.000Z");
    const incompleteStripe = {
      id: "acct-1",
      provider: "STRIPE" as const,
      providerAccountId: "acct_123",
      status: "PENDING" as const,
      chargesEnabled: false,
      payoutsEnabled: false,
      methods: [{ method: "CARD" as const, enabled: false }],
    };
    const localDevStripe = {
      id: "acct-2",
      provider: "STRIPE" as const,
      providerAccountId: "acct_local_teacher-profile-1",
      status: "ENABLED" as const,
      chargesEnabled: true,
      payoutsEnabled: true,
      methods: [{ method: "CARD" as const, enabled: true }],
    };

    expect(canTeacherPublishAvailability(policyAcceptedAt, [incompleteStripe])).toBe(false);
    expect(canTeacherPublishAvailability(policyAcceptedAt, [localDevStripe])).toBe(false);
  });

  test("canTeacherPublishAvailability allows local dev Stripe only when explicitly enabled", () => {
    const policyAcceptedAt = new Date("2026-05-01T00:00:00.000Z");
    const localDevStripe = {
      id: "acct-1",
      provider: "STRIPE" as const,
      providerAccountId: "acct_local_teacher-profile-1",
      status: "ENABLED" as const,
      chargesEnabled: true,
      payoutsEnabled: true,
      methods: [{ method: "CARD" as const, enabled: true }],
    };

    expect(canTeacherPublishAvailability(policyAcceptedAt, [localDevStripe])).toBe(false);
    expect(
      canTeacherPublishAvailability(policyAcceptedAt, [localDevStripe], {
        allowLocalDevStripe: true,
      }),
    ).toBe(true);
  });

  test("canTeacherPublishAvailability does not treat KOMOJU alone as sufficient", () => {
    expect(
      canTeacherPublishAvailability(new Date("2026-05-01T00:00:00.000Z"), [
        {
          id: "komoju-1",
          provider: "KOMOJU",
          status: "ENABLED",
          chargesEnabled: true,
          payoutsEnabled: true,
          methods: [{ method: "PAYPAY", enabled: true }],
        },
      ]),
    ).toBe(false);
  });
});
