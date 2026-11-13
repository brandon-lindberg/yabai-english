import { prisma } from "@/lib/prisma";
import { confirmPaidBookingFromPayment } from "@/lib/booking-payment-confirmation";
import { randomUUID } from "node:crypto";
import { stripeAccountForPayment } from "./payment-account";
import { prepareBookingRefund, PAYMENT_WORK_LEASE_MS } from "../payment-recovery";

type StripeCheckoutSessionSnapshot = {
  id: string;
  payment_status: string | null;
  metadata?: Record<string, string | undefined> | null;
  payment_intent?: string | { id?: string } | null;
  amount_total?: number | null;
  currency?: string | null;
};

function paymentIntentIdFromSession(session: StripeCheckoutSessionSnapshot): string | null {
  if (typeof session.payment_intent === "string") return session.payment_intent;
  if (
    typeof session.payment_intent === "object" &&
    session.payment_intent !== null &&
    typeof session.payment_intent.id === "string"
  ) {
    return session.payment_intent.id;
  }
  return null;
}

export type ConfirmBookingFromStripeCheckoutResult =
  | { ok: true; bookingStatus: string; alreadyConfirmed: boolean }
  | { ok: false; reason: "NOT_PAID" | "MISSING_METADATA" | "PAYMENT_NOT_FOUND" | "CHECKOUT_MISMATCH" | "BOOKING_MISMATCH" | "ACCOUNT_MISMATCH" | "AMOUNT_MISMATCH" | "PROCESSING" | "CONFIRM_FAILED" };

/**
 * Idempotently marks a Stripe Checkout session as paid and confirms the booking.
 * Used by both the Stripe webhook and the post-checkout success return page.
 */
export async function confirmBookingFromStripeCheckoutSession(
  session: StripeCheckoutSessionSnapshot,
  options: { revalidateRoster?: boolean; connectedAccountId?: string } = {},
): Promise<ConfirmBookingFromStripeCheckoutResult> {
  const paymentId = session.metadata?.paymentId;
  const bookingId = session.metadata?.bookingId;
  if (!paymentId || !bookingId) {
    return { ok: false, reason: "MISSING_METADATA" };
  }

  if (session.payment_status !== "paid") {
    return { ok: false, reason: "NOT_PAID" };
  }

  const existingPayment = await prisma.payment.findUnique({
    where: { id: paymentId },
    include: { teacherPaymentAccount: true },
  });
  if (!existingPayment) {
    return { ok: false, reason: "PAYMENT_NOT_FOUND" };
  }
  if (existingPayment.bookingId !== bookingId) {
    return { ok: false, reason: "BOOKING_MISMATCH" };
  }
  if (existingPayment.provider !== "STRIPE" || ("connectedAccountId" in options &&
    (!options.connectedAccountId || stripeAccountForPayment(existingPayment) !== options.connectedAccountId))) return { ok: false, reason: "ACCOUNT_MISMATCH" };
  if ((session.amount_total != null && session.amount_total !== existingPayment.amountYen)
    || (session.currency != null && session.currency.toLowerCase() !== "jpy")) return { ok: false, reason: "AMOUNT_MISMATCH" };
  if (
    existingPayment.providerCheckoutId &&
    existingPayment.providerCheckoutId !== session.id
  ) {
    return { ok: false, reason: "CHECKOUT_MISMATCH" };
  }
  const intentId = paymentIntentIdFromSession(session);
  if (existingPayment.providerPaymentId && intentId && existingPayment.providerPaymentId !== intentId) return { ok: false, reason: "CHECKOUT_MISMATCH" };
  const queueUnpaidCancellationRefund = () => prisma.$transaction(tx => prepareBookingRefund(tx, {
    actor: "SUPER_ADMIN", policy: { allowed: true, refundEligible: true, rescheduleOffered: false },
    booking: { id: bookingId, quotedPriceYen: existingPayment.amountYen,
      payments: [{ ...existingPayment, status: "SUCCEEDED", providerPaymentId: intentId ?? existingPayment.providerPaymentId }] },
  }));

  const bookingBefore = await prisma.booking.findUnique({
    where: { id: bookingId },
    select: { status: true, cancelledFromStatus: true },
  });
  const alreadyConfirmed = bookingBefore?.status === "CONFIRMED";

  if (!["SUCCEEDED", "REFUNDED"].includes(existingPayment.status)) {
    await prisma.payment.update({
      where: { id: paymentId },
      data: {
        status: "SUCCEEDED",
        providerCheckoutId: session.id,
        providerPaymentId: intentId,
        paidAt: new Date(),
      },
    });
  }

  if (bookingBefore?.status === "CANCELLED" || bookingBefore?.status === "COMPLETED" || existingPayment.status === "REFUNDED") {
    // Money arriving after an unpaid reservation was cancelled must be returned.
    // A delayed duplicate for an already-paid late cancellation grants no new entitlement.
    if (bookingBefore?.status === "CANCELLED" && bookingBefore.cancelledFromStatus === "PENDING_PAYMENT" && existingPayment.status !== "REFUNDED") {
      await queueUnpaidCancellationRefund();
    }
    return { ok: true, bookingStatus: bookingBefore?.status ?? "CANCELLED", alreadyConfirmed: false };
  }
  if (existingPayment.fulfillmentCompletedAt && alreadyConfirmed) return { ok: true, bookingStatus: "CONFIRMED", alreadyConfirmed: true };
  const token = randomUUID();
  const claim = await prisma.payment.updateMany({ where: { id: paymentId, fulfillmentCompletedAt: null,
    OR: [{ fulfillmentLeaseToken: null }, { fulfillmentLeaseExpiresAt: { lte: new Date() } }] },
    data: { fulfillmentLeaseToken: token, fulfillmentLeaseExpiresAt: new Date(Date.now() + PAYMENT_WORK_LEASE_MS) } });
  if (!claim.count) return { ok: false, reason: "PROCESSING" };
  try {
    const fulfillOptions = { ...(options.revalidateRoster === undefined ? {} : { revalidateRoster: options.revalidateRoster }),
      ...(alreadyConfirmed ? { resumeFulfillment: true } : {}) };
    const result = await confirmPaidBookingFromPayment(bookingId, fulfillOptions);
    if (!result.ok) {
      const latest = await prisma.booking.findUnique({ where: { id: bookingId }, select: { status: true, cancelledFromStatus: true } });
      if (latest?.status === "CANCELLED" && latest.cancelledFromStatus === "PENDING_PAYMENT") {
        await queueUnpaidCancellationRefund();
        return { ok: true, bookingStatus: "CANCELLED", alreadyConfirmed: false };
      }
      return { ok: false, reason: "CONFIRM_FAILED" };
    }
    await prisma.payment.updateMany({ where: { id: paymentId, fulfillmentLeaseToken: token }, data: { fulfillmentCompletedAt: new Date() } });
    return { ok: true, bookingStatus: result.booking.status, alreadyConfirmed };
  } finally {
    await prisma.payment.updateMany({ where: { id: paymentId, fulfillmentLeaseToken: token }, data: { fulfillmentLeaseToken: null, fulfillmentLeaseExpiresAt: null } });
  }
}
