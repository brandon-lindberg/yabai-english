import "server-only";
import { after } from "next/server";
import type { AchievementScope, PrismaClient } from "@/generated/prisma/client";
import { achievementRarity } from "./rarity";

const refreshIntervalMs = 5 * 60_000;
const nextAttempt = new Map<AchievementScope, number>();

export async function refreshUnlockSnapshot(db: PrismaClient, scope: AchievementScope) {
  await db.$transaction(async tx => {
    await tx.$executeRaw`SET LOCAL statement_timeout = '5s'`;
    const [lock] = await tx.$queryRaw<Array<{ acquired: boolean }>>`
      SELECT pg_try_advisory_xact_lock(hashtext('achievement-unlock-snapshot'), hashtext(${scope})) AS acquired
    `;
    if (!lock?.acquired) return;
    const snapshot = await tx.achievementUnlockSnapshot.findUnique({
      where: { scope },
      select: { refreshedAt: true, eligibleUsers: true },
    });
    if (snapshot?.eligibleUsers && Date.now() - snapshot.refreshedAt.getTime() < refreshIntervalMs) return;
    await tx.$queryRaw`SELECT refresh_achievement_unlock_snapshot(${scope}::"AchievementScope")`;
  }, { maxWait: 1000, timeout: 6500 });
}

export async function readUnlockRates(db: PrismaClient, scope: AchievementScope) {
  const snapshot = await db.achievementUnlockSnapshot.findUnique({ where: { scope } });
  const now = Date.now();
  const stale = !snapshot?.eligibleUsers || now - snapshot.refreshedAt.getTime() >= refreshIntervalMs;
  if (stale && now >= (nextAttempt.get(scope) ?? 0)) {
    nextAttempt.set(scope, now + refreshIntervalMs);
    // Refresh the shared counts after the response. Study saves never access them.
    after(() => refreshUnlockSnapshot(db, scope).catch(() => {
      console.warn("Achievement unlock snapshot refresh failed", { scope });
    }));
  }
  return (achievementId: string) => {
    if (!snapshot || !snapshot.awardedCounts || typeof snapshot.awardedCounts !== "object"
      || Array.isArray(snapshot.awardedCounts)) return null;
    const count = snapshot.awardedCounts[achievementId];
    return achievementRarity(typeof count === "number" ? count : 0, snapshot.eligibleUsers);
  };
}
