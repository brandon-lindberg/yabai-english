import { describe, expect, test, vi } from "vitest";

const { createSessionMock } = vi.hoisted(() => ({ createSessionMock: vi.fn() }));

vi.mock("server-only", () => ({}));
vi.mock("stripe", () => ({
  default: class {
    checkout = { sessions: { create: createSessionMock } };
  },
}));

import {
  availablePaymentMethodTypes,
  createStripeCheckoutSessionDirectCharge,
  pickCheckoutPaymentMethodConfiguration,
} from "@/lib/stripe/stripe-connect";

const config = (overrides: Partial<{ id: string; active: boolean; is_default: boolean; application: string | null }>) => ({
  id: "pmc",
  active: true,
  is_default: false,
  application: null,
  ...overrides,
});

describe("pickCheckoutPaymentMethodConfiguration", () => {
  test("prefers the default configuration our platform manages for the account", () => {
    const picked = pickCheckoutPaymentMethodConfiguration([
      config({ id: "own-default", is_default: true }),
      config({ id: "platform-default", is_default: true, application: "ca_platform" }),
    ]);

    expect(picked?.id).toBe("platform-default");
  });

  test("falls back to the account's own default, then to any active one", () => {
    expect(
      pickCheckoutPaymentMethodConfiguration([
        config({ id: "other" }),
        config({ id: "own-default", is_default: true }),
      ])?.id,
    ).toBe("own-default");
    expect(pickCheckoutPaymentMethodConfiguration([config({ id: "only" })])?.id).toBe("only");
  });

  test("ignores inactive configurations", () => {
    expect(
      pickCheckoutPaymentMethodConfiguration([
        config({ id: "off", is_default: true, active: false }),
      ]),
    ).toBeNull();
  });
});

describe("availablePaymentMethodTypes", () => {
  test("lists the methods Stripe marks available and nothing else", () => {
    expect(
      availablePaymentMethodTypes({
        id: "pmc",
        active: true,
        is_default: true,
        application: null,
        card: { available: true, display_preference: { value: "on" } },
        apple_pay: { available: true, display_preference: { value: "on" } },
        google_pay: { available: false, display_preference: { value: "off" } },
        konbini: { available: false, display_preference: { value: "on" } },
      }),
    ).toEqual(["card", "apple_pay"]);
  });
});

describe("createStripeCheckoutSessionDirectCharge", () => {
  test("keeps konbini off Checkout even if the teacher has it turned on", async () => {
    vi.stubEnv("STRIPE_SECRET_KEY", "sk_test_123");
    createSessionMock.mockResolvedValue({ id: "cs_1" });

    await createStripeCheckoutSessionDirectCharge({
      connectedAccountId: "acct_123",
      paymentId: "pay-1",
      bookingId: "booking-1",
      amountYen: 3000,
      applicationFeeAmountYen: 300,
      productName: "Lesson",
      successUrl: "https://example.test/success",
      cancelUrl: "https://example.test/cancel",
    });

    expect(createSessionMock).toHaveBeenCalledWith(
      expect.objectContaining({ excluded_payment_method_types: ["konbini"] }),
      { stripeAccount: "acct_123" },
    );
    vi.unstubAllEnvs();
  });
});
