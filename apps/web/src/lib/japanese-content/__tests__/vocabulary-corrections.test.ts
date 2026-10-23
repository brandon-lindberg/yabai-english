import { describe, expect, it } from "vitest";
import sourceLock from "../../../../data/japanese-content/source-lock.json";
import { type JapaneseCorpusInput } from "../corpus-audit";
import { parseSourceLock, sourceLockDigest } from "../source-files";
import { applyVocabularyCorrections, parseVocabularyCorrections, vocabularyRecordDigest } from "../vocabulary-corrections";

const lock = parseSourceLock(sourceLock);
function fixture() {
  const input: JapaneseCorpusInput = {
    vocabulary: [{ id: "idea", word: "アイデア", reading: "アイデア", level: "N2", meanings: ["idea"], jmdict_id: 1014210, other_forms: ["アイディア"] }],
    kanji: [], referenceVocabulary: [], dictionaryKanji: [],
    dictionaryWords: [{ id: "1014210", kanji: [], kana: [{ text: "アイデア", appliesToKanji: ["*"] }, { text: "アイディア", appliesToKanji: ["*"] }] }],
  };
  const ledger = {
    schemaVersion: 1, sourceLockSha256: sourceLockDigest(lock), records: [{
      id: "idea", beforeSha256: vocabularyRecordDigest(input.vocabulary[0]), status: "corrected",
      reason: "JMdict lists the kana variant with its own pronunciation; retain the source form and declare its reading.",
      patch: { other_readings: ["アイディア"] }, evidence: { dictionaryIds: ["1014210"], derivations: [] },
    }],
  };
  return { input, ledger };
}

describe("explicit Japanese vocabulary corrections", () => {
  it("records a full-expression attestation separately from dictionary verification", () => {
    const { input, ledger } = fixture();
    delete input.vocabulary[0].jmdict_id;
    const attested = { ...ledger,
      phraseSources: [{ id: "teaching", filename: "teaching.html", role: "phrase", url: "https://example.test/teaching", source: "https://example.test/teaching", license: "Copyright retained", integrity: { algorithm: "sha256", digest: "a".repeat(64) }, title: "Synthetic source", publisher: "Synthetic publisher", retrievedAt: "2026-10-23", use: "citation-only" }],
      records: [{ id: "idea", beforeSha256: vocabularyRecordDigest(input.vocabulary[0]), status: "attested", reason: "A complete expression is attested in a pinned teaching source.", patch: { other_forms: [] }, attestation: { sourceId: "teaching", locator: "expression list", quotedForm: "アイデア", attestedWritten: "アイデア", reading: "アイデア", meanings: ["idea"], normalization: "none" } }],
    };
    const result = applyVocabularyCorrections(input, lock, attested);
    expect(result.input.phraseEvidence?.idea).toMatchObject({ sourceId: "teaching" });
    expect(result.report.dictionaryVerifiedVocabularyIds).not.toContain("idea");
    expect(result.originals.idea.other_forms).toEqual(["アイディア"]);
    expect(() => applyVocabularyCorrections(input, lock, { ...attested, phraseSources: [] })).toThrow(/attestation/i);
    const wrong = structuredClone(attested);
    wrong.records[0].attestation.quotedForm = "違う表現";
    expect(() => applyVocabularyCorrections(input, lock, wrong)).toThrow(/attestation/i);
  });

  it("applies a source-bound correction without mutating input, losing identity, or changing its level", () => {
    const { input, ledger } = fixture();
    const before = structuredClone(input);
    const result = applyVocabularyCorrections(input, lock, ledger);
    expect(input).toEqual(before);
    expect(result.input.vocabulary[0]).toMatchObject({ id: "idea", level: "N2", other_forms: ["アイディア"], other_readings: ["アイディア"] });
    expect(result.originals.idea).toMatchObject({ word: "アイデア", other_readings: [] });
    expect(result.ledger.records).toHaveLength(1);
  });

  it("rejects drift in the source lock or original record before applying an old correction", () => {
    const { input, ledger } = fixture();
    expect(() => applyVocabularyCorrections(input, lock, { ...ledger, sourceLockSha256: "a".repeat(64) })).toThrow(/source lock/i);
    input.vocabulary[0].meanings = ["different source meaning"];
    expect(() => applyVocabularyCorrections(input, lock, ledger)).toThrow(/record.*drift/i);
  });

  it.each(["id", "level", "teacherReview"])("cannot patch protected field %s", (field) => {
    const { input, ledger } = fixture();
    ledger.records[0].patch = { ...ledger.records[0].patch, [field]: "invented" };
    expect(() => applyVocabularyCorrections(input, lock, ledger)).toThrow();
  });

  it("rejects duplicate or unknown correction identities rather than applying last-write-wins", () => {
    const { input, ledger } = fixture();
    ledger.records.push(structuredClone(ledger.records[0]));
    expect(() => applyVocabularyCorrections(input, lock, ledger)).toThrow(/duplicate/i);
    ledger.records.pop();
    ledger.records[0].id = "missing";
    expect(() => applyVocabularyCorrections(input, lock, ledger)).toThrow(/unknown/i);
  });

  it("cannot mark a correction complete unless every declared form/reading passes the shared audit", () => {
    const { input, ledger } = fixture();
    ledger.records[0].patch.other_readings = ["ちがう"];
    expect(() => applyVocabularyCorrections(input, lock, ledger)).toThrow(/unsupported correction/i);
  });

  it("requires all cited dictionary entries to be loaded and relevant to the corrected forms", () => {
    const { input, ledger } = fixture();
    ledger.records[0].evidence.dictionaryIds.push("missing-entry");
    expect(() => applyVocabularyCorrections(input, lock, ledger)).toThrow(/dictionary entry/i);
    input.dictionaryWords.push({ id: "missing-entry", kanji: [], kana: [{ text: "ちがう", appliesToKanji: ["*"] }] });
    expect(() => applyVocabularyCorrections(input, lock, ledger)).toThrow(/unused.*evidence/i);
  });

  it("keeps deferred expressions unchanged and never treats them as dictionary verified", () => {
    const { input, ledger } = fixture();
    const deferred = { ...ledger, records: [{ id: "idea", beforeSha256: ledger.records[0].beforeSha256, status: "deferred", reason: "No equivalent dictionary entry found; retain this source record for phrase review." }] };
    const result = applyVocabularyCorrections(input, lock, deferred);
    expect(result.input.vocabulary).toEqual(input.vocabulary);
    expect(result.input.vocabularyEvidence).toEqual({});
    expect(result.ledger.records[0].status).toBe("deferred");
    expect(() => parseVocabularyCorrections({ ...deferred, records: [{ ...deferred.records[0], patch: { word: "other" } }] })).toThrow();
  });

  it("binds example removals to the same original snapshot and keeps the complete original for provenance", () => {
    const { input, ledger } = fixture();
    input.vocabulary[0].examples = [{ ja: "誤った例です。", en: "An unrelated example.", tatoeba_id: 123 }];
    const updated = { ...ledger, records: [{ ...ledger.records[0], beforeSha256: vocabularyRecordDigest(input.vocabulary[0]), patch: { other_readings: ["アイディア"], examples: [] } }] };
    const result = applyVocabularyCorrections(input, lock, updated);
    expect(result.input.vocabulary[0].examples).toEqual([]);
    expect(result.originals.idea.examples).toEqual(input.vocabulary[0].examples);
  });
});
