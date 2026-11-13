import "server-only";
import { Prisma } from "@/generated/prisma/client";

/** Local database writes only: never hold this transaction open for a provider call. */
export async function lockTransaction(tx: Prisma.TransactionClient, scope: string, key: string) {
  await tx.$queryRaw(Prisma.sql`SELECT pg_advisory_xact_lock(hashtextextended(${`${scope}:${key}`}, 0))::text`);
}
