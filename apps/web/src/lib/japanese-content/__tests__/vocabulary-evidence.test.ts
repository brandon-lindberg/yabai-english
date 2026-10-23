import { describe, expect, it } from "vitest";
import { vocabularyPairEvidence, type VocabularyEvidence } from "../vocabulary-evidence";
import { type DictionaryWord } from "../dictionary";

const entry = (id: string, written: string, reading: string, pos = ["n"]): DictionaryWord => ({
  id, kanji: written === reading ? [] : [{ text: written }], kana: [{ text: reading, appliesToKanji: ["*"] }],
  sense: [{ partOfSpeech: pos, appliesToKanji: ["*"], appliesToKana: ["*"], gloss: [{ lang: "eng", text: "synthetic meaning" }] }],
});
const dictionaries = new Map([
  ["1", entry("1", "挨拶", "あいさつ", ["n", "vs"])],
  ["2", entry("2", "静寂", "せいじゃく", ["n"])],
  ["3", entry("3", "煌々", "こうこう", ["adj-t", "adv-to"])],
  ["4", entry("4", "矢鱈", "やたら", ["adj-na"])],
  ["5", entry("5", "何", "なん", ["pn"])],
  ["6", entry("6", "何", "なに", ["pn"])],
]);
const derivation = (kind: "suru" | "adverb-to" | "adverb-ni", entryId: string, baseWritten: string, baseReading: string): VocabularyEvidence => ({
  dictionaryIds: [entryId], derivations: [{ kind, entryId, sense: 1, baseWritten, baseReading }],
});

describe("Japanese vocabulary dictionary evidence", () => {
  it("retains separate dictionary entries for valid alternate readings", () => {
    const evidence: VocabularyEvidence = { dictionaryIds: ["5", "6"], derivations: [] };
    expect(vocabularyPairEvidence("何", "なん", dictionaries, evidence)).toEqual([{ entryId: "5", kind: "direct" }]);
    expect(vocabularyPairEvidence("何", "なに", dictionaries, evidence)).toEqual([{ entryId: "6", kind: "direct" }]);
    expect(vocabularyPairEvidence("何", "あいさつ", dictionaries, evidence)).toEqual([]);
  });

  it.each([
    { kind: "suru" as const, id: "1", base: "挨拶", reading: "あいさつ", written: "挨拶する", targetReading: "あいさつする" },
    { kind: "adverb-to" as const, id: "3", base: "煌々", reading: "こうこう", written: "煌々と", targetReading: "こうこうと" },
    { kind: "adverb-ni" as const, id: "4", base: "矢鱈", reading: "やたら", written: "矢鱈に", targetReading: "やたらに" },
  ])("supports an explicitly declared $kind construction with the correct dictionary sense", ({ kind, id, base, reading, written, targetReading }) => {
    expect(vocabularyPairEvidence(written, targetReading, dictionaries, derivation(kind, id, base, reading))).toEqual([{ entryId: id, kind, sense: 1, baseWritten: base, baseReading: reading }]);
    expect(vocabularyPairEvidence(written, targetReading, dictionaries, { dictionaryIds: [id], derivations: [] })).toEqual([]);
  });

  it("does not strip suffixes globally or accept a homophone with the wrong sense/part of speech", () => {
    expect(vocabularyPairEvidence("静寂する", "せいじゃくする", dictionaries, derivation("suru", "2", "静寂", "せいじゃく"))).toEqual([]);
    expect(vocabularyPairEvidence("挨拶に", "あいさつに", dictionaries, derivation("adverb-ni", "1", "挨拶", "あいさつ"))).toEqual([]);
    expect(vocabularyPairEvidence("煌々と", "こうこうに", dictionaries, derivation("adverb-to", "3", "煌々", "こうこう"))).toEqual([]);
    expect(vocabularyPairEvidence("挨拶する", "あいさつする", dictionaries, derivation("suru", "1", "挨拶", "ちがう"))).toEqual([]);
  });

  it("enforces sense-specific spelling and reading restrictions", () => {
    const restricted = structuredClone(dictionaries);
    restricted.get("1")!.sense![0].appliesToKanji = ["別字"];
    expect(vocabularyPairEvidence("挨拶する", "あいさつする", restricted, derivation("suru", "1", "挨拶", "あいさつ"))).toEqual([]);
    restricted.get("1")!.sense![0].appliesToKanji = ["*"];
    restricted.get("1")!.sense![0].appliesToKana = ["べつのよみ"];
    expect(vocabularyPairEvidence("挨拶する", "あいさつする", restricted, derivation("suru", "1", "挨拶", "あいさつ"))).toEqual([]);
  });

  it("requires the chosen sense to exist and never trusts a POS copied from the candidate corpus", () => {
    const evidence = derivation("suru", "1", "挨拶", "あいさつ");
    evidence.derivations[0].sense = 2;
    expect(vocabularyPairEvidence("挨拶する", "あいさつする", dictionaries, evidence)).toEqual([]);
    const withoutSenses = structuredClone(dictionaries);
    delete withoutSenses.get("1")!.sense;
    expect(vocabularyPairEvidence("挨拶する", "あいさつする", withoutSenses, derivation("suru", "1", "挨拶", "あいさつ"))).toEqual([]);
  });
});
