import { beforeEach, describe, expect, test, vi } from "vitest";

const { prismaMock, confirmPaidBookingMock } = vi.hoisted(() => ({
  prismaMock: {
    payment: {
      findUnique: vi.fn(),
      update: vi.fn(),
    },
    booking: {
      findUnique: vi.fn(),
    },
  },
  confirmPaidBookingMock: vi.fn(),
}));

vi.mock("@/lib/prisma", () => ({ prisma: prismaMock }));
vi.mock("@/lib/booking-payment-confirmation", () => ({
  confirmPaidBookingFromPayment: confirmPaidBookingMock,
}));

import { confirmBookingFromStripeCheckoutSession } from "@/lib/stripe/confirm-booking-from-stripe-checkout";

describe("confirmBookingFromStripeCheckoutSession", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    prismaMock.payment.findUnique.mockResolvedValue({
      id: "pay-1",
      bookingId: "booking-1",
      status: "REQUIRES_ACTION",
      providerCheckoutId: "cs_test_123",
    });
    prismaMock.booking.findUnique.mockResolvedValue({ status: "PENDING_PAYMENT" });
    prismaMock.payment.update.mockResolvedValue({
      id: "pay-1",
      bookingId: "booking-1",
      status: "SUCCEEDED",
    });
    confirmPaidBookingMock.mockResolvedValue({
      ok: true,
      booking: { id: "booking-1", status: "CONFIRMED" },
    });
  });

  test("confirms booking when checkout session is paid", async () => {
    const result = await confirmBookingFromStripeCheckoutSession({
      id: "cs_test_123",
      payment_status: "paid",
      metadata: { paymentId: "pay-1", bookingId: "booking-1" },
      payment_intent: "pi_test_123",
    });

    expect(result).toEqual({
      ok: true,
      bookingStatus: "CONFIRMED",
      alreadyConfirmed: false,
    });
    expect(prismaMock.payment.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: "pay-1" },
        data: expect.objectContaining({
          status: "SUCCEEDED",
          providerCheckoutId: "cs_test_123",
          providerPaymentId: "pi_test_123",
        }),
      }),
    );
    expect(confirmPaidBookingMock).toHaveBeenCalledWith("booking-1");
  });

  test("rejects unpaid checkout sessions", async () => {
    const result = await confirmBookingFromStripeCheckoutSession({
      id: "cs_test_123",
      payment_status: "unpaid",
      metadata: { paymentId: "pay-1", bookingId: "booking-1" },
    });

    expect(result).toEqual({ ok: false, reason: "NOT_PAID" });
    expect(prismaMock.payment.update).not.toHaveBeenCalled();
  });

  test("is idempotent when booking is already confirmed", async () => {
    prismaMock.payment.findUnique.mockResolvedValue({
      id: "pay-1",
      bookingId: "booking-1",
      status: "SUCCEEDED",
      providerCheckoutId: "cs_test_123",
    });
    prismaMock.booking.findUnique.mockResolvedValue({ status: "CONFIRMED" });
    confirmPaidBookingMock.mockResolvedValue({
      ok: true,
      booking: { id: "booking-1", status: "CONFIRMED" },
    });

    const result = await confirmBookingFromStripeCheckoutSession({
      id: "cs_test_123",
      payment_status: "paid",
      metadata: { paymentId: "pay-1", bookingId: "booking-1" },
    });

    expect(result).toEqual({
      ok: true,
      bookingStatus: "CONFIRMED",
      alreadyConfirmed: true,
    });
    expect(prismaMock.payment.update).not.toHaveBeenCalled();
  });

  test("rejects checkout sessions that do not match the stored payment", async () => {
    const result = await confirmBookingFromStripeCheckoutSession({
      id: "cs_test_other",
      payment_status: "paid",
      metadata: { paymentId: "pay-1", bookingId: "booking-1" },
    });

    expect(result).toEqual({ ok: false, reason: "CHECKOUT_MISMATCH" });
  });
});
