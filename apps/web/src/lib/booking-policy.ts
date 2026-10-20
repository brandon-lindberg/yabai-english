import type { BookingStatus } from "@/generated/prisma/client";
import { isBookingOutsideLeadWindow } from "@/lib/lead-time-policy";

export type CancellationActor = "STUDENT" | "TEACHER" | "SUPER_ADMIN";

export type CancellationPolicyResult = {
  allowed: boolean;
  refundEligible: boolean;
  /** When true, product may offer in-app reschedule instead of treating cancel as refund case (student under 48h). */
  rescheduleOffered: boolean;
};

function empty(): CancellationPolicyResult {
  return {
    allowed: false,
    refundEligible: false,
    rescheduleOffered: false,
  };
}

/**
 * Business rules for who may cancel and what financial / product outcomes apply.
 * Does not perform payment or DB updates — callers use this to gate mutations.
 */
export function evaluateBookingCancellationPolicy(input: {
  actor: CancellationActor;
  bookingStatus: BookingStatus;
  lessonStartsAt: Date;
  now?: Date;
}): CancellationPolicyResult {
  if (input.bookingStatus === "CANCELLED" || input.bookingStatus === "COMPLETED") {
    return empty();
  }

  // A lesson that has begun has no time left to give back, and its status
  // still reads CONFIRMED until someone marks it otherwise. Only an admin may
  // reach behind that — settling a no-show is a refund decision, not a cancel.
  const now = input.now ?? new Date();
  if (input.lessonStartsAt.getTime() <= now.getTime() && input.actor !== "SUPER_ADMIN") {
    return empty();
  }

  if (input.bookingStatus === "PENDING_PAYMENT") {
    return {
      allowed: true,
      refundEligible: false,
      rescheduleOffered: false,
    };
  }

  if (input.bookingStatus !== "CONFIRMED") {
    return empty();
  }

  // Only the student is held to a lead window. A teacher or admin cancelling
  // always refunds in full, however close to the lesson it lands.
  if (input.actor === "STUDENT") {
    const farEnough = isBookingOutsideLeadWindow({
      start: input.lessonStartsAt,
      now,
      minimumHours: 48,
    });
    return {
      allowed: true,
      refundEligible: farEnough,
      rescheduleOffered: !farEnough,
    };
  }

  return {
    allowed: true,
    refundEligible: true,
    rescheduleOffered: false,
  };
}
