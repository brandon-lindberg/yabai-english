import { describe, expect, test, vi } from "vitest";
import { issueAutomaticRefundForBooking } from "@/lib/payment-refunds";

describe("issueAutomaticRefundForBooking", () => {
  test("creates refund and transfer reversal ledger for eligible succeeded payment", async () => {
    const prisma = {
      refund: { create: vi.fn().mockResolvedValue({ id: "refund-1" }) },
      paymentLedgerEntry: { createMany: vi.fn().mockResolvedValue({ count: 2 }) },
    };

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
          },
        ],
      },
    });

    expect(refund).toEqual({ id: "refund-1" });
    expect(prisma.refund.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        bookingId: "booking-1",
        paymentId: "payment-1",
        provider: "STRIPE",
        amountYen: 5000,
        status: "SUCCEEDED",
      }),
    });
    expect(prisma.paymentLedgerEntry.createMany).toHaveBeenCalledWith({
      data: [
        { paymentId: "payment-1", type: "REFUND", amountYen: -5000 },
        { paymentId: "payment-1", type: "TRANSFER_REVERSAL", amountYen: 5000 },
      ],
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
