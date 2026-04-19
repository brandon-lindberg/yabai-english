import type { BookingStatus } from "@/generated/prisma/client";

export type BookingForDashboardGrouping = {
  startsAt: Date;
  endsAt: Date;
  status: BookingStatus;
};

/** Splits student bookings into upcoming vs completed (past, non-cancelled), for dashboard schedule views. */
export function groupBookingsForDashboard<T extends BookingForDashboardGrouping>(
  bookings: T[],
  now: Date
): { upcoming: T[]; completed: T[] } {
  const upcoming = bookings.filter(
    (b) => b.endsAt >= now && b.status !== "CANCELLED",
  );
  const completed = bookings
    .filter((b) => b.endsAt < now && b.status !== "CANCELLED")
    .sort((a, b) => b.startsAt.getTime() - a.startsAt.getTime());
  return { upcoming, completed };
}
