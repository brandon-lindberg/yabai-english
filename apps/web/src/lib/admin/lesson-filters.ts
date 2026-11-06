import type { Prisma } from "@/generated/prisma/client";

export function upcomingAdminLessonsWhere(now: Date): Prisma.BookingWhereInput {
  return { startsAt: { gte: now }, status: { in: ["CONFIRMED", "PENDING_PAYMENT"] } };
}

export function adminLessonsForPerson(userId: string): Prisma.BookingWhereInput {
  return { OR: [{ studentId: userId }, { teacher: { userId } }] };
}

export const pendingPrivateReschedules = { privateRescheduleStatus: "PENDING" } as const;
