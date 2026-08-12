import type { CancellationActor, CancellationPolicyResult } from "@/lib/booking-policy";
import {
  createStripeApplicationFeeRefund,
  createStripeRefundDirectCharge,
} from "@/lib/stripe/stripe-connect";

/** What a caller needs to decide whether the refund actually landed. */
export type IssuedRefund = {
  id: string;
  status: string;
  amountYen: number;
  recoveryNote?: string | null;
};

type RefundPrisma = {
  refund: {
    // Prisma delegates are generic; keep this structural type intentionally loose for tests.
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    create: (args: any) => Promise<IssuedRefund>;
  };
  paymentLedgerEntry: {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    createMany: (args: any) => Promise<unknown>;
  };
};

/**
 * Mirrors the stored `PaymentProvider` enum rather than narrowing to STRIPE, so
 * the runtime guard below stays reachable for rows written before Stripe was
 * the only checkout we offer.
 */
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

/** Shared by the refund call site and the webhook that later revises the row. */
export function mapStripeRefundStatus(status: string | null | undefined) {
  if (status === "succeeded") return "SUCCEEDED" as const;
  if (status === "pending" || status === "requires_action") return "PENDING" as const;
  return "FAILED" as const;
}

/**
 * Reverses a paid lesson in full: the student is returned the whole lesson
 * price and the platform's application fee goes back to the teacher, so nobody
 * profits from a lesson that did not happen. The only unrecoverable cost is
 * Stripe's own processing fee on the original charge, which Stripe keeps.
 *
 * The amount of application fee to return is read from Stripe rather than from
 * our stored metadata — there is no share to compute, so there is nothing to
 * get wrong.
 */
export async function issueAutomaticRefundForBooking(
  prisma: RefundPrisma,
  input: {
    booking: RefundableBooking;
    policy: CancellationPolicyResult;
    actor: CancellationActor;
  },
): Promise<IssuedRefund | null> {
  if (!input.policy.refundEligible) {
    return null;
  }

  const payment = input.booking.payments?.find((p) => p.status === "SUCCEEDED");
  if (!payment) {
    return null;
  }

  if (payment.provider !== "STRIPE") {
    throw new Error(
      `Cannot refund payment ${payment.id}: ${payment.provider} has no refund implementation. ` +
        "Stripe is the only supported provider; this payment must be refunded manually.",
    );
  }

  const amountYen = input.booking.quotedPriceYen || payment.amountYen;
  const connectedAccountId = payment.teacherPaymentAccount?.providerAccountId;

  if (!connectedAccountId || !payment.providerPaymentId) {
    return prisma.refund.create({
      data: {
        bookingId: input.booking.id,
        paymentId: payment.id,
        provider: payment.provider,
        amountYen,
        status: "PENDING_RECOVERY",
        actor: input.actor,
        reason: "CANCELLATION_POLICY",
        policyJson: input.policy,
        recoveryNote:
          "Stripe direct-charge refund requires connected account and payment intent IDs.",
      },
    });
  }

  const stripeRefund = await createStripeRefundDirectCharge({
    connectedAccountId,
    paymentIntentId: payment.providerPaymentId,
    amountYen,
    paymentId: payment.id,
    bookingId: input.booking.id,
  });

  let applicationFeeRefund: { id: string; amount: number } | null = null;
  let applicationFeeRefundError: string | null = null;
  try {
    applicationFeeRefund = await createStripeApplicationFeeRefund({
      connectedAccountId,
      paymentIntentId: payment.providerPaymentId,
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
      amountYen,
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
      { paymentId: payment.id, type: "REFUND", amountYen: -amountYen },
      ...(applicationFeeRefund && applicationFeeRefund.amount > 0
        ? [
            {
              paymentId: payment.id,
              type: "PLATFORM_FEE",
              amountYen: -applicationFeeRefund.amount,
              note: "Application fee returned on cancellation",
            },
          ]
        : []),
    ],
  });

  return refund;
}
