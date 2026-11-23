import "server-only";
import type { LearningLanguage, Prisma, PrismaClient } from "@/generated/prisma/client";
import { learnerBadges as catalogue } from "./gallery";
import { teachingMilestones } from "./teaching-catalogue";

export type RecentAchievement = { id: string; title: readonly string[]; hidden?: boolean };

const learnerBadges = new Map<string, RecentAchievement>(catalogue.map(({ id, title, hidden }) => [id, { id, title, hidden }]));
const teacherBadges = new Map<string, RecentAchievement>(teachingMilestones.map(badge => [
  badge.id, { id: badge.id, title: badge.title, hidden: "hidden" in badge },
]));
const recentAwardsQuery = {
  select: { achievementId: true },
  orderBy: [{ awardedAt: "desc" }, { achievementId: "asc" }],
  take: 5,
} satisfies Pick<Prisma.TeachingAchievementAwardFindManyArgs, "select" | "orderBy" | "take">;

function recentAchievements(awards: { achievementId: string }[], badges: Map<string, RecentAchievement>) {
  return awards.flatMap(({ achievementId }) => {
    const badge = badges.get(achievementId);
    return badge ? [badge] : [];
  });
}

export async function getRecentLearnerAchievements(db: PrismaClient, userId: string, learningLanguage: LearningLanguage) {
  const awards = await db.learningAchievementAward.findMany({
    ...recentAwardsQuery,
    where: { userId, learningLanguage, achievementId: { in: [...learnerBadges.keys()] } },
  });
  return recentAchievements(awards, learnerBadges);
}

export async function getRecentTeacherAchievements(db: PrismaClient, userId: string) {
  const awards = await db.teachingAchievementAward.findMany({
    ...recentAwardsQuery,
    where: { userId, achievementId: { in: [...teacherBadges.keys()] } },
  });
  return recentAchievements(awards, teacherBadges);
}
