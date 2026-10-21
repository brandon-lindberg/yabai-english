import { createHash } from "node:crypto";
import { describe, expect, it } from "vitest";
import {
  auditJapaneseCorpus,
  buildJapaneseSamples,
  parseReferenceCsv,
  verifySourceIntegrity,
  type JapaneseCorpusInput,
} from "../corpus-audit";
import { renderJapaneseAudit } from "../report";

const levels = ["N5", "N4", "N3", "N2", "N1"] as const;

/** Deliberately synthetic level assignments; these fixtures are not study data. */
function corpus(): JapaneseCorpusInput {
  const entries = [
    ["猫", "ねこ", "cat", "ビョウ"],
    ["犬", "いぬ", "dog", "ケン"],
    ["鳥", "とり", "bird", "チョウ"],
    ["魚", "さかな", "fish", "ギョ"],
    ["馬", "うま", "horse", "バ"],
  ];
  return {
    vocabulary: entries.map(([word, reading, meaning], i) => ({
      id: `word-${i}`, word, reading, meanings: [meaning], level: levels[i],
      jmdict_id: 1000000 + i,
      examples: [{ ja: `${word}です。`, en: `It is a ${meaning}.`, tatoeba_id: i + 1 }],
    })),
    kanji: entries.map(([character, kun, meaning, on], i) => ({
      character, level: levels[i], onyomi: [on], kunyomi: [kun], meanings: [meaning],
    })),
    dictionaryWords: entries.map(([text, reading], i) => ({
      id: String(1000000 + i), kanji: [{ text }],
      kana: [{ text: reading, appliesToKanji: ["*"] }],
    })),
    dictionaryKanji: entries.map(([literal, kun, meaning, on]) => ({
      literal,
      readingMeaning: { groups: [{
        readings: [{ type: "ja_on", value: on }, { type: "ja_kun", value: kun }],
        meanings: [{ lang: "en", value: meaning }],
      }], nanori: [] },
    })),
    referenceVocabulary: entries.map(([kanji, kana, meaning], i) => ({
      sourceRow: `${levels[i]}:2`, level: levels[i], jmdict_seq: String(1000000 + i),
      kana, kanji, waller_definition: meaning,
    })),
  };
}

describe("pinned source integrity", () => {
  it("checks the Git blob header as well as UTF-8 content", () => {
    const bytes = Buffer.from("猫\n");
    const digest = createHash("sha1").update(`blob ${bytes.length}\0`).update(bytes).digest("hex");
    expect(() => verifySourceIntegrity(bytes, { algorithm: "git-sha1", digest })).not.toThrow();
    expect(() => verifySourceIntegrity(Buffer.from("犬\n"), { algorithm: "git-sha1", digest })).toThrow(/integrity/i);
  });

  it("rejects an altered archive instead of accepting a cached filename", () => {
    const integrity = { algorithm: "sha256" as const, digest: createHash("sha256").update("original").digest("hex") };
    expect(() => verifySourceIntegrity(Buffer.from("original"), integrity)).not.toThrow();
    expect(() => verifySourceIntegrity(Buffer.from("altered"), integrity)).toThrow(/integrity/i);
  });
});

describe("reference CSV ingestion", () => {
  it("preserves quoted commas, escaped quotes, CRLF, and stable source row IDs", () => {
    const rows = parseReferenceCsv('\uFEFFjmdict_seq,kana,kanji,waller_definition\r\n1000000,ねこ,猫,"cat, a ""feline"""\r\n', "N5");
    expect(rows).toEqual([{ sourceRow: "N5:2", level: "N5", jmdict_seq: "1000000", kana: "ねこ", kanji: "猫", waller_definition: 'cat, a "feline"' }]);
  });

  it("does not discard a source row with an empty kanji spelling", () => {
    const rows = parseReferenceCsv("jmdict_seq,kana,kanji,waller_definition\n1000000,ねこ,,cat\n", "N5");
    expect(rows[0].kanji).toBe("");
    expect(rows).toHaveLength(1);
  });

  it("preserves a reference row lacking a dictionary ID for explicit review", () => {
    const rows = parseReferenceCsv("jmdict_seq,kana,kanji,waller_definition\n,い,依,depending on\n", "N1");
    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({ sourceRow: "N1:2", jmdict_seq: "", kana: "い", kanji: "依" });
    const input = corpus();
    input.referenceVocabulary = rows;
    const report = auditJapaneseCorpus(input);
    expect(report.counts.referenceRows).toBe(1);
    expect(report.issues).toEqual(expect.arrayContaining([expect.objectContaining({ code: "MISSING_REFERENCE_DICTIONARY_LINK", id: "N1:2" })]));
  });

  it("preserves and reports a source row lacking an English gloss", () => {
    const rows = parseReferenceCsv("jmdict_seq,kana,kanji,waller_definition\n1000000,ねこ,猫,\n", "N5");
    expect(rows[0].waller_definition).toBe("");
    const input = corpus();
    input.referenceVocabulary = rows;
    expect(auditJapaneseCorpus(input).issues).toEqual(expect.arrayContaining([expect.objectContaining({ code: "MISSING_REFERENCE_GLOSS", id: "N5:2" })]));
  });

  it.each([
    "jmdict_seq,kana,kanji,wrong_header\n1000000,ねこ,猫,cat\n",
    'jmdict_seq,kana,kanji,waller_definition\n1000000,ねこ,猫,"unterminated',
    "jmdict_seq,kana,kanji,waller_definition\n1000000,ねこ,猫\n",
  ])("fails loudly for a malformed reference file", (csv) => {
    expect(() => parseReferenceCsv(csv, "N5")).toThrow();
  });
});

describe("Japanese corpus reconciliation", () => {
  it("accounts for every row across all five levels without approving publication", () => {
    const report = auditJapaneseCorpus(corpus());
    expect(report.counts).toMatchObject({ vocabulary: 5, kanji: 5, referenceRows: 5, matched: 5, ambiguous: 0, unmatched: 0 });
    expect(report.issues).toEqual([]);
    expect(report.dictionaryVerifiedVocabularyIds).toHaveLength(5);
    expect(report.dictionaryVerifiedKanji).toHaveLength(5);
    expect(report.teacherReview).toBe("pending");
    expect(report.publicationReady).toBe(false);
  });

  it("reports missing level coverage rather than assuming a complete N5–N1 corpus", () => {
    const input = corpus();
    input.vocabulary.pop();
    const report = auditJapaneseCorpus(input);
    expect(report.issues).toEqual(expect.arrayContaining([expect.objectContaining({ code: "MISSING_VOCABULARY_LEVEL", id: "N1" })]));
    expect(report.counts.unmatched).toBe(1);
  });

  it("rejects an invalid level instead of silently dropping the record", () => {
    const input = corpus();
    input.vocabulary[0] = { ...input.vocabulary[0], level: "N6" };
    expect(() => auditJapaneseCorpus(input)).toThrow();
  });

  it("reports duplicate IDs, word/reading pairs, and character records", () => {
    const input = corpus();
    input.vocabulary.push({ ...input.vocabulary[0] });
    input.kanji.push({ ...input.kanji[0] });
    const codes = auditJapaneseCorpus(input).issues.map((issue) => issue.code);
    expect(codes).toEqual(expect.arrayContaining(["DUPLICATE_VOCABULARY_ID", "DUPLICATE_VOCABULARY_PAIR", "DUPLICATE_KANJI"]));
  });

  it("keeps homophones and distinct readings rather than merging by spelling or sound", () => {
    const input = corpus();
    input.vocabulary.push(
      { id: "rain", word: "雨", reading: "あめ", meanings: ["rain"], level: "N5" },
      { id: "candy", word: "飴", reading: "あめ", meanings: ["candy"], level: "N4" },
      { id: "tomorrow-ashita", word: "明日", reading: "あした", meanings: ["tomorrow"], level: "N5" },
      { id: "tomorrow-asu", word: "明日", reading: "あす", meanings: ["tomorrow"], level: "N4" },
    );
    const report = auditJapaneseCorpus(input);
    expect(report.counts.vocabulary).toBe(9);
    expect(report.issues.filter((issue) => issue.code.startsWith("DUPLICATE_"))).toEqual([]);
  });

  it("resolves kana-only reference rows by dictionary ID and reading", () => {
    const input = corpus();
    input.referenceVocabulary[0].kanji = "";
    const report = auditJapaneseCorpus(input);
    expect(report.reconciliation.find((row) => row.sourceRow === "N5:2")).toMatchObject({ status: "matched", method: "dictionary-id-and-reading", candidateIds: ["word-0"] });
  });

  it("retains ambiguous and unmatched rows with candidate evidence", () => {
    const input = corpus();
    input.vocabulary.push({ ...input.vocabulary[0], id: "other-spelling", word: "ネコ" });
    input.referenceVocabulary[0].kanji = "";
    input.referenceVocabulary[1].jmdict_seq = "9999999";
    input.referenceVocabulary[1].kanji = "不明";
    input.referenceVocabulary[1].kana = "ふめい";
    const report = auditJapaneseCorpus(input);
    expect(report.counts).toMatchObject({ referenceRows: 5, matched: 3, ambiguous: 1, unmatched: 1 });
    expect(report.reconciliation.find((row) => row.sourceRow === "N5:2")?.candidateIds).toEqual(["other-spelling", "word-0"]);
    expect(report.reconciliation.find((row) => row.sourceRow === "N4:2")).toMatchObject({ status: "unmatched", candidateIds: [] });
  });

  it("reports level disagreements even when the lexical entry matches", () => {
    const input = corpus();
    input.referenceVocabulary[0].level = "N4";
    expect(auditJapaneseCorpus(input).issues).toEqual(expect.arrayContaining([expect.objectContaining({ code: "LEVEL_DISAGREEMENT" })]));
  });

  it("validates spelling/reading restrictions, not just the existence of a dictionary ID", () => {
    const input = corpus();
    input.dictionaryWords[0].kana[0].appliesToKanji = ["別字"];
    const report = auditJapaneseCorpus(input);
    expect(report.issues).toEqual(expect.arrayContaining([expect.objectContaining({ code: "INVALID_DICTIONARY_PAIR", id: "word-0" })]));
    expect(report.dictionaryVerifiedVocabularyIds).not.toContain("word-0");
  });

  it("uses the dictionary reading for irregular compounds", () => {
    const input = corpus();
    input.vocabulary[0] = { id: "today", word: "今日", reading: "きょう", meanings: ["today"], level: "N5", jmdict_id: 1000000 };
    input.dictionaryWords[0] = { id: "1000000", kanji: [{ text: "今日" }], kana: [{ text: "きょう", appliesToKanji: ["*"] }] };
    expect(auditJapaneseCorpus(input).dictionaryVerifiedVocabularyIds).toContain("today");
  });

  it("checks declared variants instead of cross-combining every spelling and reading", () => {
    const input = corpus();
    input.vocabulary[0] = { ...input.vocabulary[0], other_readings: ["まちがい"] };
    const report = auditJapaneseCorpus(input);
    expect(report.issues).toEqual(expect.arrayContaining([expect.objectContaining({ code: "INVALID_DICTIONARY_VARIANT", id: "word-0" })]));
    expect(report.dictionaryVerifiedVocabularyIds).not.toContain("word-0");
  });

  it("reports absent dictionary links and examples instead of fabricating them", () => {
    const input = corpus();
    input.vocabulary[0] = { ...input.vocabulary[0], jmdict_id: undefined, examples: [] };
    const report = auditJapaneseCorpus(input);
    expect(report.issues).toEqual(expect.arrayContaining([
      expect.objectContaining({ code: "MISSING_DICTIONARY_LINK", id: "word-0" }),
      expect.objectContaining({ code: "MISSING_EXAMPLES", id: "word-0" }),
    ]));
  });

  it("allows a legitimate empty on category and preserves okurigana notation", () => {
    const input = corpus();
    input.kanji[0] = { ...input.kanji[0], onyomi: [], kunyomi: ["ね.こ", "-ねこ"] };
    input.dictionaryKanji[0].readingMeaning!.groups[0].readings = [
      { type: "ja_kun", value: "ね.こ" }, { type: "ja_kun", value: "-ねこ" },
    ];
    const report = auditJapaneseCorpus(input);
    expect(report.dictionaryVerifiedKanji).toContain("猫");
    expect(report.issues.filter((issue) => issue.id === "猫")).toEqual([]);
  });

  it("flags character reading drift and supplementary level provenance", () => {
    const input = corpus();
    input.kanji[0] = { ...input.kanji[0], onyomi: ["マチガイ"], supplementary: true };
    const report = auditJapaneseCorpus(input);
    expect(report.issues).toEqual(expect.arrayContaining([expect.objectContaining({ code: "KANJI_READING_DIFFERENCE", id: "猫" })]));
    expect(report.counts.supplementaryKanji).toBe(1);
    expect(report.dictionaryVerifiedKanji).not.toContain("猫");
  });

  it("is deterministic for equivalent input ordering", () => {
    const input = corpus();
    const first = auditJapaneseCorpus(input);
    const second = auditJapaneseCorpus({ ...input, vocabulary: [...input.vocabulary].reverse(), kanji: [...input.kanji].reverse(), referenceVocabulary: [...input.referenceVocabulary].reverse() });
    expect(second).toEqual(first);
  });
});

describe("source-verified samples", () => {
  it("includes one vocabulary and one kanji example per level without claiming teacher review", () => {
    const input = corpus();
    const samples = buildJapaneseSamples(input, auditJapaneseCorpus(input));
    expect(samples).toHaveLength(10);
    expect(new Set(samples.map((sample) => sample.level))).toEqual(new Set(levels));
    expect(samples.every((sample) => sample.teacherReview === "pending" && sample.sourceVerification === "dictionary-form-and-reading")).toBe(true);
  });

  it("excludes unresolved dictionary readings from the sample selection", () => {
    const input = corpus();
    input.vocabulary[0] = { ...input.vocabulary[0], reading: "まちがい" };
    const samples = buildJapaneseSamples(input, auditJapaneseCorpus(input));
    expect(samples.some((sample) => sample.kind === "vocabulary" && sample.id === "word-0")).toBe(false);
  });
});

describe("review report", () => {
  it("shows unresolved coverage and pending teacher review even when structural checks pass", () => {
    const input = corpus();
    input.referenceVocabulary[0].jmdict_seq = "9999999";
    input.referenceVocabulary[0].kanji = "不明";
    input.referenceVocabulary[0].kana = "ふめい";
    const report = auditJapaneseCorpus(input);
    const markdown = renderJapaneseAudit(report, buildJapaneseSamples(input, report));
    expect(markdown).toContain("Unmatched reference rows: **1**");
    expect(markdown).toContain("Teacher review: **pending**");
    expect(markdown).toContain("Publication: **blocked**");
  });

  it("escapes source text in Markdown tables", () => {
    const input = corpus();
    input.vocabulary[0] = { ...input.vocabulary[0], meanings: ["cat | feline <script>unsafe</script>"] };
    const report = auditJapaneseCorpus(input);
    const markdown = renderJapaneseAudit(report, buildJapaneseSamples(input, report));
    expect(markdown).toContain("cat \\| feline &lt;script&gt;unsafe&lt;/script&gt;");
    expect(markdown).not.toContain("<script>");
  });
});
