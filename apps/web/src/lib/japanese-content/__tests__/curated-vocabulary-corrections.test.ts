import { existsSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import sourceLock from "../../../../data/japanese-content/source-lock.json";
import correctionData from "../../../../data/japanese-content/vocabulary-corrections.json";
import sourceAudit from "../../../../data/japanese-content/reports/audit.json";
import referenceData from "../../../../data/japanese-content/reference-decisions.json";
import studyPolicy from "../../../../data/japanese-content/study-policy.json";
import { auditJapaneseCorpus } from "../corpus-audit";
import { loadJapaneseCorpus, parseSourceLock, readPinnedSourceBytes, sourceLockDigest } from "../source-files";
import { applyVocabularyCorrections, parseVocabularyCorrections } from "../vocabulary-corrections";
import { buildJapaneseFlashcardCatalog, summarizeJapaneseFlashcards } from "../flashcard-catalog";
import { parseReferenceDecisions, referenceVocabularyId } from "../reference-decisions";
import { buildJapaneseStudyCatalog, summarizeJapaneseStudyCatalog } from "../study-catalog";

const lock = parseSourceLock(sourceLock);
const ledger = parseVocabularyCorrections(correctionData);
const references = parseReferenceDecisions(referenceData);
const cache = resolve(".cache/japanese-content");
const cached = [...lock.files, ...ledger.phraseSources].every((file) => existsSync(resolve(cache, file.filename)));

describe("curated vocabulary correction ledger", () => {
  it("records reading/spelling sense corrections separately from retained wording and accounts for selected examples", () => {
    expect(ledger.meaningReviews?.filter(review => review.action === "correct")).toHaveLength(1146);
    expect(ledger.meaningReviews?.filter(review => review.action === "retain")).toHaveLength(1928);
    expect(ledger.meaningReviews?.find(review => review.id === "434fc61861")?.meanings.map(meaning => meaning.text)).toEqual(["moisture", "dampness"]);
    expect(ledger.meaningReviews?.find(review => review.id === "f9a20b5203")?.examples).toMatchObject({ keep: [], omit: [{ index: 0 }, { index: 1 }] });
  });
  it("records every dictionary-overlap family with a complete grouping decision", () => {
    expect(studyPolicy.overlaps).toHaveLength(161);
    expect(studyPolicy.overlaps.flatMap(overlap=>overlap.groups).filter(group=>group.memberIds.length>1)).toHaveLength(16);
    expect(studyPolicy.overlaps.flatMap(overlap=>overlap.memberIds)).toHaveLength(332);
  });

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
    expect(ledger.records.map((record) => record.id).sort()).toEqual([...failures, "997f2be694", "b6e9e55b54", "ea45ce4bc8", "5ac33a4880", "ab742a2e6a", "65fc20eed5", "c552e79d34", "0294bdc5ab", "23556d634a", "242a0bb0ea", "2a04aa688d", "38dd5eb4a0", "42d999cbab", "5d154c188d", "62682a6308", "771ae04338", "9c3ddb98b7", "c139bcdcb4", "cb012edb7f", "cd42c9314f", "e11ef6d7e3", "f5b7534060", "4418a98992", "5f2087a06a", "ba569eb176", "eedac601c6", "f1135a84c1", "0101791a03", "02e6ac02bf", "1b60cfb2ae", "2352843605", "24aad19c86", "290e4e8db6", "299fd7ae70", "3089867b81", "47e4de1f65", "4f4b90bb7c", "64eb41fae7", "67f7a8d49f", "6325479166", "74638a00a2", "77aabada2a", "bfef822f66", "d0cc8bf9a9", "ed2719ab9d", "ef321ac2d3", "f6ece0aafc"].sort());
    expect(ledger.records.filter((record) => record.status === "corrected")).toHaveLength(76);
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
      dictionaryVerifiedKanji: 2383, supportedVocabulary: 7811, attestedPhraseVocabulary: 4, unsupportedVocabularyIds: [], corrections: { corrected: 76, attested: 4, deferred: 0 },
      referenceCoverage: { primaryFormSelections: 7, coveredAmbiguousRows: 1, unresolvedAmbiguousRows: 0 },
    });
    expect(summary).not.toHaveProperty("dictionaryVerifiedVocabulary");
    expect(catalog.cards).toHaveLength(10194);
    expect(catalog.cards.find((card) => card.id === "ja-vocabulary:ab742a2e6a")?.content.meanings).toEqual(["aunt"]);
    expect(catalog.cards.find((card) => card.id === "ja-vocabulary:65fc20eed5")?.content.meanings).not.toContain("warranty");
    const multiSense = catalog.reconciliation.find((row) => row.sourceRow === "N5:109");
    expect(multiSense).toMatchObject({ status: "ambiguous", candidateIds: ["997f2be694", "b6e9e55b54", "ea45ce4bc8"], coverage: { disposition: "multiple-senses", coverage: expect.any(Array) } });
    expect(catalog.corrections?.referenceResolutions).toHaveLength(1);
    const preferred = catalog.reconciliation.find((row) => row.sourceRow === "N4:138");
    expect(preferred).toMatchObject({ candidateIds: ["06381dbe4c"], allCandidateIds: ["06381dbe4c", "a58874b751"] });
    expect(catalog.cards.find((card) => card.id === "ja-vocabulary:a58874b751")?.referenceRows).toContain("N4:138");
    expect(catalog.cards.filter((card) => card.kind === "vocabulary" && card.originalContent)).toHaveLength(1210);
    const reviewed = catalog.cards.find(card => card.id === "ja-vocabulary:434fc61861");
    expect(reviewed).toMatchObject({ content: { meanings: ["moisture", "dampness"] }, originalContent: { meanings: ["moisture", "dampness", "vapor", "dropsy", "edema"] } });
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
    const study=buildJapaneseStudyCatalog(full,input.dictionaryWords,studyPolicy);
    expect(summarizeJapaneseStudyCatalog(study)).toMatchObject({counts:{units:10291,vocabulary:7908,kanji:2383,sourceRecords:10307,referenceRows:8293,overlapFamilies:161,mergedGroups:16,mergedRecords:32,levelDecisions:408,usedLevelReferences:382,retainedVariantLevels:26}});
    expect(Object.keys(study.recordToUnit).sort()).toEqual(full.cards.map(card=>card.id).sort());
    expect(Object.keys(study.referenceToUnits).sort()).toEqual(full.reconciliation.map(row=>row.sourceRow).sort());
    const unit=(id:string)=>study.recordToUnit[`ja-vocabulary:${id}`];
    expect(unit("04bfe8ab7f")).toBe(unit("3ed7b4fc1a"));
    expect(unit("251266e6d5")).toBe(unit("bd3e76856f"));
    expect(unit("42fbc7ed06")).not.toBe(unit("5ac33a4880"));
    expect(unit("997f2be694")).not.toBe(unit("ea45ce4bc8"));
    expect(unit("03d7b15720")).not.toBe(unit("ab742a2e6a"));
    expect(unit("558866ef86")).not.toBe(unit("9d47958486"));
    expect(study.units.find(group=>group.id===unit("47d9978eab"))?.level.code).toBe("N5");
    expect(full.cards.find(card=>card.id==="ja-vocabulary:47d9978eab")?.content.level).toBe("N1");
    expect(study.levelDecisions.map(row=>row.sourceRow)).toEqual(full.issues.filter(issue=>issue.code==="LEVEL_DISAGREEMENT").map(issue=>issue.id).sort());
    for(const card of full.cards.filter(card=>card.kind==="kanji")) expect(study.units.find(unit=>unit.id===card.id)?.level.code).toBe(card.content.level);
    const mixed=structuredClone(studyPolicy);
    const family=mixed.overlaps.find(overlap=>overlap.entryId==="1537780")!;
    family.groups=[{anchorId:family.memberIds[0],memberIds:family.memberIds,senses:[1]}];
    expect(()=>buildJapaneseStudyCatalog(full,input.dictionaryWords,mixed)).toThrow(/unsupported.*merge/i);
  }, 15000);
});
