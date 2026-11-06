import "server-only";
import { z } from "zod";
import type { Prisma, PrismaClient } from "@/generated/prisma/client";
import { invalidateUserSessions } from "@/lib/admin-invalidate-sessions";
import { PrivateApiFailure } from "@/lib/private-api-error";
import { lockTransaction } from "@/lib/transaction-lock";

const accessChangeSchema = z.object({
  action: z.enum(["suspend", "reinstate"]),
  reason: z.string().trim().min(1).max(1000),
  expectedEventId: z.number().int().positive().nullable(),
}).strict();

export async function lockAdminAccountChanges(tx: Prisma.TransactionClient, actorId: string) {
  // All routes that can remove active admin access use this transaction lock.
  await lockTransaction(tx, "admin", "account-access");
  const actor = await tx.user.count({ where: { id: actorId, role: "SUPER_ADMIN", accountStatus: "ACTIVE" } });
  if (!actor) throw new PrivateApiFailure(403, "Forbidden");
}

export function countActiveAdmins(tx: Prisma.TransactionClient) {
  return tx.user.count({ where: { role: "SUPER_ADMIN", accountStatus: "ACTIVE" } });
}

export async function changeAdminAccountAccess(db: PrismaClient, actorId: string, userId: string, input: unknown) {
  const parsed = accessChangeSchema.safeParse(input);
  if (!parsed.success) throw new PrivateApiFailure(400, "INVALID_ACCESS_CHANGE");
  const { action, reason, expectedEventId } = parsed.data;

  return db.$transaction(async (tx) => {
    await lockAdminAccountChanges(tx, actorId);
    const target = await tx.user.findUnique({
      where: { id: userId },
      select: {
        role: true,
        accountStatus: true,
        adminAccessEvents: { take: 1, orderBy: { id: "desc" } },
      },
    });
    if (!target) throw new PrivateApiFailure(404, "ACCOUNT_NOT_FOUND");
    if (target.role === "SUPER_ADMIN") throw new PrivateApiFailure(409, "ACCOUNT_ROLE_NOT_ELIGIBLE");
    const latest = target.adminAccessEvents[0];
    const fromStatus = target.accountStatus;
    if ((fromStatus === "SUSPENDED") === (action === "suspend")) {
      return { accountStatus: fromStatus, eventId: latest?.id ?? null };
    }
    if ((latest?.id ?? null) !== expectedEventId) {
      throw new PrivateApiFailure(409, "ACCOUNT_ACCESS_CHANGED");
    }
    const toStatus = action === "suspend" ? "SUSPENDED" : latest?.fromStatus;
    if (!toStatus || (action === "reinstate" && (latest?.toStatus !== "SUSPENDED" || toStatus === "SUSPENDED"))) {
      throw new PrivateApiFailure(409, "ACCOUNT_ACCESS_CHANGED");
    }

    await tx.user.update({ where: { id: userId }, data: { accountStatus: toStatus } });
    const event = await tx.adminAccountAccessEvent.create({
      data: { userId, actorId, fromStatus, toStatus, reason },
      select: { id: true },
    });
    await invalidateUserSessions(tx, userId);
    return { accountStatus: toStatus, eventId: event.id };
  });
}
