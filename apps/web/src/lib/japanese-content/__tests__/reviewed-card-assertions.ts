import { expect } from "vitest";
import type { loadJapaneseStudyArtifacts } from "../study-artifacts";
import type { loadJapaneseStudyContentReview } from "../study-content-review";

type StudySource = Awaited<ReturnType<typeof loadJapaneseStudyArtifacts>>["source"];
type ReviewRecord = Awaited<ReturnType<typeof loadJapaneseStudyContentReview>>["records"][number];

// Example-only additions must not enlarge historical meaning-review cohorts.
export function hasMeaningCohortReview(row: ReviewRecord) {
  return "meaningReview" in row && row.meaningReview && !/^N[1-5] .+ example cohort:/.test(row.meaningReview.reason);
}

function vocabularyCard(source: StudySource, id: string) {
  const card = source.cards.find(card => card.id === `ja-vocabulary:${id}`);
  if (card?.kind !== "vocabulary") throw new Error(`Missing vocabulary ${id}`);
  return card;
}

export function expectReviewedExamples(source: StudySource, id: string, sentenceIds: number[]) {
  const card = vocabularyCard(source, id);
  expect(card.content.examples.map(example => example.tatoeba_id), card.content.word).toEqual(sentenceIds);
  return card;
}

export function expectReviewedCard(source: StudySource, id: string, meanings: string[]) {
  const card = vocabularyCard(source, id);
  expect(card.content.meanings).toEqual(meanings);
  expect(card.originalContent).toBeDefined();
  expect(card.content.word).toBe(card.meaningReviewBefore?.word);
  expect(card.content.reading).toBe(card.meaningReviewBefore?.reading);
  expect(card.content.level).toBe(card.meaningReviewBefore?.level);
  return card;
}


export function expectCompleteExampleReview(row: Extract<ReviewRecord, { written: string }>) {
  const selection = row.meaningReview?.examples;
  const before = row.meaningReviewBefore;
  expect(selection, row.id).toBeDefined();
  expect(before, row.id).toBeDefined();
  if (!selection || !before) throw new Error(`Missing example review or original snapshot: ${row.id}`);
  const indices = [...selection.keep, ...selection.omit].map(decision => decision.index).toSorted((a, b) => a - b);
  expect(indices, row.id).toEqual(before.examples.map((_, index) => index));
  for (const decision of selection.keep) {
    expect(row.meanings.some(meaning => meaning.evidence.some(evidence => evidence.entryId === decision.entryId && evidence.sense === decision.sense)), row.id).toBe(true);
  }
}
