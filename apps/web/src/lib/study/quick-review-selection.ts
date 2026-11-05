import { weightedSampleWithoutReplacement } from "./quiz";
import { classifyPracticeBand, mistakeRate, type StudyCardPerformanceSlice } from "./study-card-analytics";

export const attemptedQuickReviewState = {
  OR: [{ correctCount: { gt: 0 } }, { wrongCount: { gt: 0 } }],
};

export const quickReviewStateFields = {
  cardId: true, correctCount: true, wrongCount: true, streakCorrect: true, averageAnswerMs: true, latencySampleCount: true,
} as const;

type Candidate = StudyCardPerformanceSlice & { cardId: string };

/** Rank unresolved misses first, then fill any spare slots with a uniform sample. */
export function selectQuickReviewCardIds(cards: Candidate[], limit: number, rng = Math.random): string[] {
  const difficult = cards
    .filter(card => card.wrongCount > 0 && classifyPracticeBand(card) !== "mastered")
    .map(card => ({ card, rate: mistakeRate(card.correctCount, card.wrongCount) ?? 0 }))
    .sort((a, b) => b.rate - a.rate || a.card.streakCorrect - b.card.streakCorrect || b.card.wrongCount - a.card.wrongCount);
  const ids = difficult.slice(0, limit).map(({ card }) => card.cardId);
  if (ids.length === limit) return ids;

  const chosen = new Set(ids);
  const remaining = cards.filter(card => !chosen.has(card.cardId));
  const filler = weightedSampleWithoutReplacement(remaining, () => 1, limit - ids.length, rng);
  return [...ids, ...filler.map(card => card.cardId)];
}
