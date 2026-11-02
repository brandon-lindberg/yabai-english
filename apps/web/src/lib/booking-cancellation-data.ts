import type { PrismaClient } from "@/generated/prisma/client";

/** Shared policy/refund projection; callers enforce ownership before returning anything. */
export function loadBookingForCancellation(db: Pick<PrismaClient, "booking">, bookingId: string) {
  return db.booking.findUnique({
    where: { id: bookingId },
    include: {
      student: { select: { name: true, email: true, studentProfile: { select: { timezone: true } } } },
      teacher: { select: { userId: true, googleCalendarRefreshToken: true, calendarId: true } },
      payments: { where: { status: "SUCCEEDED" }, orderBy: { createdAt: "desc" }, take: 1,
        select: { id: true, provider: true, amountYen: true, status: true, providerPaymentId: true,
          teacherPaymentAccount: { select: { providerAccountId: true } } } },
    },
  });
}
