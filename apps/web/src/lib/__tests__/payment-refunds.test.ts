import { beforeEach, describe, expect, test, vi } from "vitest";
import {
  calculateRefundSplit,
  issueAutomaticRefundForBooking,
  REFUND_PROCESSING_FEE_BPS,
} from "@/lib/payment-refunds";

const { createStripeRefundMock, createAppFeeRefundMock } = vi.hoisted(() => ({
  createStripeRefundMock: vi.fn(),
  createAppFeeRefundMock: vi.fn(),
}));

vi.mock("@/lib/stripe/stripe-connect", () => ({
  createStripeRefundDirectCharge: createStripeRefundMock,
  createStripeApplicationFeeRefundKeepingProcessingFee: createAppFeeRefundMock,
}));

function refundPrisma() {
  return {
    refund: { create: vi.fn().mockResolvedValue({ id: "refund-1" }) },
    paymentLedgerEntry: { createMany: vi.fn().mockResolvedValue({ count: 1 }) },
  };
}

function stripeBooking() {
  return {
    id: "booking-1",
    quotedPriceYen: 5000,
    payments: [
      {
        id: "payment-1",
        provider: "STRIPE" as const,
        amountYen: 5000,
        status: "SUCCEEDED",
        providerPaymentId: "pi_123",
        teacherPaymentAccount: {
          providerAccountId: "acct_123",
        },
      },
    ],
  };
}

const refundEligiblePolicy = {
  allowed: true,
  refundEligible: true,
  rescheduleOffered: false,
  studentCompensationFreeLesson: false,
};

describe("calculateRefundSplit", () => {
  test("teacher covers the processing fee by default: student gets 100%", () => {
    const split = calculateRefundSplit({
      amountYen: 5000,
      refundFeePassedToStudent: false,
      actor: "STUDENT",
    });

    expect(split).toEqual({
      studentRefundYen: 5000,
      processingFeeYen: 500,
    });
  });

  test("teacher may pass the processing fee to the student on student cancellations", () => {
    const split = calculateRefundSplit({
      amountYen: 5000,
      refundFeePassedToStudent: true,
      actor: "STUDENT",
    });

    expect(split).toEqual({
      studentRefundYen: 4500,
      processingFeeYen: 500,
    });
  });

  test("student is always made whole when the teacher cancels", () => {
    const split = calculateRefundSplit({
      amountYen: 5000,
      refundFeePassedToStudent: true,
      actor: "TEACHER",
    });

    expect(split.studentRefundYen).toBe(5000);
  });

  test("processing fee is 10% rounded down", () => {
    expect(REFUND_PROCESSING_FEE_BPS).toBe(1000);
    expect(
      calculateRefundSplit({
        amountYen: 3333,
        refundFeePassedToStudent: true,
        actor: "STUDENT",
      }),
    ).toEqual({
      studentRefundYen: 3000,
      processingFeeYen: 333,
    });
  });
});

describe("issueAutomaticRefundForBooking", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  test("refunds the student in full and returns the application fee minus the 10% processing fee", async () => {
    const prisma = refundPrisma();
    createStripeRefundMock.mockResolvedValue({ id: "re_123", status: "succeeded" });
    createAppFeeRefundMock.mockResolvedValue({ id: "fr_123", amount: 250 });

    const refund = await issueAutomaticRefundForBooking(prisma, {
      actor: "STUDENT",
      policy: refundEligiblePolicy,
      booking: stripeBooking(),
      refundFeePassedToStudent: false,
    });

    expect(refund).toEqual({ id: "refund-1" });
    expect(createStripeRefundMock).toHaveBeenCalledWith({
      connectedAccountId: "acct_123",
      paymentIntentId: "pi_123",
      amountYen: 5000,
      paymentId: "payment-1",
      bookingId: "booking-1",
    });
    expect(createAppFeeRefundMock).toHaveBeenCalledWith({
      connectedAccountId: "acct_123",
      paymentIntentId: "pi_123",
      keepYen: 500,
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
        {
          paymentId: "payment-1",
          type: "PLATFORM_FEE",
          amountYen: -250,
          note: "Application fee refund on cancellation",
        },
      ],
    });
  });

  test("refunds 90% when the teacher passes the processing fee to the student", async () => {
    const prisma = refundPrisma();
    createStripeRefundMock.mockResolvedValue({ id: "re_123", status: "succeeded" });
    createAppFeeRefundMock.mockResolvedValue({ id: "fr_123", amount: 250 });

    await issueAutomaticRefundForBooking(prisma, {
      actor: "STUDENT",
      policy: refundEligiblePolicy,
      booking: stripeBooking(),
      refundFeePassedToStudent: true,
    });

    expect(createStripeRefundMock).toHaveBeenCalledWith(
      expect.objectContaining({ amountYen: 4500 }),
    );
    expect(prisma.refund.create).toHaveBeenCalledWith({
      data: expect.objectContaining({ amountYen: 4500 }),
    });
  });

  test("skips the platform fee ledger entry when no application fee was refunded", async () => {
    const prisma = refundPrisma();
    createStripeRefundMock.mockResolvedValue({ id: "re_123", status: "succeeded" });
    createAppFeeRefundMock.mockResolvedValue(null);

    await issueAutomaticRefundForBooking(prisma, {
      actor: "STUDENT",
      policy: refundEligiblePolicy,
      booking: stripeBooking(),
      refundFeePassedToStudent: false,
    });

    expect(prisma.paymentLedgerEntry.createMany).toHaveBeenCalledWith({
      data: [{ paymentId: "payment-1", type: "REFUND", amountYen: -5000 }],
    });
  });

  test("records a recovery note when the application fee refund fails", async () => {
    const prisma = refundPrisma();
    createStripeRefundMock.mockResolvedValue({ id: "re_123", status: "succeeded" });
    createAppFeeRefundMock.mockRejectedValue(new Error("stripe unavailable"));

    const refund = await issueAutomaticRefundForBooking(prisma, {
      actor: "STUDENT",
      policy: refundEligiblePolicy,
      booking: stripeBooking(),
      refundFeePassedToStudent: false,
    });

    expect(refund).toEqual({ id: "refund-1" });
    expect(prisma.refund.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        providerRefundId: "re_123",
        recoveryNote: expect.stringContaining("Application fee refund failed"),
      }),
    });
  });

  test("maps pending Stripe refunds to local pending state", async () => {
    const prisma = refundPrisma();
    createStripeRefundMock.mockResolvedValue({ id: "re_123", status: "pending" });
    createAppFeeRefundMock.mockResolvedValue(null);

    await issueAutomaticRefundForBooking(prisma, {
      actor: "STUDENT",
      policy: refundEligiblePolicy,
      booking: stripeBooking(),
      refundFeePassedToStudent: false,
    });

    expect(prisma.refund.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        status: "PENDING",
      }),
    });
  });

  test("marks refund for manual recovery when Stripe IDs are missing", async () => {
    const prisma = refundPrisma();
    const booking = stripeBooking();
    booking.payments[0].providerPaymentId = null as unknown as string;

    const refund = await issueAutomaticRefundForBooking(prisma, {
      actor: "STUDENT",
      policy: refundEligiblePolicy,
      booking,
      refundFeePassedToStudent: false,
    });

    expect(refund).toEqual({ id: "refund-1" });
    expect(createStripeRefundMock).not.toHaveBeenCalled();
    expect(prisma.refund.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        status: "PENDING_RECOVERY",
      }),
    });
  });

  test("does nothing when policy is not refund eligible", async () => {
    const prisma = refundPrisma();

    const refund = await issueAutomaticRefundForBooking(prisma, {
      actor: "STUDENT",
      policy: {
        allowed: true,
        refundEligible: false,
        rescheduleOffered: true,
        studentCompensationFreeLesson: false,
      },
      booking: stripeBooking(),
      refundFeePassedToStudent: false,
    });

    expect(refund).toBeNull();
    expect(prisma.refund.create).not.toHaveBeenCalled();
  });
});
