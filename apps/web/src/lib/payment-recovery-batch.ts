import type { PaymentRecoveryState, PrismaClient } from "@/generated/prisma/client";
import { processPaymentRecovery, prepareBookingRefund, queuePaymentReconciliation } from "./payment-recovery";
import { loadBookingForCancellation } from "./booking-cancellation-data";
import { processStoredStripeWebhook } from "./stripe/webhook-work";

export const dueRecoveryWhere = (force = false) => ({
  state: force ? { not: "COMPLETE" as const } : { in: ["QUEUED", "WAITING", "PROCESSING"] as PaymentRecoveryState[] },
  ...(force ? {} : { nextAttemptAt: { lte: new Date() } }),
  OR: [{ leaseToken: null }, { leaseExpiresAt: { lte: new Date() } }],
});

/** Legacy records with an explicit full-refund policy row supply evidence of an obligation. */
export async function recoverPayment(db: PrismaClient, paymentId: string, { feeOnly = false }: { feeOnly?: boolean } = {}) {
  const payment = await db.payment.findUnique({ where: { id: paymentId }, include: { recovery: true,
    refunds: { where: { reason: "CANCELLATION_POLICY", status: { not: "SUCCEEDED" } } } } });
  if (!payment?.bookingId || payment.provider !== "STRIPE") throw new Error("Stripe payment not found");
  if (!payment.recovery) {
    const booking = await loadBookingForCancellation(db, payment.bookingId);
    if (!booking) throw new Error("Booking not found");
    const fullObligation = payment.refunds.find(refund => refund.amountYen === payment.amountYen);
    await db.$transaction(async tx => {
      if (fullObligation && !feeOnly) await prepareBookingRefund(tx, { booking, actor: "SUPER_ADMIN",
        policy: { allowed: true, refundEligible: true, rescheduleOffered: false } });
      else await queuePaymentReconciliation(tx, paymentId);
    });
  }
  // This path is an explicit super-admin action. The scheduled worker never authorizes a new failed attempt.
  await processPaymentRecovery(db, paymentId, { force: true, reissueFailed: !feeOnly, feeOnly });
  return db.paymentRecovery.findUnique({ where: { paymentId } });
}

export async function runPaymentRecoveryBatch(db: PrismaClient, limit = 5, force = false) {
  const bounded = Math.max(1, Math.min(10, Math.floor(limit)));
  const events = await db.paymentWebhookEvent.findMany({ where: { provider: "STRIPE", ...dueRecoveryWhere(force) }, orderBy: { nextAttemptAt: "asc" }, take: bounded });
  const deliveries = [];
  for (const event of events) {
    const response = await processStoredStripeWebhook(db, event.providerEventId, { force });
    deliveries.push({ eventId: event.providerEventId, ok: response.ok });
  }
  const payments = await db.paymentRecovery.findMany({ where: dueRecoveryWhere(force), orderBy: { nextAttemptAt: "asc" }, take: bounded });
  const refunds = [];
  for (const work of payments) refunds.push({ paymentId: work.paymentId, ...await processPaymentRecovery(db, work.paymentId, { force }) });
  return { deliveries, refunds };
}
