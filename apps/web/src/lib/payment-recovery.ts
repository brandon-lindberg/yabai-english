import "server-only";
import { randomUUID } from "node:crypto";
import type Stripe from "stripe";
import { Prisma, type PrismaClient } from "@/generated/prisma/client";
import type { CancellationActor, CancellationPolicyResult } from "./booking-policy";
import { lockTransaction } from "./transaction-lock";
import { stripeAccountForPayment } from "./stripe/payment-account";
import { createStripeRefundDirectCharge, listStripeRefundsForPayment, retrieveStripePaymentIntent,
  retrieveStripeApplicationFee, refundStripeApplicationFee } from "./stripe/stripe-connect";
import { notifyPrivateBookingEvent } from "./private-booking-notifications";
import { ensureCreditNoteNumber } from "./credit-notes";
import { notifySuperAdminsOfStuckRefund } from "./refund-notifications";
import { cleanCancelledBookingCalendar } from "./cancelled-booking-calendar";

export const PAYMENT_WORK_LEASE_MS = 120_000;
export const refundStatusFromStripe = (status: string | null | undefined) => status === "succeeded" ? "SUCCEEDED" as const
  : status === "pending" || status === "requires_action" ? "PENDING" as const : "FAILED" as const;
export const providerObjectId = (value: unknown): string | null => typeof value === "string" ? value
  : value && typeof value === "object" && "id" in value && typeof value.id === "string" ? value.id : null;
export const workRetryAt = (attempts: number) => new Date(Date.now() + Math.min(3600, 15 * 2 ** Math.min(attempts, 8)) * 1000);
const paymentInclude = { teacherPaymentAccount: true, booking: { include: {
  student: { select: { name: true, email: true } }, teacher: { select: { userId: true, calendarId: true, googleCalendarRefreshToken: true } },
} } } satisfies Prisma.PaymentInclude;
export type RefundBooking = {
  id: string; quotedPriceYen: number;
  payments?: Array<{ id: string; provider: "STRIPE" | "KOMOJU"; status: string; amountYen: number;
    providerPaymentId?: string | null; metadataJson?: unknown; teacherPaymentAccount?: { providerAccountId?: string | null } | null }>;
};

/** Call in the same transaction as the cancellation/teacher decision. No provider calls. */
export async function prepareBookingRefund(tx: Prisma.TransactionClient, input: {
  booking: RefundBooking; policy: CancellationPolicyResult; actor: CancellationActor;
}) {
  if (!input.policy.refundEligible) return null;
  const payment = input.booking.payments?.find(item => item.status === "SUCCEEDED" && item.amountYen > 0);
  if (!payment) return null;
  if (payment.provider !== "STRIPE") throw new Error(`Cannot refund payment ${payment.id}: ${payment.provider} has no refund implementation.`);
  await lockTransaction(tx, "payment-recovery", payment.id);
  const existing = await tx.paymentRecovery.findUnique({ where: { paymentId: payment.id } });
  if (existing?.requestedAmountYen) return existing;
  const requestKey = `lesson-refund:${payment.id}`;
  const historical = await tx.refund.findFirst({ where: { paymentId: payment.id, provider: "STRIPE", providerRefundId: { not: null }, amountYen: payment.amountYen }, orderBy: { createdAt: "asc" } });
  const intent = historical ?? await tx.refund.upsert({ where: { requestKey }, update: {}, create: {
    bookingId: input.booking.id, paymentId: payment.id, provider: "STRIPE", requestKey,
    amountYen: payment.amountYen, status: "PENDING_RECOVERY", actor: input.actor, reason: "CANCELLATION_POLICY",
    policyJson: input.policy, recoveryNote: "Refund queued for processing.",
  } });
  const data = { requestedAmountYen: payment.amountYen, actor: input.actor, policyJson: input.policy,
    connectedAccountId: stripeAccountForPayment(payment), paymentIntentId: payment.providerPaymentId,
    refundId: intent.id, completedAt: null, nextAttemptAt: new Date(), revision: { increment: 1 },
    ...(existing?.state === "PROCESSING" ? {} : { state: "QUEUED" as const }) };
  return tx.paymentRecovery.upsert({ where: { paymentId: payment.id }, update: data,
    create: { ...data, paymentId: payment.id, revision: 0 } });
}

/** A webhook can request another read while a worker owns the lease; revision prevents lost work. */
export async function queuePaymentReconciliation(tx: Prisma.TransactionClient, paymentId: string) {
  await lockTransaction(tx, "payment-recovery", paymentId);
  const payment = await tx.payment.findUniqueOrThrow({ where: { id: paymentId }, include: { teacherPaymentAccount: true } });
  const existing = await tx.paymentRecovery.findUnique({ where: { paymentId } });
  return tx.paymentRecovery.upsert({ where: { paymentId }, create: { paymentId,
    connectedAccountId: stripeAccountForPayment(payment), paymentIntentId: payment.providerPaymentId },
    update: { revision: { increment: 1 }, nextAttemptAt: new Date(), completedAt: null,
      ...(existing?.state === "PROCESSING" ? {} : { state: "QUEUED" }) } });
}

function activeProviderRefund(refund: Stripe.Refund) { return ["succeeded", "pending", "requires_action"].includes(refund.status ?? ""); }

/** Payment + provider account + intent must agree. Signed metadata alone never authorizes a match. */
export async function paymentForStripeIntent(db: PrismaClient, accountId: string, intentId: string) {
  const candidates = await db.payment.findMany({ where: { provider: "STRIPE", providerPaymentId: intentId }, include: paymentInclude });
  const matches = candidates.filter(payment => stripeAccountForPayment(payment) === accountId);
  if (matches.length > 1) throw new Error("Ambiguous Stripe payment ownership");
  if (matches[0]) return matches[0];
  // A Dashboard refund can beat the paid-checkout webhook. Recover the immutable
  // link from Stripe's PaymentIntent, then validate it against the local snapshot.
  const intent = await retrieveStripePaymentIntent(accountId, intentId);
  const hinted = intent.metadata?.paymentId;
  if (!hinted) return null;
  const payment = await db.payment.findUnique({ where: { id: hinted }, include: paymentInclude });
  if (!payment || payment.provider !== "STRIPE" || stripeAccountForPayment(payment) !== accountId
    || payment.bookingId !== intent.metadata?.bookingId || payment.amountYen !== intent.amount || intent.currency !== "jpy") return null;
  if (payment.providerPaymentId && payment.providerPaymentId !== intentId) throw new Error("Stripe payment intent conflicts with the stored payment");
  await db.payment.updateMany({ where: { id: payment.id, providerPaymentId: null }, data: { providerPaymentId: intentId } });
  return { ...payment, providerPaymentId: intentId };
}

async function synchronizeRefundLedger(tx: Prisma.TransactionClient, paymentId: string) {
  const refunds = await tx.refund.findMany({ where: { paymentId, providerRefundId: { not: null } }, orderBy: { createdAt: "asc" } });
  const total = canonicalRefunds(refunds).filter(refund => ["SUCCEEDED", "PENDING"].includes(refund.status)).reduce((sum, refund) => sum + refund.amountYen, 0);
  const payment = await tx.payment.findUniqueOrThrow({ where: { id: paymentId }, select: { amountYen: true } });
  if (total > payment.amountYen) throw new Error("Refund total exceeds the original payment");
  await reconcileLedgerBalance(tx, paymentId, "REFUND", -total, "Stripe refund reconciliation");
}

async function reconcileLedgerBalance(tx: Prisma.TransactionClient, paymentId: string, type: "REFUND" | "PLATFORM_FEE", target: number, note: string) {
  const posted = await tx.paymentLedgerEntry.aggregate({ where: { paymentId, type }, _sum: { amountYen: true } });
  const delta = target - (posted._sum.amountYen ?? 0);
  if (delta) await tx.paymentLedgerEntry.create({ data: { paymentId, type, amountYen: delta, note } });
}

function canonicalRefunds<T extends { providerRefundId: string | null; providerAccountId: string | null }>(refunds: T[]) {
  const unique = new Map<string, T>();
  for (const refund of refunds) {
    if (!refund.providerRefundId) continue;
    const previous = unique.get(refund.providerRefundId);
    if (!previous || (!previous.providerAccountId && refund.providerAccountId)) unique.set(refund.providerRefundId, refund);
  }
  return [...unique.values()];
}

export async function recordStripeRefund(db: PrismaClient, accountId: string, provider: Stripe.Refund,
  options: { schedule?: boolean } = {}) {
  const intentId = providerObjectId(provider.payment_intent);
  if (!intentId) throw new Error("Stripe refund has no original PaymentIntent");
  const payment = await paymentForStripeIntent(db, accountId, intentId);
  if (!payment?.bookingId) return null; // An unrelated payment on a connected account.
  if (provider.currency !== "jpy" || !Number.isSafeInteger(provider.amount) || provider.amount <= 0 || provider.amount > payment.amountYen) {
    throw new Error("Stripe refund amount/currency does not match the payment");
  }
  return db.$transaction(async tx => {
    await lockTransaction(tx, "payment-recovery", payment.id);
    const job = await tx.paymentRecovery.findUnique({ where: { paymentId: payment.id } });
    let existing = await tx.refund.findFirst({ where: { paymentId: payment.id, provider: "STRIPE", providerRefundId: provider.id }, orderBy: { createdAt: "asc" } });
    if (!existing && job?.refundId) {
      const intent = await tx.refund.findUnique({ where: { id: job.refundId } });
      if (intent && !intent.providerRefundId) existing = intent;
    }
    const status = refundStatusFromStripe(provider.status);
    const appReceipt = Boolean(job?.requestedAmountYen && provider.metadata?.paymentId === payment.id && provider.metadata?.bookingId === payment.bookingId);
    const data = { providerAccountId: accountId, providerRefundId: provider.id, amountYen: provider.amount,
      actor: existing?.providerRefundId ? existing.actor : appReceipt ? job!.actor : "STRIPE",
      reason: existing?.providerRefundId ? existing.reason : appReceipt ? "CANCELLATION_POLICY" : "STRIPE_DASHBOARD",
      status: status === "FAILED" ? "PENDING_RECOVERY" as const : status,
      recoveryNote: status === "FAILED" ? `Stripe refund did not complete (${provider.failure_reason ?? provider.status}). Reconcile before reissuing.` : null };
    const refund = existing ? await tx.refund.update({ where: { id: existing.id }, data })
      : await tx.refund.create({ data: { ...data, paymentId: payment.id, bookingId: payment.bookingId!,
        provider: "STRIPE" } });
    if (job && appReceipt && provider.metadata?.recoveryKey === job.requestKey) {
      await tx.paymentRecovery.update({ where: { paymentId: payment.id }, data: { refundId: refund.id } });
    }
    await synchronizeRefundLedger(tx, payment.id);
    if (options.schedule !== false) await queuePaymentReconciliation(tx, payment.id);
    return refund;
  });
}

async function recordFeeLedger(db: PrismaClient, paymentId: string, fee: { amount: number; amount_refunded: number }) {
  await db.$transaction(async tx => {
    await lockTransaction(tx, "payment-recovery", paymentId);
    await reconcileLedgerBalance(tx, paymentId, "PLATFORM_FEE", fee.amount - fee.amount_refunded, "Application fee returned on cancellation");
  });
}

/** Customer refunds require a durable obligation; fee returns follow full settled reversals. */
export async function processPaymentRecovery(db: PrismaClient, paymentId: string, options: { force?: boolean; reissueFailed?: boolean } = {}) {
  const token = randomUUID(), now = new Date();
  const claimed = await db.paymentRecovery.updateMany({ where: { paymentId,
    ...(options.force ? {} : { nextAttemptAt: { lte: now }, state: { notIn: ["COMPLETE", "NEEDS_ATTENTION"] } }),
    OR: [{ leaseToken: null }, { leaseExpiresAt: { lte: now } }] },
    data: { state: "PROCESSING", leaseToken: token, leaseExpiresAt: new Date(Date.now() + PAYMENT_WORK_LEASE_MS), attempts: { increment: 1 } } });
  if (!claimed.count) return { busy: true };
  const job = await db.paymentRecovery.findUniqueOrThrow({ where: { paymentId }, include: { payment: { include: paymentInclude } } });
  let feePending = job.feeRecoveryPending;
  const finish = async (state: "COMPLETE" | "WAITING" | "NEEDS_ATTENTION", error: string | null = null) => {
    const changed = await db.paymentRecovery.updateMany({ where: { paymentId, leaseToken: token, revision: job.revision }, data: {
      state, leaseToken: null, leaseExpiresAt: null, lastError: error, feeRecoveryPending: feePending,
      nextAttemptAt: workRetryAt(job.attempts), completedAt: state === "COMPLETE" ? new Date() : null,
    } });
    if (!changed.count) await db.paymentRecovery.updateMany({ where: { paymentId, leaseToken: token },
      data: { state: "QUEUED", leaseToken: null, leaseExpiresAt: null, nextAttemptAt: new Date() } });
    if (changed.count && error) await notifySuperAdminsOfStuckRefund({ amountYen: job.requestedAmountYen ?? job.payment.amountYen,
      studentName: job.payment.booking?.student.name, note: error,
      recoveryKey: `payment:${paymentId}:${feePending ? "fee" : "refund"}` }).catch(() => undefined);
  };
  try {
    const account = job.connectedAccountId ?? stripeAccountForPayment(job.payment), intentId = job.paymentIntentId ?? job.payment.providerPaymentId;
    if (!account || !intentId || !job.payment.bookingId) throw new Error("Original Stripe account and payment intent are required; reconcile the historical payment.");
    // Capture a legacy fallback once. It can never follow a later reconnection.
    await db.paymentRecovery.updateMany({ where: { paymentId, leaseToken: token }, data: { connectedAccountId: account, paymentIntentId: intentId } });
    let remote = await listStripeRefundsForPayment(account, intentId);
    for (const refund of remote) if (!await recordStripeRefund(db, account, refund, { schedule: false })) throw new Error("Provider refund could not be linked to its original payment");
    const activeTotal = () => remote.filter(activeProviderRefund).reduce((sum, refund) => sum + refund.amount, 0);
    const successTotal = () => remote.filter(refund => refund.status === "succeeded").reduce((sum, refund) => sum + refund.amount, 0);
    if (job.requestedAmountYen && activeTotal() < job.requestedAmountYen) {
      if (remote.some(refund => ["pending", "requires_action"].includes(refund.status ?? ""))) {
        await finish("WAITING", "A provider refund is pending. Reconcile again after it settles."); return { pending: true };
      }
      const failures = remote.filter(refund => ["failed", "canceled"].includes(refund.status ?? ""));
      const currentFailed = failures.length > 0 && (!job.requestStartedAt
        || failures.some(refund => refund.metadata?.recoveryKey === job.requestKey)
        || (job.requestSequence === 0 && failures.some(refund => !refund.metadata?.recoveryKey)));
      if (currentFailed && !options.reissueFailed) {
        await finish("NEEDS_ATTENTION", "Stripe confirmed a failed refund. An administrator must authorize its replacement."); return { pending: true };
      }
      const remaining = job.requestedAmountYen - activeTotal();
      if (!currentFailed && job.requestStartedAt && (Date.now() - job.requestStartedAt.getTime() > 23 * 3_600_000 || job.requestAmountYen !== remaining)) {
        await finish("NEEDS_ATTENTION", "An earlier refund request is uncertain. Reconcile in Stripe before issuing more money; its idempotency window may have expired."); return { pending: true };
      }
      const sequence = currentFailed ? job.requestSequence + 1 : job.requestSequence;
      const key = currentFailed ? `lesson-refund:${paymentId}:attempt:${sequence}` : job.requestKey ?? `lesson-refund:${paymentId}`;
      const authorized = await db.paymentRecovery.updateMany({ where: { paymentId, leaseToken: token, leaseExpiresAt: { gt: new Date() } }, data: {
        requestKey: key, requestSequence: sequence, requestAmountYen: remaining, requestStartedAt: currentFailed ? new Date() : job.requestStartedAt ?? new Date(),
      } });
      if (!authorized.count) return { busy: true };
      const created = await createStripeRefundDirectCharge({ connectedAccountId: account, paymentIntentId: intentId,
        amountYen: remaining, paymentId, bookingId: job.payment.bookingId, idempotencyKey: key });
      await recordStripeRefund(db, account, created, { schedule: false });
      remote = [...remote.filter(refund => refund.id !== created.id), created];
    }
    const totalSucceeded = successTotal();
    if (job.requestedAmountYen && job.payment.booking?.status === "CANCELLED") await notifyPrivateBookingEvent({ bookingId: job.payment.bookingId, event: "cancelled" });
    const receipts = canonicalRefunds(await db.refund.findMany({ where: { paymentId, providerRefundId: { not: null } }, orderBy: { createdAt: "asc" } }));
    for (const refund of receipts) {
      if (refund.status === "SUCCEEDED") await ensureCreditNoteNumber(refund.id);
      await notifyPrivateBookingEvent({ bookingId: refund.bookingId, event: "refund", refund,
        partialRefund: totalSucceeded < job.payment.amountYen });
    }
    if (activeTotal() >= job.payment.amountYen && job.payment.booking?.privateRescheduleStatus === "PENDING") {
      await db.booking.updateMany({ where: { id: job.payment.bookingId, status: "CANCELLED", privateRescheduleStatus: "PENDING" },
        data: { privateRescheduleStatus: "REFUND_REQUESTED", rescheduleResolvedAt: new Date() } });
    }
    if (totalSucceeded >= job.payment.amountYen && job.payment.booking?.status !== "CANCELLED") {
      const cancelled = await db.booking.updateMany({ where: { id: job.payment.bookingId, status: { in: ["CONFIRMED", "PENDING_PAYMENT"] } },
        data: { status: "CANCELLED", cancelledFromStatus: job.payment.booking?.status } });
      if (cancelled.count) await notifyPrivateBookingEvent({ bookingId: job.payment.bookingId, event: "cancelled" });
    }
    if (totalSucceeded >= job.payment.amountYen && job.payment.booking && ["CANCELLED", "CONFIRMED", "PENDING_PAYMENT"].includes(job.payment.booking.status)) {
      await cleanCancelledBookingCalendar(job.payment.booking);
    }
    const intent = await retrieveStripePaymentIntent(account, intentId);
    const charge = typeof intent.latest_charge === "object" ? intent.latest_charge : null;
    const feeId = providerObjectId(charge?.application_fee);
    if (feeId) {
      feePending = totalSucceeded >= job.payment.amountYen;
      await db.paymentRecovery.updateMany({ where: { paymentId, leaseToken: token }, data: { feeRecoveryPending: feePending } });
      let fee = await retrieveStripeApplicationFee(feeId);
      await db.paymentRecovery.updateMany({ where: { paymentId, leaseToken: token }, data: { applicationFeeId: feeId } });
      // External partial refunds are reflected, never silently topped up by the app.
      // A full settled reversal returns the platform fee under the established policy.
      const target = totalSucceeded >= job.payment.amountYen ? fee.amount : fee.amount_refunded;
      feePending = fee.amount_refunded < target;
      if (feePending) {
        const amount = target - fee.amount_refunded;
        await db.paymentRecovery.updateMany({ where: { paymentId, leaseToken: token }, data: { feeRecoveryPending: true } });
        await refundStripeApplicationFee(feeId, amount, paymentId, job.payment.bookingId,
          `lesson-fee-refund:${paymentId}:${fee.amount_refunded}:${amount}`);
        fee = await retrieveStripeApplicationFee(feeId);
        feePending = fee.amount_refunded < target;
      }
      await recordFeeLedger(db, paymentId, fee);
    } else feePending = false;
    const failed = totalSucceeded < (job.requestedAmountYen ?? job.payment.amountYen)
      && remote.some(refund => ["failed", "canceled"].includes(refund.status ?? ""));
    const pending = remote.some(refund => ["pending", "requires_action"].includes(refund.status ?? ""));
    await finish(failed ? "NEEDS_ATTENTION" : pending || feePending ? "WAITING" : "COMPLETE",
      failed ? "Stripe reported a failed refund. Reconcile before reissuing." : feePending ? "The student refund settled; the application fee still needs recovery." : null);
    return { ok: !failed, pending: pending || feePending };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    if (job.refundId) {
      await db.refund.updateMany({ where: { id: job.refundId, providerRefundId: null }, data: { status: "PENDING_RECOVERY", recoveryNote: message } });
      const pending = await db.refund.findUnique({ where: { id: job.refundId } });
      if (pending && !pending.providerRefundId) await notifyPrivateBookingEvent({ bookingId: pending.bookingId, event: "refund", refund: pending }).catch(() => undefined);
    }
    await finish("WAITING", message);
    return { ok: false, pending: true };
  }
}

export async function recoveryRefund(db: PrismaClient, paymentId: string) {
  const work = await db.paymentRecovery.findUnique({ where: { paymentId }, include: { refund: true } });
  if (!work?.refund || !work.requestedAmountYen) return work?.refund ?? null;
  const receipts = canonicalRefunds(await db.refund.findMany({ where: { paymentId, providerRefundId: { not: null } } }));
  const succeeded = receipts.filter(refund => refund.status === "SUCCEEDED").reduce((sum, refund) => sum + refund.amountYen, 0);
  const active = receipts.filter(refund => ["SUCCEEDED", "PENDING"].includes(refund.status)).reduce((sum, refund) => sum + refund.amountYen, 0);
  // The action response describes the full authorized operation; receipt/credit-note
  // pages continue to use each individual stored refund and its actual amount.
  return { ...work.refund, amountYen: work.requestedAmountYen, operationPaymentId: paymentId,
    status: succeeded >= work.requestedAmountYen ? "SUCCEEDED" as const : active >= work.requestedAmountYen ? "PENDING" as const : "PENDING_RECOVERY" as const,
    recoveryNote: work.lastError ?? work.refund.recoveryNote };
}
