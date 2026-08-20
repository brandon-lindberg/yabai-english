import type { BookingStatus, LessonTier } from "@/generated/prisma/client";

/**
 * Dev/test escape hatch: when `BOOKING_AUTO_CONFIRM=true` (or `1`) every booking
 * skips the payment step and goes straight to CONFIRMED. Lets us exercise the
 * confirmed-only paths (Meet link creation, calendar mirroring) without a
 * payment integration. Default behavior — and any other value — runs the normal
 * flow.
 *
 * Never honoured in production. There it would not be a convenience, it would
 * hand out paid lessons for free — silently, with no payment record and nothing
 * in the logs to explain the missing revenue. Every other dev escape hatch here
 * (`DEV_AUTH_BYPASS`, the webhook simulator, local Stripe accounts) is gated the
 * same way; this one was the exception.
 */
function autoConfirmEnabled(): boolean {
  if (process.env.NODE_ENV === "production") return false;
  const v = process.env.BOOKING_AUTO_CONFIRM?.toLowerCase();
  return v === "true" || v === "1";
}

export function getBookingPaymentFlow({
  lessonTier,
  trialAlreadyUsed,
}: {
  lessonTier: LessonTier;
  trialAlreadyUsed: boolean;
}): { status: BookingStatus; requiresPayment: boolean } {
  if (autoConfirmEnabled()) {
    return { status: "CONFIRMED", requiresPayment: false };
  }
  if (lessonTier === "FREE_TRIAL" && !trialAlreadyUsed) {
    return { status: "CONFIRMED", requiresPayment: false };
  }
  return { status: "PENDING_PAYMENT", requiresPayment: true };
}
