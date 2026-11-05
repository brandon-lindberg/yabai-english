import { expect, test } from "vitest";
import { selectQuickReviewCardIds } from "../study/quick-review-selection";

function card(cardId: string, correctCount: number, wrongCount: number, streakCorrect: number) {
  return { cardId, correctCount, wrongCount, streakCorrect, averageAnswerMs: null, latencySampleCount: 0 };
}

test("quick review samples without repeats when no cards are difficult", () => {
  const cards = [card("a", 1, 0, 1), card("b", 2, 0, 2), card("c", 9, 1, 6)];
  expect(selectQuickReviewCardIds(cards, 2, () => 0)).toEqual(["a", "b"]);
  expect(selectQuickReviewCardIds(cards, 2, () => 0.99)).toEqual(["c", "b"]);
});

test("a card with an unresolved mistake ranks ahead of a mastered card with more historical misses", () => {
  const cards = [card("mastered", 98, 2, 10), card("difficult", 2, 1, 0)];
  expect(selectQuickReviewCardIds(cards, 1, () => 0)).toEqual(["difficult"]);
});
