import { access } from "node:fs/promises";
import { expect, test } from "vitest";
import sourceLock from "../../../../data/japanese-content/source-lock.json";
import { japaneseStudyFixture } from "../../../../test/japanese-study-fixture";
import { vocabularySchema, type JapaneseCorpusInput } from "../corpus-audit";
import { parseSourceLock, sourceLockDigest } from "../source-files";
import { loadJapaneseStudyArtifacts } from "../study-artifacts";
import { loadJapaneseStudyContentReview, reviewJapaneseStudyContent } from "../study-content-review";
import { applyVocabularyCorrections, vocabularyRecordDigest } from "../vocabulary-corrections";
import { expectReviewedExamples } from "./reviewed-card-assertions";

const lock = parseSourceLock(sourceLock);
function fixture() {
  const word = vocabularySchema.parse({ id: "parting", word: "おげんきで", reading: "おげんきで", level: "N2", meanings: ["take care"],
    examples: [{ ja: "おげんきで。", en: "Take care.", tatoeba_id: 1 }, { ja: "おげんきですか。", en: "How are you?", tatoeba_id: 2 }],
  });
  const input: JapaneseCorpusInput = { vocabulary: [word], kanji: [], referenceVocabulary: [], dictionaryKanji: [], dictionaryWords: [] };
  const change = { id: word.id, beforeSha256: vocabularyRecordDigest(word), status: "attested", reason: "The complete parting expression is independently attested.",
    patch: { word: "お元気で", other_forms: ["おげんきで"] },
    attestation: { sourceId: "teaching", locator: "parting expression", quotedForm: "お元気で", attestedWritten: "お元気で", reading: "おげんきで", meanings: ["take care"], normalization: "none" },
    exampleReview: { keep: [{ index: 0, reason: "The attested parting expression is preserved." }], omit: [{ index: 1, reason: "The question is a different greeting." }] },
  };
  const ledger = { schemaVersion: 1, sourceLockSha256: sourceLockDigest(lock), records: [change],
    phraseSources: [{ id: "teaching", filename: "teaching.html", role: "phrase", url: "https://example.test/teaching", source: "https://example.test/teaching", license: "Copyright retained", integrity: { algorithm: "sha256", digest: "a".repeat(64) }, title: "Synthetic source", publisher: "Synthetic publisher", retrievedAt: "2026-10-26", use: "citation-only" }],
  };
  return { input, word, change, ledger };
}

test("selects phrase examples against their source-bound attestation, preserving complete originals and sentence objects", () => {
  const { input, word, ledger } = fixture();
  const before = structuredClone(input);
  const result = applyVocabularyCorrections(input, lock, ledger);
  expect(result.input.vocabulary[0]).toMatchObject({ word: "お元気で", reading: "おげんきで", level: "N2", examples: [word.examples[0]] });
  expect(result.originals.parting).toEqual(input.vocabulary[0]);
  expect(result.report.dictionaryVerifiedVocabularyIds).toEqual([]);
  expect(result.ledger.meaningReviews).toBeUndefined();
  expect(input).toEqual(before);
});

test.each(["missing", "duplicate", "out-of-range", "source", "quote", "drift", "patch", "dictionary-citation"])("rejects invalid phrase example accounting: %s", mode => {
  const { input, word, change, ledger } = fixture();
  if (mode === "missing") change.exampleReview.omit = [];
  if (mode === "duplicate") change.exampleReview.keep.push(structuredClone(change.exampleReview.keep[0]));
  if (mode === "out-of-range") change.exampleReview.omit[0].index = 3;
  if (mode === "source") change.attestation.sourceId = "missing";
  if (mode === "quote") change.attestation.quotedForm = "お元気ですか";
  if (mode === "drift") word.examples[0].en = "Changed source sentence.";
  if (mode === "patch") Object.assign(change.patch, { examples: [] });
  if (mode === "dictionary-citation") Object.assign(change.exampleReview.keep[0], { entryId: "1", sense: 1 });
  expect(() => applyVocabularyCorrections(input, lock, ledger)).toThrow();
});

function inventoryFixture() {
  const { input, ledger } = fixture();
  const applied = applyVocabularyCorrections(input, lock, ledger);
  const study = japaneseStudyFixture();
  study.source.cards[0] = { id: "ja-vocabulary:parting", kind: "vocabulary", sourceFileId: "synthetic", referenceRows: [],
    content: vocabularySchema.parse(applied.input.vocabulary[0]), originalContent: applied.originals.parting, phraseEvidence: structuredClone(applied.input.phraseEvidence!.parting),
    dictionaryEvidence: { sourceFileId: "jmdict", entryId: null, entryIds: [], verified: false, support: "unverified", acceptedPairs: [] },
  };
  study.source.corrections = { sha256: "a".repeat(64), records: applied.ledger.records, phraseSources: applied.ledger.phraseSources, referenceResolutions: [] };
  study.policy.overlaps = [];
  study.bind();
  return { study, ledger };
}

test("revalidates phrase selections in the inventory and keeps their counts separate from dictionary decisions", () => {
  const { study, ledger } = inventoryFixture();
  const result = reviewJapaneseStudyContent(study.source, study.build(), study.dictionary);
  expect(result.records.find(row => row.id === "ja-vocabulary:parting")).toMatchObject({
    meanings: [{ text: "take care", status: "phrase-attested", evidence: [] }], dictionarySenses: [],
    phraseExampleReview: { sourceId: "teaching", locator: "parting expression", ...ledger.records[0].exampleReview },
  });
  expect(result.summary.counts).toMatchObject({ reviewedPhraseExampleRecords: 1, selectedPhraseExamples: 1, omittedPhraseExamples: 1, selectedReviewExamples: 0, omittedReviewExamples: 0 });
  const record = study.source.corrections!.records[0];
  if (record.status !== "attested" || !record.exampleReview) throw new Error("fixture");
  record.exampleReview.keep = [];
  study.bind();
  expect(() => reviewJapaneseStudyContent(study.source, study.build(), study.dictionary)).toThrow(/example/i);
});

test.each(["snapshot", "source", "evidence", "effective-content", "original-drift", "duplicate"])("rejects stale or unsupported phrase inventory decisions: %s", mode => {
  const { study } = inventoryFixture();
  const card = study.source.cards[0];
  const change = study.source.corrections!.records[0];
  if (card.kind !== "vocabulary" || change.status !== "attested") throw new Error("fixture");
  if (mode === "snapshot") delete card.originalContent;
  if (mode === "source") change.attestation.sourceId = "missing";
  if (mode === "evidence") card.phraseEvidence!.locator = "Unverified citation.";
  if (mode === "effective-content") card.content.examples[0].en = "Changed translation.";
  if (mode === "original-drift") card.originalContent!.examples[0].en = "Changed original.";
  if (mode === "duplicate") study.source.corrections!.records.push(structuredClone(change));
  study.bind();
  expect(() => reviewJapaneseStudyContent(study.source, study.build(), study.dictionary)).toThrow(/phrase|attestation|drift/i);
});

const cached = await access(".cache/japanese-content/study-v1.json").then(() => true, () => false);
test.runIf(cached)("records the two N2 phrase decisions without changing their definitions, readings, source evidence or originals", async () => {
  const { source } = await loadJapaneseStudyArtifacts(process.cwd());
  for (const [id, sentences, sourceId] of [["321ba5716a", [146661], "phrase-irodori"], ["feb110fb03", [], "phrase-nihongokentei"]] as const) {
    const card = expectReviewedExamples(source, id, [...sentences]);
    expect(card.originalContent?.examples).toHaveLength(1);
    expect(card.content.reading).toBe(card.originalContent?.reading);
    expect(card.content.level).toBe(card.originalContent?.level);
    expect(card.phraseEvidence?.sourceId).toBe(sourceId);
    expect(card.dictionaryEvidence).toMatchObject({ entryId: null, entryIds: [], verified: false, acceptedPairs: [] });
    expect(card.meaningReviewBefore).toBeUndefined();
  }
  const wait = source.cards.find(card => card.id === "ja-vocabulary:321ba5716a");
  const know = source.cards.find(card => card.id === "ja-vocabulary:feb110fb03");
  expect(wait?.content.meanings).toEqual(["please wait"]);
  expect(know?.content.meanings).toEqual(["do you know? (honorific)"]);
  if (wait?.kind !== "vocabulary") throw new Error("Missing phrase");
  expect(wait.content.examples).toEqual(wait.originalContent?.examples);
}, 30_000);

test.runIf(cached)("completes the N2 example queue with distinct phrase evidence and unchanged dictionary-meaning counts", async () => {
  const { records, summary } = await loadJapaneseStudyContentReview(process.cwd());
  const n2 = records.filter(row => "written" in row).filter(row => row.introductionLevel === "N2");
  const phrases = n2.filter(row => row.phraseExampleReview);
  expect(phrases.map(row => row.id)).toEqual(["ja-vocabulary:321ba5716a", "ja-vocabulary:feb110fb03"]);
  expect(phrases.map(row => row.phraseExampleReview?.keep.length)).toEqual([1, 0]);
  expect(phrases.map(row => row.phraseExampleReview?.omit.length)).toEqual([0, 1]);
  expect(phrases.every(row => !row.meaningReview && row.dictionarySenses.length === 0)).toBe(true);
  expect(n2.filter(row => row.examples.length && !row.meaningReview?.examples && !row.phraseExampleReview)).toEqual([]);
  expect(n2.filter(row => row.meaningReview?.examples)).toHaveLength(1655);
  expect(n2).toHaveLength(1787);
  const { source } = await loadJapaneseStudyArtifacts(process.cwd());
  const cards = new Map(source.cards.filter(card => card.kind === "vocabulary").map(card => [card.id, card]));
  const withoutSelection = n2.filter(row => !row.meaningReview?.examples && !row.phraseExampleReview);
  const priorOmissions = withoutSelection.filter(row => cards.get(row.id)?.originalContent?.examples.length);
  expect(priorOmissions.map(row => row.id)).toEqual(["ja-vocabulary:91b50bd069", "ja-vocabulary:d374033b31"]);
  for (const row of priorOmissions) {
    const change = source.corrections?.records.find(change => `ja-vocabulary:${change.id}` === row.id);
    expect(change).toBeDefined();
    if (!change || change.status === "deferred") throw new Error("Missing prior correction");
    expect(change.patch.examples).toEqual([]);
    expect(change.reason).toMatch(/example/i);
  }
  expect(priorOmissions.reduce((sum, row) => sum + (cards.get(row.id)?.originalContent?.examples.length ?? 0), 0)).toBe(3);
  expect(withoutSelection.filter(row => !priorOmissions.includes(row))).toHaveLength(128);
  expect(withoutSelection.every(row => row.examples.length === 0)).toBe(true);
  expect(n2.reduce((sum, row) => sum + row.examples.length, 0)).toBe(2489);
  expect(n2.flatMap(row => row.examples).filter(example => !example.literalTarget)).toHaveLength(544);
  expect(summary.counts).toMatchObject({ sourceRecords: 10307, reviewedPhraseExampleRecords: 2, selectedPhraseExamples: 1, omittedPhraseExamples: 1,
    correctedMeaningRecords: 1146,
    meaningsWithExactEvidence: 14686, reviewedEquivalentMeanings: 2526, meaningsToReview: 6, phraseAttestedMeanings: 6,
  });
  expect(summary.publicationChanged).toBe(false);
}, 30_000);
