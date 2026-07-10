import type { CancellationActor, CancellationPolicyResult } from "@/lib/booking-policy";
import {
  createStripeApplicationFeeRefundKeepingProcessingFee,
  createStripeRefundDirectCharge,
} from "@/lib/stripe/stripe-connect";

/** Flat 10% refund processing fee; separate from the tier-based platform fee. */
export const REFUND_PROCESSING_FEE_BPS = 1000;

export function calculateRefundProcessingFeeYen(amountYen: number): number {
  return Math.floor((amountYen * REFUND_PROCESSING_FEE_BPS) / 10_000);
}

export function resolvePlatformFeeKeepYen(
  amountYen: number,
  applicationFeeAmountYen?: number | null,
): number {
  if (typeof applicationFeeAmountYen === "number" && applicationFeeAmountYen >= 0) {
    return Math.min(applicationFeeAmountYen, amountYen);
  }
  return calculateRefundProcessingFeeYen(amountYen);
}

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
    metadataJson?: unknown;
    teacherPaymentAccount?: {
      providerAccountId?: string | null;
    } | null;
  }>;
};

export function calculateRefundSplit({
  amountYen,
  applicationFeeAmountYen: _applicationFeeAmountYen,
  refundFeePassedToStudent,
  actor,
}: {
  amountYen: number;
  applicationFeeAmountYen?: number | null;
  refundFeePassedToStudent: boolean;
  actor: CancellationActor;
}): { studentRefundYen: number; processingFeeYen: number } {
  const processingFeeYen = calculateRefundProcessingFeeYen(amountYen);
  // Only the flat processing fee may be passed to the student; the tier-based platform
  // fee is a separate teacher/platform matter and is never deducted from the student.
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

    const applicationFeeAmountYen =
      payment.metadataJson &&
      typeof payment.metadataJson === "object" &&
      payment.metadataJson !== null &&
      "applicationFeeAmountYen" in payment.metadataJson &&
      typeof (payment.metadataJson as { applicationFeeAmountYen?: unknown }).applicationFeeAmountYen ===
        "number"
        ? (payment.metadataJson as { applicationFeeAmountYen: number }).applicationFeeAmountYen
        : null;

    const split = calculateRefundSplit({
      amountYen,
      applicationFeeAmountYen,
      refundFeePassedToStudent: input.refundFeePassedToStudent ?? false,
      actor: input.actor,
    });
    const platformFeeKeepYen = resolvePlatformFeeKeepYen(amountYen, applicationFeeAmountYen);

    const stripeRefund = await createStripeRefundDirectCharge({
      connectedAccountId,
      paymentIntentId: payment.providerPaymentId,
      amountYen: split.studentRefundYen,
      paymentId: payment.id,
      bookingId: input.booking.id,
    });

    // Keep the full tier-based platform application fee; do not return it to the teacher.
    let applicationFeeRefund: { id: string; amount: number } | null = null;
    let applicationFeeRefundError: string | null = null;
    try {
      applicationFeeRefund = await createStripeApplicationFeeRefundKeepingProcessingFee({
        connectedAccountId,
        paymentIntentId: payment.providerPaymentId,
        keepYen: platformFeeKeepYen,
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
