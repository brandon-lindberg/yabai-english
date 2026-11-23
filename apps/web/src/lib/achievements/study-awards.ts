import "server-only";
import type { LearningLanguage, Prisma } from "@/generated/prisma/client";
import { attemptedQuickReviewState } from "@/lib/study/quick-review-selection";
import { crossedStudyMilestones, studyCardAwardLimit } from "./gallery";
import { recordMasteredCard } from "./study-mastery";
import { saveAchievements } from "./award-store";
import { achievementScope } from "./rarity";
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
  masteredCardId?: string;
  totalXp: number;
  xpGained: number;
  firstLevelCompleted?: boolean;
}): Promise<StudyAward[]> {
  const newMasteredTotal = evidence.masteredCardId
    ? await recordMasteredCard(tx, owner, evidence.masteredCardId)
    : undefined;
  const candidates = crossedStudyMilestones({ ...evidence, newMasteredTotal });
  const granted = await saveAchievements(tx, owner.userId, achievementScope(false, owner.learningLanguage), candidates.map(({ id }) => id));
  return granted.map(({ id, title, awardedAt }) => ({ id, title, awardedAt, language: owner.learningLanguage }));
}
