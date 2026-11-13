import { afterEach, expect, test, vi } from "vitest";
const { refund } = vi.hoisted(() => ({ refund: vi.fn().mockResolvedValue({ id: "refund" }) }));
vi.mock("server-only", () => ({}));
vi.mock("stripe", () => ({ default: class { refunds = { create: refund }; } }));
import { createStripeRefundDirectCharge } from "../stripe-connect";
afterEach(() => vi.unstubAllEnvs());
test("full lesson refund retries use one stable provider idempotency key", async () => {
  vi.stubEnv("STRIPE_SECRET_KEY", "sk_test_localmockonly");
  const input = { connectedAccountId: "account", paymentIntentId: "intent", amountYen: 5000, paymentId: "payment", bookingId: "booking" };
  await createStripeRefundDirectCharge(input); await createStripeRefundDirectCharge(input);
  expect(refund.mock.calls.map(call => call[1])).toEqual([
    { stripeAccount: "account", idempotencyKey: "lesson-refund:payment" },
    { stripeAccount: "account", idempotencyKey: "lesson-refund:payment" },
  ]);
});
