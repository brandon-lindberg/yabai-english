import type { BookingStatus } from "@/generated/prisma/client";

export function bookingStatusKey(status: BookingStatus) {
  if (status === "PENDING_PAYMENT") return "statusPendingPayment";
  if (status === "CONFIRMED") return "statusConfirmed";
  if (status === "COMPLETED") return "statusCompleted";
  return "statusCancelled";
}
