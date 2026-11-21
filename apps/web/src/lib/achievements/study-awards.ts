import "server-only";
import type { LearningLanguage, Prisma } from "@/generated/prisma/client";
import { attemptedQuickReviewState } from "@/lib/study/quick-review-selection";
import { crossedStudyMilestones, studyCardAwardLimit } from "./gallery";
import type { StudyAward } from "./study-award-public";

/** Called after the new card state is written, while holding the learner's study lock. */
export async function advanceEnglishStudyAwardCount(tx: Prisma.TransactionClient, userId: string, trackId: string) {
  const owner = { userId, learningLanguage: "ENGLISH" as const };
  const where = { userId_learningLanguage: owner };
  const progress = await tx.learningAchievementStudyProgress.findUnique({ where, select: { cards: true } });
  if (progress) {
    if (progress.cards >= studyCardAwardLimit) return undefined;
    const updated = await tx.learningAchievementStudyProgress.update({ where, select: { cards: true }, data: { cards: { increment: 1 } } });
    return updated.cards;
  }

  // Existing learners bootstrap once from their saved cards. Later reviews
  // touch only this row, and repeat answers never enter this function.
  const cards = await tx.userStudyCardState.count({
    where: { userId, ...attemptedQuickReviewState, card: { deck: { level: { trackId } } } },
    orderBy: { cardId: "asc" }, take: studyCardAwardLimit,
  });
  await tx.learningAchievementStudyProgress.create({ data: { ...owner, cards } });
  return cards;
}

export async function grantStudyAwards(tx: Prisma.TransactionClient, owner: { userId: string; learningLanguage: LearningLanguage }, evidence: {
  newCardTotal?: number;
  totalXp: number;
  xpGained: number;
  firstLevelCompleted?: boolean;
}): Promise<StudyAward[]> {
  const candidates = crossedStudyMilestones(evidence);
  if (!candidates.length) return [];

  const granted = await tx.learningAchievementAward.createManyAndReturn({
    data: candidates.map(({ id }) => ({ ...owner, achievementId: id })),
    select: { achievementId: true, awardedAt: true },
    skipDuplicates: true,
  });
  const byId = new Map(granted.map(row => [row.achievementId, row.awardedAt]));
  return candidates.flatMap(({ id, title }) => {
    const awardedAt = byId.get(id);
    return awardedAt ? [{ id, awardedAt: awardedAt.toISOString(), language: owner.learningLanguage, title: [title[0], title[1]] }] : [];
  });
}
