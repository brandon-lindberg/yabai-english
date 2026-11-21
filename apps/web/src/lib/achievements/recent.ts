import "server-only";
import type { LearningLanguage, PrismaClient } from "@/generated/prisma/client";
import catalogue from "./visible-catalogue";

const titles = new Map(catalogue.map(badge => [badge.id, badge.title]));

export async function getRecentLearnerAchievements(db: PrismaClient, userId: string, learningLanguage: LearningLanguage) {
  const awards = await db.learningAchievementAward.findMany({
    where: { userId, learningLanguage, achievementId: { in: [...titles.keys()] } },
    select: { achievementId: true },
    orderBy: [{ awardedAt: "desc" }, { achievementId: "asc" }],
    take: 5,
  });

  return awards.flatMap(({ achievementId }) => {
    const title = titles.get(achievementId);
    return title ? [{ id: achievementId, title }] : [];
  });
}
