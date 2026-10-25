import { expect, test } from "vitest";
import { japaneseStudyFixture } from "../../../../test/japanese-study-fixture";
import { reviewJapaneseStudyContent, loadJapaneseStudyContentReview } from "../study-content-review";
import { access } from "node:fs/promises";
import { vocabularyRecordDigest } from "../vocabulary-corrections";

test("accounts for every canonical member without flattening shared meanings or claiming publication", () => {
  const fixture = japaneseStudyFixture();
  const result = reviewJapaneseStudyContent(fixture.source, fixture.build(), fixture.dictionary);
  expect(result.summary).toMatchObject({ publicationChanged: false, counts: { units: 2, sourceRecords: 3, vocabulary: 2, kanji: 1, meaningsWithExactEvidence: 2, meaningsToReview: 0, recordsWithoutExamples: 2 } });
  expect(result.records.map(row => row.id)).toEqual(["kanji", "word-0", "word-1"]);
  expect(result.records.find(row => row.id === "word-1")).toMatchObject({ unitId: "word-0", sourceLevel: "N2", introductionLevel: "N3" });
  expect(result.records.find(row => row.id === "word-1")!.dictionarySenses).toMatchObject([{ entryId: "1", number: 1, pairAllowed: true, gloss: [{ lang: "eng", text: "contents" }] }]);
});

test("matches English meanings only against senses allowed for the exact primary spelling and reading", () => {
  const fixture = japaneseStudyFixture();
  const study = fixture.build();
  fixture.dictionary[0].sense![0].appliesToKanji = ["中身"];
  const result = reviewJapaneseStudyContent(fixture.source, study, fixture.dictionary);
  const member = result.records.find(row => row.id === "word-1")!;
  expect(member.meanings).toEqual([{ text: "contents", status: "needs-review", evidence: [] }]);
  expect(result.summary.counts.meaningsToReview).toBe(1);
});

test("does not certify an unrelated gloss or silently rewrite a source synonym", () => {
  const fixture = japaneseStudyFixture();
  fixture.source.cards[0].content.meanings = ["contents", "unrelated", "CONTENTS  "];
  fixture.bind();
  const before = JSON.stringify(fixture.source);
  const result = reviewJapaneseStudyContent(fixture.source, fixture.build(), fixture.dictionary);
  expect(result.records.find(row => row.id === "word-0")!.meanings.map(item => item.status)).toEqual(["exact", "needs-review", "exact"]);
  expect(JSON.stringify(fixture.source)).toBe(before);
});

test("records missing, duplicate and nonliteral examples as review signals without inventing examples or levels", () => {
  const fixture = japaneseStudyFixture();
  const first = fixture.source.cards[0];
  if (first.kind !== "vocabulary") throw new Error("fixture");
  first.content.examples = [
    { ja: "中身を見ます。", en: "Look at the contents.", tatoeba_id: 12 },
    { ja: "中身を見ます。", en: "Look at the contents.", tatoeba_id: 12 },
    { ja: "別の文です。", en: "A different sentence.", tatoeba_id: 12 },
  ];
  fixture.bind();
  const result = reviewJapaneseStudyContent(fixture.source, fixture.build(), fixture.dictionary);
  expect(result.summary.counts).toMatchObject({ sourceExamples: 3, recordsWithoutExamples: 1, duplicateExamples: 1, examplesWithoutLiteralTarget: 1, exampleSourceIdVariants: 1 });
  const examples = result.records.find(row => row.id === "word-0")!.examples;
  expect(examples[2]).toMatchObject({ index: 2, literalTarget: false, sourceIdHasVariants: true, source: first.content.examples[2] });
  expect(examples[0]).not.toHaveProperty("level");
});

test("fails closed on missing dictionary context and stale catalog artifacts", () => {
  const fixture = japaneseStudyFixture();
  const study = fixture.build();
  expect(() => reviewJapaneseStudyContent(fixture.source, study, [])).toThrow(/dictionary/i);
  fixture.source.cards[0].content.meanings.push("changed");
  expect(() => reviewJapaneseStudyContent(fixture.source, study, fixture.dictionary)).toThrow(/drift/i);
});

test("produces deterministic source-bound review rows even if dictionary order changes", () => {
  const fixture = japaneseStudyFixture();
  const study = fixture.build();
  const before = JSON.stringify(study);
  const result = reviewJapaneseStudyContent(fixture.source, study, fixture.dictionary);
  expect(result).toEqual(reviewJapaneseStudyContent(fixture.source, study, fixture.dictionary.toReversed()));
  expect(result.records.every(row => /^[a-f0-9]{64}$/.test(row.sourceRecordSha256))).toBe(true);
  expect(JSON.stringify(study)).toBe(before);
});

test("recognizes explicit retained wording only after revalidating its source snapshot and eligible sense", () => {
  const fixture = japaneseStudyFixture();
  const card = fixture.source.cards[0];
  if (card.kind !== "vocabulary") throw new Error("fixture");
  card.content.meanings = ["contents."];
  card.meaningReviewBefore = structuredClone(card.content);
  const review = { id: card.content.id, beforeSha256: vocabularyRecordDigest(card.content), action: "retain" as const, reason: "Only a final period differs.",
    meanings: [{ text: "contents.", entryId: "1", sense: 1, gloss: "contents", relation: "equivalent" as const, reason: "Only a final period differs." }],
  };
  fixture.source.corrections = { sha256: "a".repeat(64), records: [], phraseSources: [], referenceResolutions: [], meaningReviews: [review] };
  fixture.bind();
  const result = reviewJapaneseStudyContent(fixture.source, fixture.build(), fixture.dictionary);
  expect(result.summary.counts).toMatchObject({ reviewedEquivalentMeanings: 1, meaningsToReview: 0 });
  expect(result.records.find(row => row.id === card.id)!.meanings[0]).toMatchObject({ status: "reviewed-equivalent", evidence: [{ entryId: "1", sense: 1, gloss: "contents" }] });
  review.meanings[0].gloss = "fabricated"; fixture.bind();
  expect(() => reviewJapaneseStudyContent(fixture.source, fixture.build(), fixture.dictionary)).toThrow(/gloss/i);
});

const cached = await access(".cache/japanese-content/study-v1.json").then(() => true, () => false);
test.runIf(cached)("reviews every pinned source member and translates every current usage value", async () => {
  const { summary, records } = await loadJapaneseStudyContentReview(process.cwd());
  expect(summary.counts).toMatchObject({ units: 10291, sourceRecords: 10307, vocabulary: 7924, kanji: 2383, sourceExamples: 13607, usageValues: 82, translatedUsageValues: 82, correctedMeaningRecords: 1146, retainedMeaningRecords: 1928, reviewedEquivalentMeanings: 2518, selectedReviewExamples: 731, omittedReviewExamples: 107 });
  expect(new Set(records.map(row => row.id)).size).toBe(10307);
  expect(summary.counts.meaningsWithExactEvidence + summary.counts.reviewedEquivalentMeanings + summary.counts.meaningsToReview).toBe(summary.counts.meanings);
  for (const row of records) if ("meaningReview" in row && row.meaningReview?.action === "correct") expect(row.meanings.every(meaning => meaning.status === "exact" || (meaning.status === "reviewed-equivalent" && row.meaningReview?.meanings.find(item => item.text === meaning.text)?.relation === "construction"))).toBe(true);
  expect(summary.publicationChanged).toBe(false);
}, 30_000);
