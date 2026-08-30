import type { BookingStatus } from "@/generated/prisma/client";
import type { StatusTone } from "@/components/ui/status";
import { isHoldExpired } from "@/lib/pending-booking-hold";

/**
 * What a booking is to the person looking at it. EXPIRED is not a stored
 * status: an unpaid booking whose hold lapsed is still a real row, but its slot
 * has gone back on sale, so showing it as "pending payment" would offer an
 * action that no longer exists.
 */
export type BookingDisplayStatus = BookingStatus | "EXPIRED";

export function resolveBookingDisplayStatus(
  booking: { status: BookingStatus; holdExpiresAt: Date | null },
  now: Date = new Date(),
): BookingDisplayStatus {
  if (booking.status === "PENDING_PAYMENT" && isHoldExpired(booking.holdExpiresAt, now)) {
    return "EXPIRED";
  }
  return booking.status;
}

export function bookingStatusKey(status: BookingDisplayStatus) {
  if (status === "EXPIRED") return "statusExpired";
  if (status === "PENDING_PAYMENT") return "statusPendingPayment";
  if (status === "CONFIRMED") return "statusConfirmed";
  if (status === "COMPLETED") return "statusCompleted";
  return "statusCancelled";
}

/**
 * A booking's place on the world's value ladder (see components/ui/status).
 *
 * PENDING_PAYMENT is genuinely mid-transformation — the lesson exists but has
 * not settled — which is exactly what the half-filled silver mark says.
 * CANCELLED is spent rather than an error: nothing went wrong, the grammar is
 * simply used up, so it takes the struck-through rain mark instead of red.
 */
export function bookingStatusTone(status: BookingDisplayStatus): StatusTone {
  if (status === "PENDING_PAYMENT") return "pending";
  if (status === "CANCELLED" || status === "EXPIRED") return "spent";
  return "settled"; // CONFIRMED and COMPLETED are both real, condensed facts
}
