import { beforeEach, describe, expect, test, vi } from "vitest";

const { prismaMock, constructEventMock, confirmFromCheckoutMock } = vi.hoisted(() => ({
  prismaMock: {
    paymentWebhookEvent: { createMany: vi.fn() },
    payment: { update: vi.fn(), updateMany: vi.fn() },
    refund: { updateMany: vi.fn() },
    teacherPaymentAccount: { findFirst: vi.fn(), findMany: vi.fn(), update: vi.fn(), updateMany: vi.fn() },
    teacherPaymentMethod: { upsert: vi.fn(), updateMany: vi.fn() },
  },
  constructEventMock: vi.fn(),
  confirmFromCheckoutMock: vi.fn(),
}));

vi.mock("@/lib/prisma", () => ({ prisma: prismaMock }));
vi.mock("@/lib/stripe/stripe-connect", () => ({
  constructStripeWebhookEvent: constructEventMock,
}));
vi.mock("@/lib/stripe/confirm-booking-from-stripe-checkout", () => ({
  confirmBookingFromStripeCheckoutSession: confirmFromCheckoutMock,
}));

import { POST } from "@/app/api/payments/webhooks/stripe/route";

describe("POST /api/payments/webhooks/stripe", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    prismaMock.paymentWebhookEvent.createMany.mockResolvedValue({ count: 1 });
    prismaMock.refund.updateMany.mockResolvedValue({ count: 1 });
    confirmFromCheckoutMock.mockResolvedValue({
      ok: true,
      bookingStatus: "CONFIRMED",
      alreadyConfirmed: false,
    });
  });

  test("confirms booking from checkout.session.completed", async () => {
    constructEventMock.mockReturnValue({
      id: "evt_1",
      type: "checkout.session.completed",
      account: "acct_123",
      data: {
        object: {
          id: "cs_123",
          payment_intent: "pi_123",
          payment_status: "paid",
          metadata: {
            paymentId: "payment-1",
            bookingId: "booking-1",
          },
        },
      },
    });

    const res = await POST(
      new Request("http://localhost/api/payments/webhooks/stripe", {
        method: "POST",
        headers: { "stripe-signature": "sig_123" },
        body: JSON.stringify({ id: "evt_1" }),
      }),
    );

    expect(res.status).toBe(200);
    expect(constructEventMock).toHaveBeenCalledWith(JSON.stringify({ id: "evt_1" }), "sig_123");
    expect(prismaMock.paymentWebhookEvent.createMany).toHaveBeenCalledWith(
      expect.objectContaining({
        data: [expect.objectContaining({
          provider: "STRIPE",
          providerEventId: "evt_1",
          eventType: "checkout.session.completed",
        })],
        skipDuplicates: true,
      }),
    );
    expect(confirmFromCheckoutMock).toHaveBeenCalledWith(
      expect.objectContaining({
        id: "cs_123",
        payment_status: "paid",
        metadata: {
          paymentId: "payment-1",
          bookingId: "booking-1",
        },
      }),
    );
  });

  test("does not confirm booking when checkout.session.completed is not yet paid", async () => {
    constructEventMock.mockReturnValue({
      id: "evt_unpaid",
      type: "checkout.session.completed",
      account: "acct_123",
      data: {
        object: {
          id: "cs_123",
          payment_intent: "pi_123",
          payment_status: "unpaid",
          metadata: {
            paymentId: "payment-1",
            bookingId: "booking-1",
          },
        },
      },
    });

    const res = await POST(
      new Request("http://localhost/api/payments/webhooks/stripe", {
        method: "POST",
        headers: { "stripe-signature": "sig_123" },
        body: "{}",
      }),
    );

    expect(res.status).toBe(200);
    await expect(res.json()).resolves.toEqual(
      expect.objectContaining({ ok: true, pendingPayment: true }),
    );
    expect(prismaMock.payment.update).not.toHaveBeenCalled();
    expect(confirmFromCheckoutMock).not.toHaveBeenCalled();
  });

  test("confirms booking from checkout.session.async_payment_succeeded", async () => {
    constructEventMock.mockReturnValue({
      id: "evt_async_ok",
      type: "checkout.session.async_payment_succeeded",
      account: "acct_123",
      data: {
        object: {
          id: "cs_123",
          payment_intent: "pi_123",
          payment_status: "paid",
          metadata: {
            paymentId: "payment-1",
            bookingId: "booking-1",
          },
        },
      },
    });

    const res = await POST(
      new Request("http://localhost/api/payments/webhooks/stripe", {
        method: "POST",
        headers: { "stripe-signature": "sig_123" },
        body: "{}",
      }),
    );

    expect(res.status).toBe(200);
    expect(confirmFromCheckoutMock).toHaveBeenCalledWith(
      expect.objectContaining({
        id: "cs_123",
        payment_status: "paid",
      }),
    );
  });

  test("marks payment failed on checkout.session.async_payment_failed", async () => {
    prismaMock.payment.updateMany.mockResolvedValue({ count: 1 });
    constructEventMock.mockReturnValue({
      id: "evt_async_fail",
      type: "checkout.session.async_payment_failed",
      account: "acct_123",
      data: {
        object: {
          id: "cs_123",
          metadata: {
            paymentId: "payment-1",
            bookingId: "booking-1",
          },
        },
      },
    });

    const res = await POST(
      new Request("http://localhost/api/payments/webhooks/stripe", {
        method: "POST",
        headers: { "stripe-signature": "sig_123" },
        body: "{}",
      }),
    );

    expect(res.status).toBe(200);
    expect(prismaMock.payment.updateMany).toHaveBeenCalledWith({
      where: { id: "payment-1", status: { not: "SUCCEEDED" } },
      data: expect.objectContaining({ status: "FAILED" }),
    });
    expect(confirmFromCheckoutMock).not.toHaveBeenCalled();
  });

  test("checkout.session.expired never overwrites a succeeded payment", async () => {
    prismaMock.payment.updateMany.mockResolvedValue({ count: 0 });
    constructEventMock.mockReturnValue({
      id: "evt_expired",
      type: "checkout.session.expired",
      data: {
        object: {
          id: "cs_123",
          metadata: { paymentId: "payment-1" },
        },
      },
    });

    const res = await POST(
      new Request("http://localhost/api/payments/webhooks/stripe", {
        method: "POST",
        headers: { "stripe-signature": "sig_123" },
        body: "{}",
      }),
    );

    expect(res.status).toBe(200);
    expect(prismaMock.payment.updateMany).toHaveBeenCalledWith({
      where: { id: "payment-1", status: { not: "SUCCEEDED" } },
      data: expect.objectContaining({ status: "EXPIRED" }),
    });
    expect(prismaMock.payment.update).not.toHaveBeenCalled();
  });

  test("duplicate Stripe event is harmless", async () => {
    prismaMock.paymentWebhookEvent.createMany.mockResolvedValue({ count: 0 });
    constructEventMock.mockReturnValue({
      id: "evt_1",
      type: "checkout.session.completed",
      data: { object: { metadata: { paymentId: "payment-1" } } },
    });

    const res = await POST(
      new Request("http://localhost/api/payments/webhooks/stripe", {
        method: "POST",
        headers: { "stripe-signature": "sig_123" },
        body: "{}",
      }),
    );

    expect(res.status).toBe(200);
    await expect(res.json()).resolves.toEqual({ ok: true, duplicate: true });
    expect(prismaMock.payment.update).not.toHaveBeenCalled();
    expect(confirmFromCheckoutMock).not.toHaveBeenCalled();
  });

  test("account.updated syncs connected account readiness", async () => {
    constructEventMock.mockReturnValue({
      id: "evt_account",
      type: "account.updated",
      account: "acct_123",
      data: {
        object: {
          id: "acct_123",
          charges_enabled: true,
          payouts_enabled: true,
          requirements: { currently_due: [], past_due: [] },
        },
      },
    });
    prismaMock.teacherPaymentAccount.findFirst.mockResolvedValue({ id: "payacct-1" });

    const res = await POST(
      new Request("http://localhost/api/payments/webhooks/stripe", {
        method: "POST",
        headers: { "stripe-signature": "sig_123" },
        body: "{}",
      }),
    );

    expect(res.status).toBe(200);
    expect(prismaMock.teacherPaymentAccount.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: "payacct-1" },
        data: expect.objectContaining({ status: "ENABLED" }),
      }),
    );
    expect(prismaMock.teacherPaymentMethod.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { accountId_method: { accountId: "payacct-1", method: "CARD" } },
        update: { enabled: true },
      }),
    );
  });

  test("account.application.deauthorized disables local Stripe account and method", async () => {
    constructEventMock.mockReturnValue({
      id: "evt_deauth",
      type: "account.application.deauthorized",
      account: "acct_123",
      data: { object: { account: "acct_123" } },
    });
    prismaMock.teacherPaymentAccount.findMany.mockResolvedValue([{ id: "payacct-1" }]);

    const res = await POST(
      new Request("http://localhost/api/payments/webhooks/stripe", {
        method: "POST",
        headers: { "stripe-signature": "sig_123" },
        body: "{}",
      }),
    );

    expect(res.status).toBe(200);
    expect(prismaMock.teacherPaymentMethod.updateMany).toHaveBeenCalledWith({
      where: { accountId: { in: ["payacct-1"] } },
      data: { enabled: false },
    });
    expect(prismaMock.teacherPaymentAccount.updateMany).toHaveBeenCalledWith({
      where: { id: { in: ["payacct-1"] } },
      data: expect.objectContaining({
        status: "DISABLED",
        providerAccountId: null,
      }),
    });
  });

  test.each([
    ["refund.updated", "succeeded", "SUCCEEDED"],
    ["refund.updated", "pending", "PENDING"],
    ["charge.refund.updated", "requires_action", "PENDING"],
  ])("records the settled status from %s (%s)", async (type, stripeStatus, stored) => {
    constructEventMock.mockReturnValue({
      id: `evt_${type}_${stripeStatus}`,
      type,
      account: "acct_123",
      data: { object: { id: "re_123", status: stripeStatus } },
    });

    const res = await POST(
      new Request("http://localhost/api/payments/webhooks/stripe", {
        method: "POST",
        headers: { "stripe-signature": "sig_123" },
        body: "{}",
      }),
    );

    expect(res.status).toBe(200);
    expect(prismaMock.refund.updateMany).toHaveBeenCalledWith({
      where: { provider: "STRIPE", providerRefundId: "re_123" },
      data: { status: stored },
    });
  });

  // A refund that did not complete leaves the student out of pocket, so it goes
  // to the recovery queue rather than resting in a terminal FAILED state.
  test.each([
    ["refund.failed", "failed", "insufficient_funds", "insufficient_funds"],
    ["charge.refund.updated", "canceled", undefined, "canceled"],
  ])(
    "sends an uncompleted refund to recovery from %s (%s)",
    async (type, stripeStatus, failureReason, expectedNote) => {
      constructEventMock.mockReturnValue({
        id: `evt_${type}_${stripeStatus}`,
        type,
        account: "acct_123",
        data: {
          object: {
            id: "re_456",
            status: stripeStatus,
            ...(failureReason ? { failure_reason: failureReason } : {}),
          },
        },
      });

      const res = await POST(
        new Request("http://localhost/api/payments/webhooks/stripe", {
          method: "POST",
          headers: { "stripe-signature": "sig_123" },
          body: "{}",
        }),
      );

      expect(res.status).toBe(200);
      expect(prismaMock.refund.updateMany).toHaveBeenCalledWith({
        where: { provider: "STRIPE", providerRefundId: "re_456" },
        data: {
          status: "PENDING_RECOVERY",
          recoveryNote: expect.stringContaining(expectedNote),
        },
      });
    },
  );

  test("ignores a refund event that carries no refund id", async () => {
    constructEventMock.mockReturnValue({
      id: "evt_refund_noid",
      type: "refund.updated",
      account: "acct_123",
      data: { object: { status: "succeeded" } },
    });

    const res = await POST(
      new Request("http://localhost/api/payments/webhooks/stripe", {
        method: "POST",
        headers: { "stripe-signature": "sig_123" },
        body: "{}",
      }),
    );

    expect(res.status).toBe(200);
    expect(prismaMock.refund.updateMany).not.toHaveBeenCalled();
  });
});
