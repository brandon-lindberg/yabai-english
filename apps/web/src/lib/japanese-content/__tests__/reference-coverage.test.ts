import { describe, expect, it } from "vitest";
import { auditJapaneseCorpus, type JapaneseCorpusInput } from "../corpus-audit";
import { referenceRecordDigest, verifyReferenceCoverage } from "../reference-coverage";

function fixture() {
  const input: JapaneseCorpusInput = {
    vocabulary: [
      { id: "older", word: "伯父さん", reading: "おじさん", level: "N2", meanings: ["uncle"], jmdict_id: 2261490 },
      { id: "younger", word: "叔父さん", reading: "おじさん", level: "N2", meanings: ["uncle"], jmdict_id: 2261490 },
      { id: "address", word: "小父さん", reading: "おじさん", level: "N2", meanings: ["mister"], jmdict_id: 2261490 },
    ], kanji: [], dictionaryKanji: [],
    dictionaryWords: [{ id: "2261490", kanji: ["伯父さん", "叔父さん", "小父さん"].map((text) => ({ text })),
      kana: [{ text: "おじさん", appliesToKanji: ["*"] }], sense: [
        { partOfSpeech: ["n"], appliesToKanji: ["伯父さん", "叔父さん"], appliesToKana: ["*"], gloss: [{ lang: "eng", text: "uncle" }] },
        { partOfSpeech: ["n"], appliesToKanji: ["小父さん"], appliesToKana: ["*"], gloss: [{ lang: "eng", text: "mister" }] },
      ] }],
    referenceVocabulary: [{ sourceRow: "N5:109", level: "N5", jmdict_seq: "2261490", kanji: "", kana: "おじさん", waller_definition: "uncle, middle aged gentleman" }],
  };
  const resolution = { sourceRow: "N5:109", beforeSha256: referenceRecordDigest(input.referenceVocabulary[0]),
    expectedCandidateIds: ["address", "older", "younger"], disposition: "multiple-senses", reason: "The reference combines kinship and familiar address; preserve separate senses and spellings.",
    coverage: [
      { id: "older", entryId: "2261490", sense: 1, meaning: "uncle", referenceGloss: "uncle" },
      { id: "younger", entryId: "2261490", sense: 1, meaning: "uncle", referenceGloss: "uncle" },
      { id: "address", entryId: "2261490", sense: 2, meaning: "mister", referenceGloss: "middle aged gentleman" },
    ],
  };
  const verify = () => verifyReferenceCoverage(input, auditJapaneseCorpus(input), [resolution]);
  return { input, resolution, verify };
}

describe("explicit multi-sense reference coverage", () => {
  it("accounts for every candidate without pretending the row uniquely identifies one card", () => {
    const { input, resolution, verify } = fixture();
    const before = structuredClone(input);
    expect(verify()).toEqual([resolution]);
    expect(input).toEqual(before);
    expect(auditJapaneseCorpus(input).reconciliation[0].status).toBe("ambiguous");
  });

  it("rejects stale reference content and candidate sets", () => {
    const { input, resolution, verify } = fixture();
    input.referenceVocabulary[0].waller_definition += " changed";
    expect(verify).toThrow(/reference.*drift/i);
    resolution.beforeSha256 = referenceRecordDigest(input.referenceVocabulary[0]);
    resolution.expectedCandidateIds.pop();
    expect(verify).toThrow(/candidate.*drift/i);
  });

  it("requires every candidate exactly once and rejects duplicate reference decisions", () => {
    const { input, resolution, verify } = fixture();
    resolution.coverage.pop();
    expect(verify).toThrow(/coverage.*candidate/i);
    resolution.coverage.push(resolution.coverage[0]);
    expect(verify).toThrow(/duplicate/i);
    expect(() => verifyReferenceCoverage(input, auditJapaneseCorpus(input), [resolution, resolution])).toThrow(/duplicate/i);
  });

  it("rejects absent dictionary entries and senses, unrelated glosses and senses restricted to a different spelling", () => {
    for (const field of ["entry", "sense", "gloss", "restriction"] as const) {
      const { input, resolution, verify } = fixture();
      if (field === "entry") resolution.coverage[0].entryId = "missing";
      if (field === "sense") resolution.coverage[0].sense = 3;
      if (field === "gloss") resolution.coverage[2].meaning = "uncle";
      if (field === "restriction") input.dictionaryWords[0].sense![1].appliesToKanji = ["叔父さん"];
      expect(verify, field).toThrow(/unsupported.*coverage/i);
    }
  });

  it("requires coverage to cite the reference definition and more than one dictionary sense", () => {
    const { resolution, verify } = fixture();
    resolution.coverage[0].referenceGloss = "invented reference meaning";
    expect(verify).toThrow(/reference gloss/i);
    const other = fixture();
    other.input.dictionaryWords[0].sense![0].appliesToKanji = ["*"];
    other.input.vocabulary[2].meanings = ["uncle"];
    other.resolution.coverage[2] = { ...other.resolution.coverage[2], sense: 1, meaning: "uncle" };
    expect(other.verify).toThrow(/multiple.*senses/i);
  });

  it("cannot override unmatched or uniquely matched rows", () => {
    const { input, verify } = fixture();
    input.vocabulary = [input.vocabulary[0]];
    expect(verify).toThrow(/ambiguous reference/i);
  });
});
