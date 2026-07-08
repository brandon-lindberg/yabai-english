import type { CancellationActor, CancellationPolicyResult } from "@/lib/booking-policy";
import {
  createStripeApplicationFeeRefundKeepingProcessingFee,
  createStripeRefundDirectCharge,
} from "@/lib/stripe/stripe-connect";

/** Platform keeps 10% of the payment as a non-refundable processing fee on refunds. */
export const REFUND_PROCESSING_FEE_BPS = 1000;

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

export function calculateRefundSplit({
  amountYen,
  refundFeePassedToStudent,
  actor,
}: {
  amountYen: number;
  refundFeePassedToStudent: boolean;
  actor: CancellationActor;
}): { studentRefundYen: number; processingFeeYen: number } {
  const processingFeeYen = Math.floor((amountYen * REFUND_PROCESSING_FEE_BPS) / 10_000);
  // The fee may only be passed on when the student is the one cancelling;
  // teacher/admin cancellations always make the student whole.
  const passToStudent = refundFeePassedToStudent && actor === "STUDENT";
  return {
    studentRefundYen: passToStudent ? amountYen - processingFeeYen : amountYen,
    processingFeeYen,
  };
}

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
    refundFeePassedToStudent?: boolean;
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

    const split = calculateRefundSplit({
      amountYen,
      refundFeePassedToStudent: input.refundFeePassedToStudent ?? false,
      actor: input.actor,
    });

    const stripeRefund = await createStripeRefundDirectCharge({
      connectedAccountId,
      paymentIntentId: payment.providerPaymentId,
      amountYen: split.studentRefundYen,
      paymentId: payment.id,
      bookingId: input.booking.id,
    });

    // Return the platform's application fee to the teacher, minus the retained
    // processing fee, so the teacher is not out of pocket beyond that fee.
    let applicationFeeRefund: { id: string; amount: number } | null = null;
    let applicationFeeRefundError: string | null = null;
    try {
      applicationFeeRefund = await createStripeApplicationFeeRefundKeepingProcessingFee({
        connectedAccountId,
        paymentIntentId: payment.providerPaymentId,
        keepYen: split.processingFeeYen,
        paymentId: payment.id,
        bookingId: input.booking.id,
      });
    } catch (error) {
      applicationFeeRefundError = error instanceof Error ? error.message : String(error);
    }

    const refund = await prisma.refund.create({
      data: {
        bookingId: input.booking.id,
        paymentId: payment.id,
        provider: payment.provider,
        providerRefundId: stripeRefund.id,
        amountYen: split.studentRefundYen,
        status: mapStripeRefundStatus(stripeRefund.status),
        actor: input.actor,
        reason: "CANCELLATION_POLICY",
        policyJson: input.policy,
        ...(applicationFeeRefundError
          ? {
              recoveryNote: `Application fee refund failed and must be issued manually: ${applicationFeeRefundError}`,
            }
          : {}),
      },
    });

    await prisma.paymentLedgerEntry.createMany({
      data: [
        { paymentId: payment.id, type: "REFUND", amountYen: -split.studentRefundYen },
        ...(applicationFeeRefund && applicationFeeRefund.amount > 0
          ? [
              {
                paymentId: payment.id,
                type: "PLATFORM_FEE",
                amountYen: -applicationFeeRefund.amount,
                note: "Application fee refund on cancellation",
              },
            ]
          : []),
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
