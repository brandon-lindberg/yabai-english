import { expect, test } from "vitest";
import sourceLock from "../../../../data/japanese-content/source-lock.json";
import { applyVocabularyCorrections, vocabularyRecordDigest, verifyVocabularyMeaningReview } from "../vocabulary-corrections";
import { parseSourceLock, sourceLockDigest } from "../source-files";
import { vocabularySchema, type JapaneseCorpusInput } from "../corpus-audit";

const lock = parseSourceLock(sourceLock);
function fixture() {
  const input: JapaneseCorpusInput = {
    vocabulary: [{ id: "word", word: "水気", reading: "みずけ", level: "N2", meanings: ["moisture", "edema"], jmdict_id: 1,
      examples: [{ ja: "水気を拭く。", en: "Wipe off the moisture.", tatoeba_id: 1 }, { ja: "別の用法。", en: "A different usage.", tatoeba_id: 2 }] }],
    kanji: [], dictionaryKanji: [], referenceVocabulary: [],
    dictionaryWords: [{ id: "1", kanji: [{ text: "水気" }], kana: [{ text: "みずけ", appliesToKanji: ["*"] }, { text: "すいき", appliesToKanji: ["*"] }], sense: [
      { partOfSpeech: ["n"], appliesToKanji: ["*"], appliesToKana: ["*"], gloss: [{ lang: "eng", text: "moisture" }] },
      { partOfSpeech: ["n"], appliesToKanji: ["*"], appliesToKana: ["すいき"], gloss: [{ lang: "eng", text: "edema" }] },
    ] }],
  };
  const review = { id: "word", beforeSha256: vocabularyRecordDigest(input.vocabulary[0]), action: "correct", reason: "Keep the moisture meaning for みずけ.",
    meanings: [{ text: "moisture", entryId: "1", sense: 1, gloss: "moisture", relation: "exact", reason: "Exact eligible dictionary gloss." }],
    examples: { keep: [{ index: 0, entryId: "1", sense: 1, reason: "Uses the selected moisture sense." }], omit: [{ index: 1, reason: "Not selected for this sense." }] },
  };
  const ledger = { schemaVersion: 1, sourceLockSha256: sourceLockDigest(lock), records: [], meaningReviews: [review] };
  return { input, review, ledger };
}

test("applies explicit sense corrections and example selection without changing source data, identity or level", () => {
  const { input, ledger } = fixture();
  const before = structuredClone(input);
  const result = applyVocabularyCorrections(input, lock, ledger);
  expect(result.input.vocabulary[0]).toMatchObject({ id: "word", word: "水気", reading: "みずけ", level: "N2", meanings: ["moisture"], examples: [vocabularySchema.parse(input.vocabulary[0]).examples[0]] });
  expect(result.originals.word.meanings).toEqual(["moisture", "edema"]);
  expect(result.originals.word.examples).toHaveLength(2);
  expect(input).toEqual(before);
});

test.each(["sense", "reading", "gloss", "relation", "duplicate", "drift"])("rejects unsupported or stale meaning review: %s", field => {
  const { input, review, ledger } = fixture();
  if (field === "sense") review.meanings[0].sense = 99;
  if (field === "reading") Object.assign(review.meanings[0], { sense: 2, text: "edema", gloss: "edema" });
  if (field === "gloss") review.meanings[0].gloss = "fabricated";
  if (field === "relation") review.meanings[0].text = "unrelated";
  if (field === "duplicate") review.meanings.push(structuredClone(review.meanings[0]));
  if (field === "drift") review.beforeSha256 = "a".repeat(64);
  expect(() => applyVocabularyCorrections(input, lock, ledger)).toThrow();
});

test("retains explicitly reviewed wording differences without rewriting the source gloss", () => {
  const { input, review, ledger } = fixture();
  input.vocabulary[0].meanings = ["moisture."];
  review.beforeSha256 = vocabularyRecordDigest(input.vocabulary[0]); review.action = "retain";
  Object.assign(review.meanings[0], { text: "moisture.", relation: "equivalent", reason: "Only sentence punctuation differs." });
  const result = applyVocabularyCorrections(input, lock, ledger);
  expect(result.input.vocabulary[0].meanings).toEqual(["moisture."]);
  review.meanings[0].text = "moisture";
  review.meanings[0].relation = "exact";
  expect(() => applyVocabularyCorrections(input, lock, ledger)).toThrow(/retain/i);
});

test.each(["missing", "duplicate", "foreign-sense", "out-of-range"])("requires complete original-example accounting: %s", mode => {
  const { input, review, ledger } = fixture();
  if (mode === "missing") review.examples.omit = [];
  if (mode === "duplicate") review.examples.keep.push(structuredClone(review.examples.keep[0]));
  if (mode === "foreign-sense") review.examples.keep[0].sense = 2;
  if (mode === "out-of-range") review.examples.omit[0].index = 8;
  expect(() => applyVocabularyCorrections(input, lock, ledger)).toThrow(/example/i);
});

test("cannot patch protected fields or silently overwrite two reviews for the same record", () => {
  const { input, ledger } = fixture();
  expect(() => applyVocabularyCorrections(input, lock, { ...ledger, meaningReviews: [{ ...ledger.meaningReviews[0], level: "N5" }] })).toThrow();
  ledger.meaningReviews.push(structuredClone(ledger.meaningReviews[0]));
  expect(() => applyVocabularyCorrections(input, lock, ledger)).toThrow(/duplicate/i);
});

test.each(["suru", "adverb-to"] as const)("reviews a declared %s construction against its exact base sense without claiming a direct headword", kind => {
  const { input, review, ledger } = fixture();
  const base = kind === "suru" ? "コピー" : "ゆっくり";
  const suffix = kind === "suru" ? "する" : "と";
  const meaning = kind === "suru" ? "to copy" : "slowly";
  Object.assign(input.vocabulary[0], { word: base + suffix, reading: base + suffix, meanings: [meaning], examples: [] });
  input.dictionaryWords = [{ id: "1", kanji: [], kana: [{ text: base, appliesToKanji: ["*"] }], sense: [
    { partOfSpeech: [kind === "suru" ? "vs" : "adv-to"], appliesToKanji: ["*"], appliesToKana: ["*"], gloss: [{ lang: "eng", text: kind === "suru" ? "copy" : meaning }] },
    { partOfSpeech: ["n"], appliesToKanji: ["*"], appliesToKana: ["*"], gloss: [{ lang: "eng", text: "unrelated sense" }] },
  ] }];
  const evidence = { dictionaryIds: ["1"], derivations: [{ kind, entryId: "1", sense: 1, baseWritten: base, baseReading: base }] };
  input.vocabularyEvidence = { word: evidence };
  review.beforeSha256 = vocabularyRecordDigest(input.vocabulary[0]); review.action = "retain";
  Object.assign(review.meanings[0], { text: meaning, gloss: kind === "suru" ? "copy" : meaning, relation: "equivalent" });
  review.examples = { keep: [], omit: [] };
  expect(applyVocabularyCorrections(input, lock, ledger).input.vocabulary[0].meanings).toEqual([meaning]);
  const dictionary = new Map(input.dictionaryWords.map(entry => [entry.id, entry]));
  const raw = vocabularySchema.parse(input.vocabulary[0]);
  const replacement = kind === "suru" ? "to make a copy" : "at a slow pace";
  const construction = { ...review, action: "correct", meanings: review.meanings.map(item => ({ ...item, text: replacement, relation: "construction" })) };
  expect(verifyVocabularyMeaningReview(raw, dictionary, construction, evidence).meanings).toEqual([replacement]);
  expect(() => verifyVocabularyMeaningReview(raw, dictionary, { ...construction, meanings: construction.meanings.map(item => ({ ...item, gloss: "invented gloss" })) }, evidence)).toThrow(/gloss/i);
  expect(() => verifyVocabularyMeaningReview(raw, dictionary, construction)).toThrow(/sense/i);
  const direct = { ...raw, word: base, reading: base };
  expect(() => verifyVocabularyMeaningReview(direct, dictionary, { ...construction, beforeSha256: vocabularyRecordDigest(direct) }, evidence)).toThrow(/sense/i);
  expect(() => verifyVocabularyMeaningReview(raw, dictionary, review)).toThrow(/sense/i);
  expect(() => verifyVocabularyMeaningReview(raw, dictionary, { ...review, meanings: review.meanings.map(meaning => ({ ...meaning, relation: "exact" })) }, evidence)).toThrow(/sense/i);
  const invalid = structuredClone(input);
  invalid.vocabularyEvidence!.word.derivations[0].baseReading = "べつ";
  expect(() => applyVocabularyCorrections(invalid, lock, ledger)).toThrow(/sense/i);
  const wrongPos = structuredClone(input);
  wrongPos.dictionaryWords[0].sense![0].partOfSpeech = ["n"];
  expect(() => applyVocabularyCorrections(wrongPos, lock, ledger)).toThrow(/sense/i);
  Object.assign(review.meanings[0], { sense: 2, text: meaning, gloss: "unrelated sense" });
  expect(() => applyVocabularyCorrections(input, lock, ledger)).toThrow(/sense/i);
});
