import { existsSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import sourceLock from "../../../../data/japanese-content/source-lock.json";
import correctionData from "../../../../data/japanese-content/vocabulary-corrections.json";
import sourceAudit from "../../../../data/japanese-content/reports/audit.json";
import referenceData from "../../../../data/japanese-content/reference-decisions.json";
import { auditJapaneseCorpus } from "../corpus-audit";
import { loadJapaneseCorpus, parseSourceLock, readPinnedSourceBytes, sourceLockDigest } from "../source-files";
import { applyVocabularyCorrections, parseVocabularyCorrections } from "../vocabulary-corrections";
import { buildJapaneseFlashcardCatalog, summarizeJapaneseFlashcards } from "../flashcard-catalog";
import { parseReferenceDecisions, referenceVocabularyId } from "../reference-decisions";

const lock = parseSourceLock(sourceLock);
const ledger = parseVocabularyCorrections(correctionData);
const references = parseReferenceDecisions(referenceData);
const cache = resolve(".cache/japanese-content");
const cached = [...lock.files, ...ledger.phraseSources].every((file) => existsSync(resolve(cache, file.filename)));

describe("curated vocabulary correction ledger", () => {
  it("records every unmatched reference decision with explicit vocabulary or character treatment", () => {
    expect(references.sourceLockSha256).toBe(sourceLockDigest(lock));
    expect(references.records).toHaveLength(127);
    expect(new Set(references.records.map((record) => record.sourceRow)).size).toBe(127);
    expect(references.records.filter((record) => record.kind === "dictionary-supplement")).toHaveLength(113);
    expect(references.records.filter((record) => record.kind === "character-reading")).toHaveLength(14);
    expect(references.records.filter((record) => record.kind === "dictionary-supplement" && record.glossStatus === "corrected")).toHaveLength(32);
  });

  it("accounts for all 33 raw dictionary failures without authorizing publication or dropping phrases", () => {
    const failures = [...new Set(sourceAudit.issues.filter((issue) => ["MISSING_DICTIONARY_LINK", "INVALID_DICTIONARY_PAIR", "INVALID_DICTIONARY_VARIANT"].includes(issue.code)).map((issue) => issue.id))].sort();
    expect(ledger.sourceLockSha256).toBe(sourceLockDigest(lock));
    expect(ledger.records.map((record) => record.id).sort()).toEqual([...failures, "997f2be694", "b6e9e55b54", "ea45ce4bc8", "5ac33a4880"].sort());
    expect(ledger.records.filter((record) => record.status === "corrected")).toHaveLength(33);
    expect(ledger.records.filter((record) => record.status === "attested").map((record) => record.id)).toEqual(["321ba5716a", "3db8531d3b", "91b50bd069", "feb110fb03"]);
    expect(ledger.records.filter((record) => record.status === "deferred")).toEqual([]);
  });

  it.skipIf(!cached)("verifies the real corrections against pinned dictionaries, including sense restrictions and original-content retention", async () => {
    const ids = [...ledger.records.flatMap((record) => record.status === "corrected" ? record.evidence.dictionaryIds : []),
      ...references.records.flatMap((record) => record.kind === "dictionary-supplement" ? [record.entryId] : []),
    ];
    // Exercise dictionary-first lock ordering and dictionary IDs introduced by corrections.
    const input = await loadJapaneseCorpus({ ...lock, files: [...lock.files].reverse() }, cache, ids);
    for (const source of ledger.phraseSources) await readPinnedSourceBytes(source, cache);
    expect(input.dictionaryWords.find((word) => word.id === "1009670")?.sense?.[0].partOfSpeech).toEqual(["exp"]);
    expect(auditJapaneseCorpus(input).dictionaryVerifiedVocabularyIds).toHaveLength(7778);
    const catalog = buildJapaneseFlashcardCatalog(input, lock, ledger);
    const summary = summarizeJapaneseFlashcards(catalog);
    expect(summary).toMatchObject({
      counts: { vocabulary: 7811, kanji: 2383, referenceRows: 8293, matched: 8165, ambiguous: 1, unmatched: 127 },
      dictionarySupportedVocabulary: 7807, directDictionaryVocabulary: 7795, derivedVocabulary: 12,
      dictionaryVerifiedKanji: 2383, supportedVocabulary: 7811, attestedPhraseVocabulary: 4, unsupportedVocabularyIds: [], corrections: { corrected: 33, attested: 4, deferred: 0 },
      referenceCoverage: { primaryFormSelections: 7, coveredAmbiguousRows: 1, unresolvedAmbiguousRows: 0 },
    });
    expect(summary).not.toHaveProperty("dictionaryVerifiedVocabulary");
    expect(catalog.cards).toHaveLength(10194);
    const multiSense = catalog.reconciliation.find((row) => row.sourceRow === "N5:109");
    expect(multiSense).toMatchObject({ status: "ambiguous", candidateIds: ["997f2be694", "b6e9e55b54", "ea45ce4bc8"], coverage: { disposition: "multiple-senses", coverage: expect.any(Array) } });
    expect(catalog.corrections?.referenceResolutions).toHaveLength(1);
    const preferred = catalog.reconciliation.find((row) => row.sourceRow === "N4:138");
    expect(preferred).toMatchObject({ candidateIds: ["06381dbe4c"], allCandidateIds: ["06381dbe4c", "a58874b751"] });
    expect(catalog.cards.find((card) => card.id === "ja-vocabulary:a58874b751")?.referenceRows).toContain("N4:138");
    expect(catalog.cards.filter((card) => card.kind === "vocabulary" && card.originalContent)).toHaveLength(37);
    for (const id of ["d374033b31", "8814988b80", "91b50bd069"]) {
      const card = catalog.cards.find((card) => card.id === `ja-vocabulary:${id}`);
      expect(card).toMatchObject({ content: { examples: [] } });
      expect(card?.kind === "vocabulary" && card.originalContent?.examples.length).toBeGreaterThan(0);
    }
    for (const card of catalog.cards.filter((card) => card.kind === "vocabulary" && card.phraseEvidence)) expect(card.dictionaryEvidence.verified).toBe(false);
    const wrongSense = structuredClone(ledger);
    const check = wrongSense.records.find((record) => record.id === "83a456da88")!;
    if (check.status !== "corrected") throw new Error("Missing check-verb correction");
    check.evidence.derivations[0].sense = 1;
    expect(() => applyVocabularyCorrections(input, lock, wrongSense)).toThrow(/unused.*evidence|unsupported correction/i);

    const full = buildJapaneseFlashcardCatalog(input, lock, ledger, references);
    expect(summarizeJapaneseFlashcards(full)).toMatchObject({
      sourceCounts: { vocabulary: 7811, kanji: 2383, referenceRows: 8293 },
      counts: { vocabulary: 7924, kanji: 2383, referenceRows: 8293, matched: 8278, ambiguous: 1, unmatched: 14 },
      referenceSupplementVocabulary: 113, supportedVocabulary: 7924, directDictionaryVocabulary: 7908, derivedVocabulary: 12, attestedPhraseVocabulary: 4,
      referenceCoverage: { coveredAmbiguousRows: 1, unresolvedAmbiguousRows: 0, supplementedRows: 113, characterRows: 14, unresolvedUnmatchedRows: 0 },
      referenceDecisions: { rows: 127, correctedGlossRows: 32, missingGlossRows: 3 },
    });
    expect(full.cards).toHaveLength(10307);
    expect(full.cards.filter((card) => card.kind === "vocabulary" && !card.referenceSupplement)).toEqual(catalog.cards.filter((card) => card.kind === "vocabulary"));
    const supplement = (written: string, reading: string) => full.cards.find((card) => card.id === `ja-vocabulary:${referenceVocabularyId(written, reading)}`);
    expect(supplement("館", "たち")).toMatchObject({ content: { jmdict_id: 2868182 }, referenceSupplement: { senses: [{ number: 1, misc: ["poet"] }] } });
    expect(supplement("軒", "けん")).toMatchObject({ content: { meanings: ["counter for buildings (esp. houses)"] } });
    expect(supplement("生", "せい")).toMatchObject({ content: { meanings: ["life", "living"] } });
    expect(supplement("柄", "がら")).toMatchObject({ content: { meanings: ["pattern", "design"] } });
    expect(supplement("ｘ", "バツ")).toMatchObject({ content: { meanings: ["x (mark)", "cross"] } });
    expect(full.cards.find((card) => card.id === "ja-kanji:幹")?.referenceRows).toContain("N1:602");
    expect(full.reconciliation.find((row) => row.sourceRow === "N1:602")).toMatchObject({ status: "unmatched", jmdict_seq: "1577640", resolution: { kind: "character-reading", cardIds: ["ja-kanji:幹"] } });
  }, 15000);
});
