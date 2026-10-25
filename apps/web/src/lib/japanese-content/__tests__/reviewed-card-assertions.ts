import { expect } from "vitest";
import type { loadJapaneseStudyArtifacts } from "../study-artifacts";

export function expectReviewedCard(source: Awaited<ReturnType<typeof loadJapaneseStudyArtifacts>>["source"], id: string, meanings: string[]) {
  const card = source.cards.find(card => card.id === `ja-vocabulary:${id}`);
  if (card?.kind !== "vocabulary") throw new Error(`Missing vocabulary ${id}`);
  expect(card.content.meanings).toEqual(meanings);
  expect(card.originalContent).toBeDefined();
  expect(card.content.word).toBe(card.meaningReviewBefore?.word);
  expect(card.content.reading).toBe(card.meaningReviewBefore?.reading);
  expect(card.content.level).toBe(card.meaningReviewBefore?.level);
  return card;
}
