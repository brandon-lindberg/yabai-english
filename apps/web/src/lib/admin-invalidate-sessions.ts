import type { Prisma, PrismaClient } from "@prisma/client";

/** Clears database sessions so hidden users lose access immediately (database session strategy). */
export async function invalidateUserSessions(
  prisma: PrismaClient | Prisma.TransactionClient,
  userId: string,
): Promise<void> {
  await prisma.session.deleteMany({ where: { userId } });
}
