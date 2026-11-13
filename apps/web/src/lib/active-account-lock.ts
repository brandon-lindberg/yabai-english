import "server-only";
import { Prisma, type AccountStatus } from "@/generated/prisma/client";
import { isLoginAllowedForAccountStatus } from "@/lib/account-status";

/** Serialize a new session or booking with changes to its participants' access. */
export async function lockActiveAccounts(tx: Prisma.TransactionClient, ...userIds: string[]) {
  const ids = [...new Set(userIds)];
  const rows = await tx.$queryRaw<{ accountStatus: AccountStatus }[]>(
    Prisma.sql`SELECT "accountStatus" FROM "User" WHERE id IN (${Prisma.join(ids)}) ORDER BY id FOR SHARE`,
  );
  return rows.length === ids.length && rows.every(({ accountStatus }) => isLoginAllowedForAccountStatus(accountStatus));
}
