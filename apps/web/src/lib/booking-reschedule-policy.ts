import type { BookingStatus } from "@/generated/prisma/client";

export type BookingRescheduleDenyReason =
  | "INVALID_STATUS"
  | "NEW_START_IN_PAST_OR_PRESENT";

/**
 * Pure checks for whether a booking's times may be changed to a new start.
 * Authorization and calendar side-effects are handled by the API route.
 */
export function evaluateBookingRescheduleTimes(input: {
  bookingStatus: BookingStatus;
  previousStartsAt: Date;
  newStartsAt: Date;
  now?: Date;
}):
  | { ok: true; unchanged: boolean }
  | { ok: false; reason: BookingRescheduleDenyReason } {
  const now = input.now ?? new Date();
  if (
    input.bookingStatus !== "CONFIRMED" &&
    input.bookingStatus !== "PENDING_PAYMENT"
  ) {
    return { ok: false, reason: "INVALID_STATUS" };
  }
  if (input.newStartsAt.getTime() <= now.getTime()) {
    return { ok: false, reason: "NEW_START_IN_PAST_OR_PRESENT" };
  }
  const unchanged =
    input.newStartsAt.getTime() === input.previousStartsAt.getTime();
  return { ok: true, unchanged };
}
