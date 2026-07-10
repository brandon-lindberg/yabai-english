import { beforeEach, describe, expect, test, vi } from "vitest";
import {
  calculateRefundProcessingFeeYen,
  calculateRefundSplit,
  issueAutomaticRefundForBooking,
  REFUND_PROCESSING_FEE_BPS,
  resolvePlatformFeeKeepYen,
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

function stripeBooking(metadataJson?: unknown) {
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
        metadataJson,
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

describe("calculateRefundProcessingFeeYen", () => {
  test("is always a flat 10% of the lesson price", () => {
    expect(REFUND_PROCESSING_FEE_BPS).toBe(1000);
    expect(calculateRefundProcessingFeeYen(5000)).toBe(500);
    expect(calculateRefundProcessingFeeYen(3333)).toBe(333);
  });
});

describe("resolvePlatformFeeKeepYen", () => {
  test("keeps the full stored application fee on refund", () => {
    expect(resolvePlatformFeeKeepYen(5000, 1000)).toBe(1000);
  });

  test("falls back to the 10% processing fee when metadata is missing", () => {
    expect(resolvePlatformFeeKeepYen(5000, null)).toBe(500);
  });
});

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

  test("teacher may pass only the flat 10% processing fee to the student", () => {
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

  test("pass-through never deducts more than 10% even when the platform fee was higher", () => {
    const split = calculateRefundSplit({
      amountYen: 5000,
      applicationFeeAmountYen: 1000,
      refundFeePassedToStudent: true,
      actor: "STUDENT",
    });

    expect(split.studentRefundYen).toBe(4500);
    expect(split.processingFeeYen).toBe(500);
  });

  test("student is always made whole when the teacher cancels", () => {
    const split = calculateRefundSplit({
      amountYen: 5000,
      refundFeePassedToStudent: true,
      actor: "TEACHER",
    });

    expect(split.studentRefundYen).toBe(5000);
  });
});

describe("issueAutomaticRefundForBooking", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  test("refunds the student in full and keeps the full platform application fee", async () => {
    const prisma = refundPrisma();
    createStripeRefundMock.mockResolvedValue({ id: "re_123", status: "succeeded" });
    createAppFeeRefundMock.mockResolvedValue(null);

    const refund = await issueAutomaticRefundForBooking(prisma, {
      actor: "STUDENT",
      policy: refundEligiblePolicy,
      booking: stripeBooking({ applicationFeeAmountYen: 1000 }),
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
      keepYen: 1000,
      paymentId: "payment-1",
      bookingId: "booking-1",
    });
  });

  test("deducts only the 10% processing fee when the teacher passes it to the student", async () => {
    const prisma = refundPrisma();
    createStripeRefundMock.mockResolvedValue({ id: "re_123", status: "succeeded" });
    createAppFeeRefundMock.mockResolvedValue(null);

    await issueAutomaticRefundForBooking(prisma, {
      actor: "STUDENT",
      policy: refundEligiblePolicy,
      booking: stripeBooking({ applicationFeeAmountYen: 1000 }),
      refundFeePassedToStudent: true,
    });

    expect(createStripeRefundMock).toHaveBeenCalledWith(
      expect.objectContaining({ amountYen: 4500 }),
    );
    expect(createAppFeeRefundMock).toHaveBeenCalledWith(
      expect.objectContaining({ keepYen: 1000 }),
    );
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
      booking: stripeBooking({ applicationFeeAmountYen: 1000 }),
      refundFeePassedToStudent: false,
    });

    expect(refund).toBeNull();
    expect(prisma.refund.create).not.toHaveBeenCalled();
  });
});
