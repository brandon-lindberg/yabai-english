import type { PrismaClient } from "@/generated/prisma/client";
import type { CancellationActor, CancellationPolicyResult } from "./booking-policy";
import { prepareBookingRefund, processPaymentRecovery, recoveryRefund, refundStatusFromStripe, type RefundBooking } from "./payment-recovery";

export type IssuedRefund = { id: string; status: string; amountYen: number; recoveryNote?: string | null };
export const mapStripeRefundStatus = refundStatusFromStripe;

/** Shared by every refund entry. Cancellation callers prepare it in their own transaction first. */
export async function issueAutomaticRefundForBooking(db: PrismaClient, input: {
  booking: RefundBooking; policy: CancellationPolicyResult; actor: CancellationActor;
}): Promise<IssuedRefund | null> {
  if (!input.policy.refundEligible) return null;
  const work = await db.$transaction(tx => prepareBookingRefund(tx, input));
  if (!work) return null;
  await processPaymentRecovery(db, work.paymentId, { force: true });
  return recoveryRefund(db, work.paymentId);
}
