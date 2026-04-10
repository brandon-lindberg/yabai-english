import type { BookingStatus, LessonTier } from "@prisma/client";

export function getBookingPaymentFlow({
  lessonTier,
  trialAlreadyUsed,
}: {
  lessonTier: LessonTier;
  trialAlreadyUsed: boolean;
}): { status: BookingStatus; requiresPayment: boolean } {
  if (lessonTier === "FREE_TRIAL" && !trialAlreadyUsed) {
    return { status: "CONFIRMED", requiresPayment: false };
  }
  return { status: "PENDING_PAYMENT", requiresPayment: true };
}
