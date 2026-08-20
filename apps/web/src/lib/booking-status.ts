import type { BookingStatus } from "@/generated/prisma/client";
import type { StatusTone } from "@/components/ui/status";

export function bookingStatusKey(status: BookingStatus) {
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
export function bookingStatusTone(status: BookingStatus): StatusTone {
  if (status === "PENDING_PAYMENT") return "pending";
  if (status === "CANCELLED") return "spent";
  return "settled"; // CONFIRMED and COMPLETED are both real, condensed facts
}
