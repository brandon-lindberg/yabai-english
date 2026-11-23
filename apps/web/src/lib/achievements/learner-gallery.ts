import "server-only";
import type { LearningLanguage, PrismaClient } from "@/generated/prisma/client";
import { attemptedQuickReviewState } from "@/lib/study/quick-review-selection";
import { studyRpgProgressFromTotalXp } from "@/lib/study/rpg-xp";
import { achievementCollection, studyCardAwardLimit } from "./gallery";
import { readLearnerCalendar } from "./learner-calendar";
import { saveAchievements } from "./award-store";
import { achievementScope } from "./rarity";
import { reconcileMasteredCards } from "./study-mastery";

/** Reconcile this learner and subject on a gallery visit. Dashboard previews read saved awards. */
export async function getLearnerGallery(db: PrismaClient, userId: string, learningLanguage: LearningLanguage) {
  const owner = { userId, learningLanguage };
  const track = { learningLanguage, slug: learningLanguage === "ENGLISH" ? "english-flashcards" : "japanese-flashcards" };
  const readAwards = () => db.learningAchievementAward.findMany({
    where: owner, select: { achievementId: true, awardedAt: true },
  });
  const [cards, levels, calendar, existing, mastered] = await Promise.all([
    db.userStudyCardState.count({
      where: { userId, ...attemptedQuickReviewState, card: { deck: { level: { track } } } },
      orderBy: { cardId: "asc" }, take: studyCardAwardLimit,
    }),
    db.userStudyLevelProgress.aggregate({
      where: { userId, level: { track } }, _sum: { xp: true }, _max: { completedAt: true, assessmentPassedAt: true },
    }),
    readLearnerCalendar(db, owner),
    readAwards(),
    reconcileMasteredCards(db, owner, track.slug),
  ]);
  const completed = learningLanguage === "ENGLISH" ? levels._max.assessmentPassedAt : levels._max.completedAt;
  const collection = achievementCollection({
    cards, mastered, ...calendar, rank: studyRpgProgressFromTotalXp(levels._sum.xp ?? 0).rank, completedLevels: completed ? 1 : 0,
  });
  const awarded = new Map(existing.map(row => [row.achievementId, row.awardedAt]));
  const missing = collection.filter(card => card.qualified && !awarded.has(card.id));
  if (missing.length) {
    // Unique per account, subject and badge, including simultaneous first visits.
    await saveAchievements(db, userId, achievementScope(false, learningLanguage), missing.map(card => card.id));
    for (const row of await readAwards()) awarded.set(row.achievementId, row.awardedAt);
  }
  return collection.flatMap(card => {
    const awardedAt = awarded.get(card.id) ?? null;
    return card.hidden && !awardedAt ? [] : [{ ...card, awardedAt }];
  });
}
