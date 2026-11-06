import type { Prisma, PrismaClient } from "@/generated/prisma/client";

/** Revokes every session for this account, including sessions shared across sites. */
export async function invalidateUserSessions(
  prisma: PrismaClient | Prisma.TransactionClient,
  userId: string,
  exceptSessionToken?: string,
): Promise<void> {
  await prisma.session.deleteMany({ where: { userId, ...(exceptSessionToken ? { sessionToken: { not: exceptSessionToken } } : {}) } });
}
