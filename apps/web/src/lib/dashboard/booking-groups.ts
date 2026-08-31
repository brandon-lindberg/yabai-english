import type { BookingStatus } from "@/generated/prisma/client";

export type BookingForDashboardGrouping = {
  startsAt: Date;
  endsAt: Date;
  status: BookingStatus;
  /** Present when the caller loaded them; absent means "not asked for". */
  refunds?: unknown[];
};

/**
 * Splits student bookings for the dashboard schedule views.
 *
 * `refunded` exists because a cancelled lesson appears in neither of the other
 * two, which left a refunded lesson — and the credit note issued for it —
 * invisible to the student. Only cancellations where money actually went back
 * are listed: a cancellation with no refund has no document to offer.
 */
export function groupBookingsForDashboard<T extends BookingForDashboardGrouping>(
  bookings: T[],
  now: Date
): { upcoming: T[]; completed: T[]; refunded: T[] } {
  const upcoming = bookings.filter(
    (b) => b.endsAt >= now && b.status !== "CANCELLED",
  );
  const completed = bookings
    .filter((b) => b.endsAt < now && b.status !== "CANCELLED")
    .sort((a, b) => b.startsAt.getTime() - a.startsAt.getTime());
  const refunded = bookings
    .filter((b) => b.status === "CANCELLED" && (b.refunds?.length ?? 0) > 0)
    .sort((a, b) => b.startsAt.getTime() - a.startsAt.getTime());
  return { upcoming, completed, refunded };
}
