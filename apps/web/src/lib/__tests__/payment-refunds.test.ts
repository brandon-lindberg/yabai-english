import { beforeEach, describe, expect, test, vi } from "vitest";
import { issueAutomaticRefundForBooking } from "@/lib/payment-refunds";

const { createStripeRefundMock, createAppFeeRefundMock } = vi.hoisted(() => ({
  createStripeRefundMock: vi.fn(),
  createAppFeeRefundMock: vi.fn(),
}));

vi.mock("@/lib/stripe/stripe-connect", () => ({
  createStripeRefundDirectCharge: createStripeRefundMock,
  createStripeApplicationFeeRefund: createAppFeeRefundMock,
}));

function refundPrisma() {
  return {
    refund: { create: vi.fn().mockResolvedValue({ id: "refund-1" }) },
    paymentLedgerEntry: { createMany: vi.fn().mockResolvedValue({ count: 1 }) },
  };
}

function stripeBooking(overrides: Partial<{
  providerPaymentId: string | null;
  providerAccountId: string | null;
}> = {}) {
  return {
    id: "booking-1",
    quotedPriceYen: 5000,
    payments: [
      {
        id: "payment-1",
        provider: "STRIPE" as const,
        amountYen: 5000,
        status: "SUCCEEDED",
        providerPaymentId:
          "providerPaymentId" in overrides ? overrides.providerPaymentId : "pi_123",
        teacherPaymentAccount: {
          providerAccountId:
            "providerAccountId" in overrides ? overrides.providerAccountId : "acct_123",
        },
      },
    ],
  };
}

const refundEligiblePolicy = {
  allowed: true,
  refundEligible: true,
  rescheduleOffered: false,
};

describe("issueAutomaticRefundForBooking", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    createStripeRefundMock.mockResolvedValue({ id: "re_123", status: "succeeded" });
    createAppFeeRefundMock.mockResolvedValue({ id: "fr_123", amount: 1000 });
  });

  test("refunds the student the full lesson price", async () => {
    const prisma = refundPrisma();

    const refund = await issueAutomaticRefundForBooking(prisma, {
      actor: "STUDENT",
      policy: refundEligiblePolicy,
      booking: stripeBooking(),
    });

    expect(refund).toEqual({ id: "refund-1" });
    expect(createStripeRefundMock).toHaveBeenCalledWith({
      connectedAccountId: "acct_123",
      paymentIntentId: "pi_123",
      amountYen: 5000,
      paymentId: "payment-1",
      bookingId: "booking-1",
    });
  });

  test("returns the entire application fee to the teacher — the platform retains nothing", async () => {
    const prisma = refundPrisma();

    await issueAutomaticRefundForBooking(prisma, {
      actor: "STUDENT",
      policy: refundEligiblePolicy,
      booking: stripeBooking(),
    });

    expect(createAppFeeRefundMock).toHaveBeenCalledWith({
      connectedAccountId: "acct_123",
      paymentIntentId: "pi_123",
      paymentId: "payment-1",
      bookingId: "booking-1",
    });
  });

  test("refund amount does not depend on who cancelled", async () => {
    const prisma = refundPrisma();

    for (const actor of ["STUDENT", "TEACHER", "SUPER_ADMIN"] as const) {
      createStripeRefundMock.mockClear();
      await issueAutomaticRefundForBooking(prisma, {
        actor,
        policy: refundEligiblePolicy,
        booking: stripeBooking(),
      });
      expect(createStripeRefundMock).toHaveBeenCalledWith(
        expect.objectContaining({ amountYen: 5000 }),
      );
    }
  });

  test("does not read stored fee metadata to size the refund", async () => {
    const prisma = refundPrisma();

    // A payment row carrying no metadata at all must still refund correctly;
    // the fee to return is read from Stripe, never from our own record.
    await issueAutomaticRefundForBooking(prisma, {
      actor: "STUDENT",
      policy: refundEligiblePolicy,
      booking: stripeBooking(),
    });

    expect(createStripeRefundMock).toHaveBeenCalledWith(
      expect.objectContaining({ amountYen: 5000 }),
    );
    expect(createAppFeeRefundMock).toHaveBeenCalledWith(
      expect.not.objectContaining({ keepYen: expect.anything() }),
    );
  });

  test("records the refund and reverses both ledger legs", async () => {
    const prisma = refundPrisma();

    await issueAutomaticRefundForBooking(prisma, {
      actor: "STUDENT",
      policy: refundEligiblePolicy,
      booking: stripeBooking(),
    });

    expect(prisma.refund.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        bookingId: "booking-1",
        paymentId: "payment-1",
        provider: "STRIPE",
        providerRefundId: "re_123",
        amountYen: 5000,
        status: "SUCCEEDED",
        actor: "STUDENT",
        reason: "CANCELLATION_POLICY",
      }),
    });
    expect(prisma.paymentLedgerEntry.createMany).toHaveBeenCalledWith({
      data: [
        { paymentId: "payment-1", type: "REFUND", amountYen: -5000 },
        expect.objectContaining({
          paymentId: "payment-1",
          type: "PLATFORM_FEE",
          amountYen: -1000,
        }),
      ],
    });
  });

  test("omits the platform fee leg when there was no application fee to return", async () => {
    const prisma = refundPrisma();
    createAppFeeRefundMock.mockResolvedValue(null);

    await issueAutomaticRefundForBooking(prisma, {
      actor: "STUDENT",
      policy: refundEligiblePolicy,
      booking: stripeBooking(),
    });

    expect(prisma.paymentLedgerEntry.createMany).toHaveBeenCalledWith({
      data: [{ paymentId: "payment-1", type: "REFUND", amountYen: -5000 }],
    });
  });

  test("flags the refund for recovery when the application fee cannot be returned", async () => {
    const prisma = refundPrisma();
    createAppFeeRefundMock.mockRejectedValue(new Error("insufficient platform balance"));

    await issueAutomaticRefundForBooking(prisma, {
      actor: "STUDENT",
      policy: refundEligiblePolicy,
      booking: stripeBooking(),
    });

    expect(prisma.refund.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        recoveryNote: expect.stringContaining("insufficient platform balance"),
      }),
    });
  });

  test("writes PENDING_RECOVERY when the connected account is unknown", async () => {
    const prisma = refundPrisma();

    const refund = await issueAutomaticRefundForBooking(prisma, {
      actor: "STUDENT",
      policy: refundEligiblePolicy,
      booking: stripeBooking({ providerAccountId: null }),
    });

    expect(refund).toEqual({ id: "refund-1" });
    expect(createStripeRefundMock).not.toHaveBeenCalled();
    expect(prisma.refund.create).toHaveBeenCalledWith({
      data: expect.objectContaining({ status: "PENDING_RECOVERY", amountYen: 5000 }),
    });
  });

  test("does nothing when the policy is not refund eligible", async () => {
    const prisma = refundPrisma();

    const refund = await issueAutomaticRefundForBooking(prisma, {
      actor: "STUDENT",
      policy: { allowed: true, refundEligible: false, rescheduleOffered: true },
      booking: stripeBooking(),
    });

    expect(refund).toBeNull();
    expect(prisma.refund.create).not.toHaveBeenCalled();
  });

  test("refuses to record a refund for a provider it cannot actually refund", async () => {
    const prisma = refundPrisma();
    const booking = {
      id: "booking-1",
      quotedPriceYen: 5000,
      payments: [
        {
          id: "payment-1",
          provider: "KOMOJU" as const,
          amountYen: 5000,
          status: "SUCCEEDED",
          providerPaymentId: "komoju_1",
          teacherPaymentAccount: { providerAccountId: "acct_123" },
        },
      ],
    };

    await expect(
      issueAutomaticRefundForBooking(prisma, {
        actor: "STUDENT",
        policy: refundEligiblePolicy,
        booking,
      }),
    ).rejects.toThrow(/KOMOJU/);

    expect(prisma.refund.create).not.toHaveBeenCalled();
    expect(prisma.paymentLedgerEntry.createMany).not.toHaveBeenCalled();
  });
});

describe("refunding one seat in a group class", () => {
  // Each seat is its own booking, payment and payment intent, so a refund is
  // already confined to the student cancelling. Pinned so nobody later
  // "simplifies" this into refunding by class.
  function seatBooking(seat: 1 | 2) {
    return {
      id: `booking-seat-${seat}`,
      quotedPriceYen: 3000,
      payments: [
        {
          id: `payment-seat-${seat}`,
          provider: "STRIPE" as const,
          amountYen: 3000,
          status: "SUCCEEDED",
          providerPaymentId: `pi_seat_${seat}`,
          teacherPaymentAccount: { providerAccountId: "acct_123" },
        },
      ],
    };
  }

  beforeEach(() => {
    createStripeRefundMock.mockResolvedValue({ id: "re_seat_1", status: "succeeded" });
    // 20% of this seat's ¥3,000 share — never a share of the whole class.
    createAppFeeRefundMock.mockResolvedValue({ id: "fr_seat_1", amount: 600 });
  });

  test("returns only the cancelling student's money and fee", async () => {
    const prisma = refundPrisma();
    await issueAutomaticRefundForBooking(prisma, {
      booking: seatBooking(1),
      policy: refundEligiblePolicy,
      actor: "STUDENT",
    });

    expect(createStripeRefundMock).toHaveBeenCalledWith(
      expect.objectContaining({ paymentIntentId: "pi_seat_1", amountYen: 3000 }),
    );
    expect(createAppFeeRefundMock).toHaveBeenCalledWith(
      expect.objectContaining({ paymentIntentId: "pi_seat_1" }),
    );
    // Nothing in the call names the class, so no classmate can be caught up in it.
    const [feeArgs] = createAppFeeRefundMock.mock.calls[0] as [Record<string, unknown>];
    expect(JSON.stringify(feeArgs)).not.toContain("groupLessonSession");
  });

  test("books the reversal against that seat's payment", async () => {
    const prisma = refundPrisma();
    await issueAutomaticRefundForBooking(prisma, {
      booking: seatBooking(2),
      policy: refundEligiblePolicy,
      actor: "STUDENT",
    });

    const [args] = prisma.paymentLedgerEntry.createMany.mock.calls[0] as [
      { data: Array<{ paymentId: string; type: string; amountYen: number }> },
    ];
    expect(args.data.every((entry) => entry.paymentId === "payment-seat-2")).toBe(true);
    expect(args.data).toContainEqual(
      expect.objectContaining({ type: "REFUND", amountYen: -3000 }),
    );
    expect(args.data).toContainEqual(
      expect.objectContaining({ type: "PLATFORM_FEE", amountYen: -600 }),
    );
  });
});
