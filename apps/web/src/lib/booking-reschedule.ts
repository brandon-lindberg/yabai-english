import type { BookingStatus } from "@/generated/prisma/client";
import type { CancellationActor } from "@/lib/booking-policy";

/**
 * Moving a lesson rather than cancelling it.
 *
 * This is the mitigation the cancellation policy already promises: a student
 * inside the 48-hour window gets no refund, so `rescheduleOffered` sends them
 * here instead. The booking keeps its original payment — nothing is refunded
 * and nothing is re-charged, which is what makes this a scheduling change
 * rather than a payments one.
 *
 * Whether the new time is actually available is a separate question, answered
 * by the same availability check that governs booking in the first place.
 */

/** A student may move a given lesson this many times. */
export const MAX_STUDENT_RESCHEDULES = 1;

export type RescheduleRefusal =
  | "NOT_CONFIRMED"
  | "ALREADY_STARTED"
  | "LIMIT_REACHED";

export type ReschedulePolicyResult =
  | { allowed: true }
  | { allowed: false; reason: RescheduleRefusal };

export function evaluateBookingReschedulePolicy(input: {
  actor: CancellationActor;
  bookingStatus: BookingStatus;
  lessonStartsAt: Date;
  rescheduleCount: number;
  now?: Date;
}): ReschedulePolicyResult {
  // Only a paid lesson has something worth preserving. An unpaid one should be
  // cancelled and rebooked, which costs the student nothing.
  if (input.bookingStatus !== "CONFIRMED") {
    return { allowed: false, reason: "NOT_CONFIRMED" };
  }

  const now = input.now ?? new Date();
  if (input.lessonStartsAt.getTime() <= now.getTime()) {
    return { allowed: false, reason: "ALREADY_STARTED" };
  }

  // The cap exists so a paid lesson cannot be moved indefinitely. It binds the
  // student only — a teacher moving their own lesson is rearranging their own
  // time, and the student is protected by the availability check instead.
  if (input.actor === "STUDENT" && input.rescheduleCount >= MAX_STUDENT_RESCHEDULES) {
    return { allowed: false, reason: "LIMIT_REACHED" };
  }

  return { allowed: true };
}
