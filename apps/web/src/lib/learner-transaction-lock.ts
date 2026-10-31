import "server-only";
import { Prisma } from "@/generated/prisma/client";

/** Shared database infrastructure; domains retain their own transactions and policies. */
export async function lockLearnerTransaction(tx: Prisma.TransactionClient, scope: string, userId: string) {
  await tx.$queryRaw(Prisma.sql`SELECT pg_advisory_xact_lock(hashtextextended(${`${scope}:${userId}`}, 0))::text`);
}
