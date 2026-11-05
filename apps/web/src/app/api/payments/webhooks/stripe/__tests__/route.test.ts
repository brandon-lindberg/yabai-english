// Handler contracts; durable receipt/concurrency/refund contracts use real PostgreSQL in tests/mirror/payment-recovery.test.ts.
import { beforeEach, describe, expect, test, vi } from "vitest";

const { prismaMock, constructEventMock, confirmFromCheckoutMock, notifyStuckRefundMock } = vi.hoisted(() => ({
  prismaMock: {
    paymentWebhookEvent: { createMany: vi.fn() },
    payment: { findUnique: vi.fn(), update: vi.fn(), updateMany: vi.fn() },
    refund: { updateMany: vi.fn(), findFirst: vi.fn(), findUnique: vi.fn(), update: vi.fn() },
    teacherPaymentAccount: { findFirst: vi.fn(), findMany: vi.fn(), findUnique: vi.fn(), update: vi.fn(), updateMany: vi.fn() },
    teacherPaymentMethod: { upsert: vi.fn(), updateMany: vi.fn() },
  },
  constructEventMock: vi.fn(),
  notifyStuckRefundMock: vi.fn(),
  confirmFromCheckoutMock: vi.fn(),
}));

vi.mock("@/lib/prisma", () => ({ prisma: prismaMock }));
vi.mock("@/lib/stripe/stripe-connect", () => ({
  constructStripeWebhookEvent: constructEventMock,
  retrieveStripeCheckoutMethods: vi.fn().mockResolvedValue(["card"]),
}));
vi.mock("@/lib/stripe/confirm-booking-from-stripe-checkout", () => ({
  confirmBookingFromStripeCheckoutSession: confirmFromCheckoutMock,
}));
vi.mock("@/lib/refund-notifications", () => ({
  notifySuperAdminsOfStuckRefund: notifyStuckRefundMock,
}));

import { POST } from "@/app/api/payments/webhooks/stripe/route";

describe("POST /api/payments/webhooks/stripe", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    prismaMock.payment.findUnique.mockImplementation(async () => ({ provider: "STRIPE", metadataJson: { connectedAccountId: "acct_123" }, providerCheckoutId: constructEventMock.mock.results.at(-1)?.value?.data?.object?.id }));
    prismaMock.paymentWebhookEvent.createMany.mockResolvedValue({ count: 1 });
    // Read either side of the account sync to detect a phase change. Identical
    // rows mean no phase change and no notification, so these tests stay about
    // the webhook's own behaviour.
    prismaMock.teacherPaymentAccount.findUnique.mockResolvedValue({
      id: "payacct-1",
      provider: "STRIPE",
      providerAccountId: "acct_123",
      status: "PENDING",
      chargesEnabled: false,
      payoutsEnabled: false,
      requirementsDue: [],
      detailsSubmitted: false,
      pendingVerification: [],
      disabledReason: null,
      methods: [],
      teacher: { userId: "teacher-user-1" },
    });
    prismaMock.refund.updateMany.mockResolvedValue({ count: 1 });
    prismaMock.refund.findFirst.mockResolvedValue({
      amountYen: 5000,
      booking: { student: { name: "Aki" } },
    });
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
      }), { connectedAccountId: "acct_123" },
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
      }), { connectedAccountId: "acct_123" },
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
      where: { id: "payment-1", status: { notIn: ["SUCCEEDED", "REFUNDED"] } },
      data: expect.objectContaining({ status: "FAILED" }),
    });
    expect(confirmFromCheckoutMock).not.toHaveBeenCalled();
  });

  test("checkout.session.expired never overwrites a succeeded payment", async () => {
    prismaMock.payment.updateMany.mockResolvedValue({ count: 0 });
    constructEventMock.mockReturnValue({
      id: "evt_expired",
      type: "checkout.session.expired", account: "acct_123",
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
      where: { id: "payment-1", status: { notIn: ["SUCCEEDED", "REFUNDED"] } },
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
});

vi.mock("@/lib/stripe/webhook-work", () => ({ receiveStripeWebhook: async (db: unknown, event: unknown) => {
  const typed = event as {id:string;type:string};
  const claim = await prismaMock.paymentWebhookEvent.createMany({ data: [{ provider: "STRIPE", providerEventId: typed.id, eventType: typed.type }], skipDuplicates:true });
  if (!claim.count) return new Response(JSON.stringify({ ok: true, duplicate: true }));
  const { dispatchStripeWebhook } = await import("@/lib/stripe/webhook-handler");
  return dispatchStripeWebhook(db as never, event as never);
} }));
