import { prisma } from "@/lib/prisma";
import { confirmPaidBookingFromPayment } from "@/lib/booking-payment-confirmation";

type StripeCheckoutSessionSnapshot = {
  id: string;
  payment_status: string | null;
  metadata?: Record<string, string | undefined> | null;
  payment_intent?: string | { id?: string } | null;
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
  | { ok: false; reason: "NOT_PAID" | "MISSING_METADATA" | "PAYMENT_NOT_FOUND" | "CHECKOUT_MISMATCH" | "BOOKING_MISMATCH" | "CONFIRM_FAILED" };

/**
 * Idempotently marks a Stripe Checkout session as paid and confirms the booking.
 * Used by both the Stripe webhook and the post-checkout success return page.
 */
export async function confirmBookingFromStripeCheckoutSession(
  session: StripeCheckoutSessionSnapshot,
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
    select: {
      id: true,
      bookingId: true,
      status: true,
      providerCheckoutId: true,
    },
  });
  if (!existingPayment) {
    return { ok: false, reason: "PAYMENT_NOT_FOUND" };
  }
  if (existingPayment.bookingId !== bookingId) {
    return { ok: false, reason: "BOOKING_MISMATCH" };
  }
  if (
    existingPayment.providerCheckoutId &&
    existingPayment.providerCheckoutId !== session.id
  ) {
    return { ok: false, reason: "CHECKOUT_MISMATCH" };
  }

  const bookingBefore = await prisma.booking.findUnique({
    where: { id: bookingId },
    select: { status: true },
  });
  const alreadyConfirmed = bookingBefore?.status === "CONFIRMED";

  if (existingPayment.status !== "SUCCEEDED") {
    await prisma.payment.update({
      where: { id: paymentId },
      data: {
        status: "SUCCEEDED",
        providerCheckoutId: session.id,
        providerPaymentId: paymentIntentIdFromSession(session),
        paidAt: new Date(),
      },
    });
  }

  const result = await confirmPaidBookingFromPayment(bookingId);
  if (!result.ok) {
    if (alreadyConfirmed || result.reason === "INVALID_STATUS") {
      return { ok: true, bookingStatus: "CONFIRMED", alreadyConfirmed: true };
    }
    return { ok: false, reason: "CONFIRM_FAILED" };
  }

  return {
    ok: true,
    bookingStatus: result.booking.status,
    alreadyConfirmed,
  };
}
