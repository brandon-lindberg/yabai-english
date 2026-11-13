import { describe, expect, it } from "vitest";
import sourceLock from "../../../../data/japanese-content/source-lock.json";
import { auditJapaneseCorpus, type JapaneseCorpusInput } from "../corpus-audit";
import { parseSourceLock, sourceLockDigest } from "../source-files";
import { referenceRecordDigest } from "../reference-coverage";
import { applyReferenceDecisions, referenceVocabularyId } from "../reference-decisions";
import { dictionaryWordSchema } from "../dictionary";

const lock = parseSourceLock(sourceLock);
function fixture() {
  const input: JapaneseCorpusInput = {
    vocabulary: [{ id: "you", word: "君", reading: "きみ", meanings: ["you"], level: "N5", jmdict_id: 2 }],
    kanji: [{ character: "佐", level: "N1", meanings: ["help"], onyomi: ["サ"], kunyomi: [] }],
    dictionaryKanji: [{ literal: "佐", readingMeaning: { groups: [{ readings: [{ type: "ja_on", value: "サ" }], meanings: [{ lang: "en", value: "help" }] }], nanori: [] } }],
    dictionaryWords: [
      { id: "1", kanji: [{ text: "君" }], kana: [{ text: "くん", appliesToKanji: ["*"] }], sense: [{ partOfSpeech: ["suf"], appliesToKanji: ["*"], appliesToKana: ["*"], gloss: [{ lang: "eng", text: "Mr" }] }] },
      { id: "2", kanji: [{ text: "君" }], kana: [{ text: "きみ", appliesToKanji: ["*"] }], sense: [{ partOfSpeech: ["pn"], appliesToKanji: ["*"], appliesToKana: ["*"], gloss: [{ lang: "eng", text: "you" }] }] },
    ], referenceVocabulary: [
      { sourceRow: "N4:2", level: "N4", jmdict_seq: "1", kanji: "君", kana: "くん", waller_definition: "suffix for familiar young male" },
      { sourceRow: "N1:2", level: "N1", jmdict_seq: "", kanji: "佐", kana: "さ", waller_definition: "help" },
    ],
  };
  const decisions = { schemaVersion: 1, sourceLockSha256: sourceLockDigest(lock), records: [
    { sourceRow: "N4:2", beforeSha256: referenceRecordDigest(input.referenceVocabulary[0]), reason: "A name suffix is distinct from the pronoun.", kind: "dictionary-supplement", entryId: "1", senses: [1], glossStatus: "aligned" },
    { sourceRow: "N1:2", beforeSha256: referenceRecordDigest(input.referenceVocabulary[1]), reason: "The on-reading is accounted for by the existing character card, not a standalone word.", kind: "character-reading", readingType: "ja_on" },
  ] };
  const apply = () => applyReferenceDecisions(input, lock, decisions);
  return { input, decisions, apply };
}

describe("source-bound unmatched reference decisions", () => {
  it("preserves usage metadata for the exact kana spelling before falling back to a script-equivalent reading", () => {
    const { input, decisions, apply } = fixture();
    input.dictionaryWords[0].kana.push({ text: "クン", appliesToKanji: ["*"], tags: ["rk"], common: false });
    input.referenceVocabulary[0].kana = "クン";
    decisions.records[0].beforeSha256 = referenceRecordDigest(input.referenceVocabulary[0]);
    expect(Object.values(apply().supplements)[0].reading).toMatchObject({ text: "クン", tags: ["rk"], common: false });
  });

  it("retains dictionary usage tags, frequency flags and sense notes for the selected pair only", () => {
    const { input, apply } = fixture();
    input.dictionaryWords[0] = dictionaryWordSchema.parse({ ...input.dictionaryWords[0],
      kanji: [{ text: "君", common: true, tags: ["rK"] }],
      kana: [{ text: "くん", common: false, tags: ["ok"], appliesToKanji: ["*"] }],
      sense: [{ ...input.dictionaryWords[0].sense![0], misc: ["arch"], info: ["synthetic usage note"], field: ["ling"], dialect: ["ksb"] }],
    });
    expect(Object.values(apply().supplements)[0]).toMatchObject({
      written: { common: true, tags: ["rK"] }, reading: { common: false, tags: ["ok"] },
      senses: [{ number: 1, misc: ["arch"], info: ["synthetic usage note"], field: ["ling"], dialect: ["ksb"] }],
    });
  });
  it("adds the exact pair with selected dictionary meanings and preserves the original source vocabulary and reference", () => {
    const { input, apply } = fixture();
    const original = structuredClone(input);
    const result = apply();
    expect(input).toEqual(original);
    expect(result.input.vocabulary).toHaveLength(2);
    const word = result.input.vocabulary[1];
    expect(word).toMatchObject({ id: referenceVocabularyId("君", "くん"), word: "君", reading: "くん", level: "N4", meanings: ["Mr"], pos: ["suf"], examples: [], jmdict_id: 1 });
    expect(result.supplements[word.id as string]).toMatchObject({ sourceRow: "N4:2", senses: [{ number: 1, partOfSpeech: ["suf"] }] });
    expect(auditJapaneseCorpus(result.input).reconciliation.find((row) => row.sourceRow === "N4:2")).toMatchObject({ status: "matched", candidateIds: [word.id] });
    expect(result.characterReferences).toEqual({ "N1:2": "佐" });
  });

  it("requires exactly one decision for every unmatched row and rejects stale or unknown snapshots", () => {
    const { decisions, apply } = fixture();
    decisions.records.pop();
    expect(apply).toThrow(/unmatched.*coverage/i);
    decisions.records.push(decisions.records[0]);
    expect(apply).toThrow(/duplicate/i);
    const other = fixture();
    other.input.referenceVocabulary[0].kana = "other";
    expect(other.apply).toThrow(/reference.*drift/i);
    const unknown = fixture();
    unknown.decisions.records[0].sourceRow = "N4:unknown";
    expect(unknown.apply).toThrow(/unmatched.*coverage/i);
    const changedLock = fixture();
    changedLock.decisions.sourceLockSha256 = "a".repeat(64);
    expect(changedLock.apply).toThrow(/source lock.*drift/i);
  });

  it("rejects a wrong dictionary entry, missing or repeated sense, and sense-specific reading/spelling restrictions", () => {
    for (const field of ["entry", "sense", "repeat", "reading", "written"] as const) {
      const { input, decisions, apply } = fixture();
      if (field === "entry") decisions.records[0].entryId = "2";
      if (field === "sense") decisions.records[0].senses = [2];
      if (field === "repeat") decisions.records[0].senses = [1, 1];
      if (field === "reading") input.dictionaryWords[0].sense![0].appliesToKana = ["きみ"];
      if (field === "written") input.dictionaryWords[0].sense![0].appliesToKanji = ["別字"];
      expect(apply, field).toThrow(/unsupported.*supplement|duplicate/i);
    }
  });

  it("supports an explicit corrected dictionary ID without rewriting the original reference", () => {
    const { input, decisions, apply } = fixture();
    input.referenceVocabulary[0].jmdict_seq = "obsolete-id";
    decisions.records[0].beforeSha256 = referenceRecordDigest(input.referenceVocabulary[0]);
    decisions.records[0].glossStatus = "corrected";
    const result = apply();
    expect(result.input.referenceVocabulary[0].jmdict_seq).toBe("obsolete-id");
    expect(result.input.vocabulary[1].jmdict_id).toBe(1);
  });

  it("does not convert character readings to words or accept an unverified character/reading", () => {
    const { input, apply } = fixture();
    input.kanji[0].onyomi = ["ベツ"];
    expect(apply).toThrow(/unsupported.*character/i);
    const other = fixture();
    other.input.dictionaryKanji[0].readingMeaning!.groups[0].readings[0].value = "ベツ";
    expect(other.apply).toThrow(/unsupported.*character/i);
    const missing = fixture();
    missing.input.kanji = [];
    expect(missing.apply).toThrow(/unsupported.*character/i);
  });

  it("rejects missing glosses marked aligned and forbids caller-supplied words, levels or meanings", () => {
    const { input, decisions, apply } = fixture();
    input.referenceVocabulary[0].waller_definition = "";
    decisions.records[0].beforeSha256 = referenceRecordDigest(input.referenceVocabulary[0]);
    expect(apply).toThrow(/gloss status/i);
    decisions.records[0].glossStatus = "missing";
    expect(apply().input.vocabulary[1].meanings).toEqual(["Mr"]);
    expect(() => applyReferenceDecisions(input, lock, { ...decisions, records: [{ ...decisions.records[0], meanings: ["invented"] }, decisions.records[1]] })).toThrow();
  });

  it("keeps stable identities across source levels, kana-script equivalents and record order", () => {
    expect(referenceVocabularyId("君", "クン")).toBe(referenceVocabularyId("君", "くん"));
    expect(referenceVocabularyId("君", "きみ")).not.toBe(referenceVocabularyId("君", "くん"));
    const { input, decisions, apply } = fixture();
    const id = apply().input.vocabulary[1].id;
    input.referenceVocabulary[0].level = "N3";
    decisions.records[0].beforeSha256 = referenceRecordDigest(input.referenceVocabulary[0]);
    decisions.records.reverse();
    expect(apply().input.vocabulary[1].id).toBe(id);
  });
});
