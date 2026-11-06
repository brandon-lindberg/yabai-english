import type { Prisma, RefundStatus } from "@/generated/prisma/client";

/**
 * Refund states that still owe someone an outcome: the money has not reached
 * the student, or we do not yet know whether it did. `SUCCEEDED` is settled and
 * deliberately absent — the admin queue exists to surface only what needs a
 * human. Ordered most-urgent first.
 */
export const REFUND_RECOVERY_STATUSES = [
  "PENDING_RECOVERY",
  "FAILED",
  "PENDING",
] as const satisfies readonly RefundStatus[];

export type RefundRecoveryStatus = (typeof REFUND_RECOVERY_STATUSES)[number];

const incompleteRecovery = { state: { not: "COMPLETE" } } as const;
const legacyFeeIssue = { status: "SUCCEEDED", recoveryNote: { not: null } } as const;
const unresolvedRefund = { status: { in: [...REFUND_RECOVERY_STATUSES] } };
export const adminWebhookRecoveryWhere = { provider: "STRIPE", ...incompleteRecovery } as const;

export function adminRefundRecoveryWhere(status?: RefundRecoveryStatus): Prisma.RefundWhereInput {
  const pendingStatus = status ? { status: { in: [status] } } : unresolvedRefund;
  return {
    AND: [
      status ? pendingStatus : { OR: [
        pendingStatus,
        legacyFeeIssue,
        { payment: { recovery: { feeRecoveryPending: true } } },
        { payment: { recovery: incompleteRecovery } },
      ] },
      { OR: [{ payment: { recovery: null } }, { payment: { recovery: incompleteRecovery } }] },
    ],
  };
}

export type AdminPaymentRecoveryQueue = "student" | "fees";

const feePayment: Prisma.PaymentWhereInput = { OR: [
  { recovery: { ...incompleteRecovery, feeRecoveryPending: true }, refunds: { some: { status: "SUCCEEDED" } } },
  { recovery: null, refunds: { some: legacyFeeIssue, none: unresolvedRefund } },
] };

/** One visible recovery item per payment, even with several provider receipts. */
export function adminPaymentRecoveryWhere({ queue, person, booking }: {
  queue?: AdminPaymentRecoveryQueue; person?: string; booking?: string;
} = {}): Prisma.PaymentWhereInput {
  return {
    ...(booking ? { bookingId: booking } : {}),
    AND: [
      { OR: [
        { recovery: incompleteRecovery },
        { recovery: null, refunds: { some: { OR: [unresolvedRefund, legacyFeeIssue] } } },
      ] },
      ...(queue ? [queue === "fees" ? feePayment : { NOT: feePayment }] : []),
      ...(person ? [{ OR: [{ studentId: person }, { booking: { teacher: { userId: person } } }] }] : []),
    ],
  };
}

export function adminPaymentQueueRefundWhere(queue: AdminPaymentRecoveryQueue): Prisma.RefundWhereInput {
  return queue === "fees" ? { status: "SUCCEEDED" } : unresolvedRefund;
}
