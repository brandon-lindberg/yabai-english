import "server-only";
import type { AchievementScope, PrismaClient } from "@/generated/prisma/client";
import { achievementCollection, calendarAchievementIds } from "./gallery";
import { getTeacherGallery } from "./teacher-gallery";
import { readLearnerCalendar } from "./learner-calendar";
import { awardNotice, saveAchievements } from "./award-store";
import { publishAchievementAwards } from "@/lib/realtime-bus";

type Work = { userId: string; scope: AchievementScope; source: string; leaseUntil: Date };
const batchSize = 12;
const replayLimit = 20;
const replayWindowMs = 15 * 60_000;
const state = globalThis as typeof globalThis & { achievementDrain?: Promise<void>; achievementDrainAt?: number; achievementDrainAgain?: boolean };
const lessonCadenceMs = 15_000;

async function drain(db: PrismaClient, now: Date) {
  const leaseUntil = new Date(now.getTime() + 60_000);
  const jobs = await db.$queryRaw<Work[]>`
    WITH ready AS (
      SELECT "userId", "scope", "source" FROM "AchievementWork"
      WHERE "dueAt" <= ${now} AND ("leaseUntil" IS NULL OR "leaseUntil" <= ${now})
      ORDER BY "dueAt" LIMIT ${batchSize} FOR UPDATE SKIP LOCKED
    )
    UPDATE "AchievementWork" w SET "leaseUntil" = ${leaseUntil} FROM ready
    WHERE (w."userId", w.scope, w.source) = (ready."userId", ready.scope, ready.source)
    RETURNING w."userId", w.scope, w.source, w."leaseUntil"
  `;
  const owners = new Map<string, Work[]>();
  for (const job of jobs) {
    const key = job.userId + ":" + job.scope;
    const group = owners.get(key) ?? [];
    group.push(job);
    owners.set(key, group);
  }
  for (const group of owners.values()) {
    const [{ userId, scope }] = group;
    try {
      if (scope === "TEACHING") {
        await getTeacherGallery(db, userId, now, awards => publishAchievementAwards(userId, awards));
      } else {
        const learningLanguage = scope === "LEARN_JAPANESE" ? "JAPANESE" : "ENGLISH";
        const owner = { userId, learningLanguage } as const;
        const existing = new Set((await db.learningAchievementAward.findMany({
          where: { ...owner, achievementId: { in: calendarAchievementIds } }, select: { achievementId: true },
        })).map(award => award.achievementId));
        if (existing.size < calendarAchievementIds.length) {
          const calendar = await readLearnerCalendar(db, owner, now);
          const ids = achievementCollection(calendar).filter(card => card.qualified && !existing.has(card.id)).map(card => card.id);
          publishAchievementAwards(userId, await saveAchievements(db, userId, scope, ids));
        }
      }
      await db.$transaction(group.map(({ userId, scope, source, leaseUntil }) =>
        db.achievementWork.deleteMany({ where: { userId, scope, source, leaseUntil } })));
    } catch (error) {
      console.error("Achievement work will retry after its lease expires", error instanceof Error ? error.name : "unknown");
    }
  }
}

/** Run bounded checks on the existing stream's heartbeat. All tabs in a process share one drain. */
export function drainAchievementWork(db: PrismaClient, now = new Date(), urgent = false) {
  if (state.achievementDrain) {
    if (urgent) state.achievementDrainAgain = true;
    return state.achievementDrain;
  }
  if (!urgent && now.getTime() - (state.achievementDrainAt ?? 0) < lessonCadenceMs) return Promise.resolve();
  state.achievementDrainAt = now.getTime();
  const running = drain(db, now).then(async () => {
    if (state.achievementDrainAgain) {
      state.achievementDrainAgain = false;
      await drain(db, new Date());
    }
  }).finally(() => {
    state.achievementDrain = undefined;
    state.achievementDrainAgain = false;
  });
  state.achievementDrain = running;
  return running;
}

export async function readRecentAwardNotices(db: PrismaClient, userId: string, scope: AchievementScope, now = new Date()) {
  const filters = {
    select: { achievementId: true, awardedAt: true },
    orderBy: [{ awardedAt: "desc" as const }, { achievementId: "asc" as const }],
    take: replayLimit,
  };
  const awardedAt = { gt: new Date(now.getTime() - replayWindowMs), lte: now };
  const rows = scope === "TEACHING"
    ? await db.teachingAchievementAward.findMany({ ...filters, where: { userId, awardedAt } })
    : await db.learningAchievementAward.findMany({ ...filters, where: { userId, awardedAt, learningLanguage: scope === "LEARN_JAPANESE" ? "JAPANESE" : "ENGLISH" } });
  return rows.reverse().flatMap(row => awardNotice(scope, row));
}
