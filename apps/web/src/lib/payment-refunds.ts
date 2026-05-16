import type { CancellationActor, CancellationPolicyResult } from "@/lib/booking-policy";
import { createStripeRefundDirectCharge } from "@/lib/stripe/stripe-connect";

type RefundPrisma = {
  refund: {
    // Prisma delegates are generic; keep this structural type intentionally loose for tests.
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    create: (args: any) => Promise<unknown>;
  };
  paymentLedgerEntry: {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    createMany: (args: any) => Promise<unknown>;
  };
};

type RefundableBooking = {
  id: string;
  quotedPriceYen: number;
  payments?: Array<{
    id: string;
    provider: "STRIPE" | "KOMOJU";
    amountYen: number;
    status: string;
    providerPaymentId?: string | null;
    teacherPaymentAccount?: {
      providerAccountId?: string | null;
    } | null;
  }>;
};

function mapStripeRefundStatus(status: string | null | undefined) {
  if (status === "succeeded") return "SUCCEEDED" as const;
  if (status === "pending" || status === "requires_action") return "PENDING" as const;
  return "FAILED" as const;
}

export async function issueAutomaticRefundForBooking(
  prisma: RefundPrisma,
  input: {
    booking: RefundableBooking;
    policy: CancellationPolicyResult;
    actor: CancellationActor;
  },
) {
  if (!input.policy.refundEligible) {
    return null;
  }

  const payment = input.booking.payments?.find((p) => p.status === "SUCCEEDED");
  if (!payment) {
    return null;
  }

  const amountYen = input.booking.quotedPriceYen || payment.amountYen;
  if (payment.provider === "STRIPE") {
    const connectedAccountId = payment.teacherPaymentAccount?.providerAccountId;
    if (!connectedAccountId || !payment.providerPaymentId) {
      const refund = await prisma.refund.create({
        data: {
          bookingId: input.booking.id,
          paymentId: payment.id,
          provider: payment.provider,
          amountYen,
          status: "PENDING_RECOVERY",
          actor: input.actor,
          reason: "CANCELLATION_POLICY",
          policyJson: input.policy,
          recoveryNote: "Stripe direct-charge refund requires connected account and payment intent IDs.",
        },
      });
      return refund;
    }

    const stripeRefund = await createStripeRefundDirectCharge({
      connectedAccountId,
      paymentIntentId: payment.providerPaymentId,
      amountYen,
      paymentId: payment.id,
      bookingId: input.booking.id,
    });
    const refund = await prisma.refund.create({
      data: {
        bookingId: input.booking.id,
        paymentId: payment.id,
        provider: payment.provider,
        providerRefundId: stripeRefund.id,
        amountYen,
        status: mapStripeRefundStatus(stripeRefund.status),
        actor: input.actor,
        reason: "CANCELLATION_POLICY",
        policyJson: input.policy,
      },
    });

    await prisma.paymentLedgerEntry.createMany({
      data: [
        { paymentId: payment.id, type: "REFUND", amountYen: -amountYen },
      ],
    });

    return refund;
  }

  const refund = await prisma.refund.create({
    data: {
      bookingId: input.booking.id,
      paymentId: payment.id,
      provider: payment.provider,
      amountYen,
      status: "SUCCEEDED",
      actor: input.actor,
      reason: "CANCELLATION_POLICY",
      policyJson: input.policy,
    },
  });

  await prisma.paymentLedgerEntry.createMany({
    data: [
      { paymentId: payment.id, type: "REFUND", amountYen: -amountYen },
      { paymentId: payment.id, type: "TRANSFER_REVERSAL", amountYen },
    ],
  });

  return refund;
}
