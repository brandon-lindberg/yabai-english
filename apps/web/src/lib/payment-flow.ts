import type { BookingStatus, LessonTier } from "@/generated/prisma/client";

/**
 * Dev/test escape hatch: when `BOOKING_AUTO_CONFIRM=true` (or `1`) every booking
 * skips the payment step and goes straight to CONFIRMED. Lets us exercise the
 * confirmed-only paths (Meet link creation, calendar mirroring) before the real
 * payment integration is wired up. Default behavior — and any other value — runs
 * the normal flow.
 */
function autoConfirmEnabled(): boolean {
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
