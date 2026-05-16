import { describe, expect, test, vi } from "vitest";
import { issueAutomaticRefundForBooking } from "@/lib/payment-refunds";

const { createStripeRefundMock } = vi.hoisted(() => ({
  createStripeRefundMock: vi.fn(),
}));

vi.mock("@/lib/stripe/stripe-connect", () => ({
  createStripeRefundDirectCharge: createStripeRefundMock,
}));

describe("issueAutomaticRefundForBooking", () => {
  test("creates Stripe direct-charge refund without refunding platform fee", async () => {
    const prisma = {
      refund: { create: vi.fn().mockResolvedValue({ id: "refund-1" }) },
      paymentLedgerEntry: { createMany: vi.fn().mockResolvedValue({ count: 1 }) },
    };
    createStripeRefundMock.mockResolvedValue({ id: "re_123", status: "succeeded" });

    const refund = await issueAutomaticRefundForBooking(prisma, {
      actor: "STUDENT",
      policy: {
        allowed: true,
        refundEligible: true,
        rescheduleOffered: false,
        studentCompensationFreeLesson: false,
      },
      booking: {
        id: "booking-1",
        quotedPriceYen: 5000,
        payments: [
          {
            id: "payment-1",
            provider: "STRIPE",
            amountYen: 5000,
            status: "SUCCEEDED",
            providerPaymentId: "pi_123",
            teacherPaymentAccount: {
              providerAccountId: "acct_123",
            },
          },
        ],
      },
    });

    expect(refund).toEqual({ id: "refund-1" });
    expect(createStripeRefundMock).toHaveBeenCalledWith({
      connectedAccountId: "acct_123",
      paymentIntentId: "pi_123",
      amountYen: 5000,
      paymentId: "payment-1",
      bookingId: "booking-1",
    });
    expect(prisma.refund.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        bookingId: "booking-1",
        paymentId: "payment-1",
        provider: "STRIPE",
        providerRefundId: "re_123",
        amountYen: 5000,
        status: "SUCCEEDED",
      }),
    });
    expect(prisma.paymentLedgerEntry.createMany).toHaveBeenCalledWith({
      data: [
        { paymentId: "payment-1", type: "REFUND", amountYen: -5000 },
      ],
    });
  });

  test("maps pending Stripe refunds to local pending state", async () => {
    const prisma = {
      refund: { create: vi.fn().mockResolvedValue({ id: "refund-1" }) },
      paymentLedgerEntry: { createMany: vi.fn().mockResolvedValue({ count: 1 }) },
    };
    createStripeRefundMock.mockResolvedValue({ id: "re_123", status: "pending" });

    await issueAutomaticRefundForBooking(prisma, {
      actor: "STUDENT",
      policy: {
        allowed: true,
        refundEligible: true,
        rescheduleOffered: false,
        studentCompensationFreeLesson: false,
      },
      booking: {
        id: "booking-1",
        quotedPriceYen: 5000,
        payments: [
          {
            id: "payment-1",
            provider: "STRIPE",
            amountYen: 5000,
            status: "SUCCEEDED",
            providerPaymentId: "pi_123",
            teacherPaymentAccount: {
              providerAccountId: "acct_123",
            },
          },
        ],
      },
    });

    expect(prisma.refund.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        status: "PENDING",
      }),
    });
  });

  test("does nothing when policy is not refund eligible", async () => {
    const prisma = {
      refund: { create: vi.fn() },
      paymentLedgerEntry: { createMany: vi.fn() },
    };

    const refund = await issueAutomaticRefundForBooking(prisma, {
      actor: "STUDENT",
      policy: {
        allowed: true,
        refundEligible: false,
        rescheduleOffered: true,
        studentCompensationFreeLesson: false,
      },
      booking: {
        id: "booking-1",
        quotedPriceYen: 5000,
        payments: [
          {
            id: "payment-1",
            provider: "STRIPE",
            amountYen: 5000,
            status: "SUCCEEDED",
          },
        ],
      },
    });

    expect(refund).toBeNull();
    expect(prisma.refund.create).not.toHaveBeenCalled();
  });
});
