import type { BookingStatus } from "@/generated/prisma/client";
import { isBookingOutsideLeadWindow } from "@/lib/lead-time-policy";

export type CancellationActor = "STUDENT" | "TEACHER" | "ADMIN";

export type CancellationPolicyResult = {
  allowed: boolean;
  refundEligible: boolean;
  /** When true, product may offer in-app reschedule instead of treating cancel as refund case (student under 48h). */
  rescheduleOffered: boolean;
  /** When teacher/admin cancels very close to start, student may receive compensation (e.g. free lesson). */
  studentCompensationFreeLesson: boolean;
};

function empty(): CancellationPolicyResult {
  return {
    allowed: false,
    refundEligible: false,
    rescheduleOffered: false,
    studentCompensationFreeLesson: false,
  };
}

function isAtLeastHoursBeforeLesson(lessonStartsAt: Date, now: Date, hours: number): boolean {
  const diffMs = lessonStartsAt.getTime() - now.getTime();
  return diffMs >= hours * 60 * 60 * 1000;
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

  if (input.bookingStatus === "PENDING_PAYMENT") {
    return {
      allowed: true,
      refundEligible: false,
      rescheduleOffered: false,
      studentCompensationFreeLesson: false,
    };
  }

  if (input.bookingStatus !== "CONFIRMED") {
    return empty();
  }

  const now = input.now ?? new Date();
  const actorForCompensation = input.actor === "ADMIN" ? "TEACHER" : input.actor;

  if (actorForCompensation === "STUDENT") {
    const farEnough = isBookingOutsideLeadWindow({
      start: input.lessonStartsAt,
      now,
      minimumHours: 48,
    });
    return {
      allowed: true,
      refundEligible: farEnough,
      rescheduleOffered: !farEnough,
      studentCompensationFreeLesson: false,
    };
  }

  const atLeast24hBefore = isAtLeastHoursBeforeLesson(input.lessonStartsAt, now, 24);
  return {
    allowed: true,
    refundEligible: true,
    rescheduleOffered: false,
    studentCompensationFreeLesson: !atLeast24hBefore,
  };
}
