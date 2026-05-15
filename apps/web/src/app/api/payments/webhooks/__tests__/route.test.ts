import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import { signPaymentWebhookPayload } from "@/lib/payment-webhook-signature";

const { prismaMock, confirmPaidBookingMock } = vi.hoisted(() => ({
  prismaMock: {
    paymentWebhookEvent: { createMany: vi.fn() },
    payment: { update: vi.fn() },
  },
  confirmPaidBookingMock: vi.fn(),
}));

vi.mock("@/lib/prisma", () => ({ prisma: prismaMock }));
vi.mock("@/lib/booking-payment-confirmation", () => ({
  confirmPaidBookingFromPayment: confirmPaidBookingMock,
}));

import { POST } from "@/app/api/payments/webhooks/route";

describe("POST /api/payments/webhooks", () => {
  const previousSecret = process.env.PAYMENT_WEBHOOK_SECRET;

  beforeEach(() => {
    vi.clearAllMocks();
    process.env.PAYMENT_WEBHOOK_SECRET = "test-webhook-secret";
    prismaMock.paymentWebhookEvent.createMany.mockResolvedValue({ count: 1 });
    prismaMock.payment.update.mockResolvedValue({
      id: "payment-1",
      bookingId: "booking-1",
      status: "SUCCEEDED",
    });
    confirmPaidBookingMock.mockResolvedValue({
      ok: true,
      booking: { id: "booking-1", status: "CONFIRMED" },
    });
  });

  afterEach(() => {
    process.env.PAYMENT_WEBHOOK_SECRET = previousSecret;
  });

  function signedRequest(body: object) {
    const rawBody = JSON.stringify(body);
    return new Request("http://localhost/api/payments/webhooks", {
      method: "POST",
      headers: {
        "x-payment-webhook-signature": signPaymentWebhookPayload(
          rawBody,
          process.env.PAYMENT_WEBHOOK_SECRET ?? "",
        ),
      },
      body: rawBody,
    });
  }

  test("confirms booking only after successful payment webhook", async () => {
    const res = await POST(
      signedRequest({
        provider: "STRIPE",
        eventId: "evt-1",
        eventType: "checkout.session.completed",
        paymentId: "payment-1",
        providerPaymentId: "pi-1",
        status: "SUCCEEDED",
      }),
    );

    expect(res.status).toBe(200);
    expect(prismaMock.payment.update).toHaveBeenCalledWith({
      where: { id: "payment-1" },
      data: expect.objectContaining({
        status: "SUCCEEDED",
        providerPaymentId: "pi-1",
      }),
    });
    expect(confirmPaidBookingMock).toHaveBeenCalledWith("booking-1");
  });

  test("duplicate webhook event is idempotent", async () => {
    prismaMock.paymentWebhookEvent.createMany.mockResolvedValue({ count: 0 });

    const res = await POST(
      signedRequest({
        provider: "STRIPE",
        eventId: "evt-1",
        eventType: "checkout.session.completed",
        paymentId: "payment-1",
        status: "SUCCEEDED",
      }),
    );

    expect(res.status).toBe(200);
    await expect(res.json()).resolves.toEqual({ ok: true, duplicate: true });
    expect(prismaMock.payment.update).not.toHaveBeenCalled();
    expect(confirmPaidBookingMock).not.toHaveBeenCalled();
  });

  test("rejects unsigned webhook events", async () => {
    const res = await POST(
      new Request("http://localhost/api/payments/webhooks", {
        method: "POST",
        body: JSON.stringify({
          provider: "STRIPE",
          eventId: "evt-1",
          eventType: "checkout.session.completed",
          paymentId: "payment-1",
          status: "SUCCEEDED",
        }),
      }),
    );

    expect(res.status).toBe(401);
    expect(prismaMock.paymentWebhookEvent.createMany).not.toHaveBeenCalled();
    expect(prismaMock.payment.update).not.toHaveBeenCalled();
    expect(confirmPaidBookingMock).not.toHaveBeenCalled();
  });
});
