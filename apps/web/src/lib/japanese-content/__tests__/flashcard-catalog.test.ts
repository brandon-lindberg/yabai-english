import { describe, expect, it } from "vitest";
import sourceLock from "../../../../data/japanese-content/source-lock.json";
import { type JapaneseCorpusInput, JLPT_LEVELS } from "../corpus-audit";
import { parseSourceLock, sourceLockDigest } from "../source-files";
import { buildJapaneseFlashcardCatalog, summarizeJapaneseFlashcards } from "../flashcard-catalog";
import { vocabularyRecordDigest } from "../vocabulary-corrections";
import { referenceRecordDigest } from "../reference-coverage";
import { referenceVocabularyId } from "../reference-decisions";

/** Synthetic community levels, not a teaching bank. */
function corpus(): JapaneseCorpusInput {
  return {
    vocabulary: JLPT_LEVELS.map((level, i) => ({
      id: `word-${i}`, word: `表記${i}`, reading: `よみ${i}`, meanings: [`meaning ${i}`], level,
      jmdict_id: 1000000 + i, other_forms: [], other_readings: [], examples: [],
    })),
    kanji: ["一", "二", "三", "四", "五"].map((character, i) => ({
      character, level: JLPT_LEVELS[i], onyomi: [`オン${i}`], kunyomi: [`くん.${i}`, `くん-${i}`],
      nanori: [`なまえ${i}`], meanings: [`character ${i}`], supplementary: i === 4,
    })),
    dictionaryWords: JLPT_LEVELS.map((_, i) => ({
      id: String(1000000 + i), kanji: [{ text: `表記${i}` }],
      kana: [{ text: `よみ${i}`, appliesToKanji: ["*"] }],
    })),
    dictionaryKanji: ["一", "二", "三", "四", "五"].map((literal, i) => ({
      literal, readingMeaning: { groups: [{
        readings: [
          { type: "ja_on", value: `オン${i}` },
          { type: "ja_kun", value: `くん.${i}` }, { type: "ja_kun", value: `くん-${i}` },
        ], meanings: [{ lang: "en", value: `character ${i}` }],
      }], nanori: [`なまえ${i}`] },
    })),
    referenceVocabulary: JLPT_LEVELS.map((level, i) => ({
      sourceRow: `${level}:2`, level, jmdict_seq: String(1000000 + i),
      kanji: `表記${i}`, kana: `よみ${i}`, waller_definition: `meaning ${i}`,
    })),
  };
}
const lock = parseSourceLock(sourceLock);
const build = (input = corpus()) => buildJapaneseFlashcardCatalog(input, lock);

describe("Japanese flashcard import catalog", () => {
  it("compiles reference supplements with truthful provenance and links character coverage without creating vocabulary duplicates", () => {
    const input = corpus();
    const wordRow = { sourceRow: "N4:3", level: "N4" as const, kanji: "君", kana: "くん", jmdict_seq: "2000000", waller_definition: "name suffix" };
    const kanjiRow = { sourceRow: "N1:3", level: "N1" as const, kanji: "五", kana: "オン4", jmdict_seq: "", waller_definition: "five" };
    input.referenceVocabulary.push(wordRow, kanjiRow);
    input.dictionaryWords.push({ id: "2000000", kanji: [{ text: "君" }], kana: [{ text: "くん", appliesToKanji: ["*"] }],
      sense: [{ partOfSpeech: ["suf"], appliesToKanji: ["*"], appliesToKana: ["*"], gloss: [{ lang: "eng", text: "Mr" }] }],
    });
    const decisions = { schemaVersion: 1, sourceLockSha256: sourceLockDigest(lock), records: [
      { sourceRow: wordRow.sourceRow, beforeSha256: referenceRecordDigest(wordRow), kind: "dictionary-supplement", reason: "Select the name suffix as distinct vocabulary.", entryId: "2000000", senses: [1], glossStatus: "aligned" },
      { sourceRow: kanjiRow.sourceRow, beforeSha256: referenceRecordDigest(kanjiRow), kind: "character-reading", reason: "Already covered by the verified character.", readingType: "ja_on" },
    ] };
    const catalog = buildJapaneseFlashcardCatalog(input, lock, undefined, decisions);
    const id = `ja-vocabulary:${referenceVocabularyId("君", "くん")}`;
    expect(catalog.cards.find((card) => card.id === id)).toMatchObject({ sourceFileId: "waller-original_data-n4.csv", content: { meanings: ["Mr"], level: "N4" }, referenceSupplement: { sourceRow: "N4:3", senses: [{ number: 1 }] } });
    expect(catalog.cards.find((card) => card.id === "ja-kanji:五")?.referenceRows).toEqual(["N1:3"]);
    expect(catalog.reconciliation.find((row) => row.sourceRow === "N1:3")).toMatchObject({ status: "unmatched", resolution: { kind: "character-reading", cardIds: ["ja-kanji:五"] } });
    expect(summarizeJapaneseFlashcards(catalog)).toMatchObject({ sourceCounts: { vocabulary: 5, kanji: 5, referenceRows: 7 }, counts: { vocabulary: 6, matched: 6, unmatched: 1 }, referenceSupplementVocabulary: 1,
      referenceCoverage: { supplementedRows: 1, characterRows: 1, unresolvedUnmatchedRows: 0 },
    });
  });

  it("accounts for every source record and reference row, with separate vocabulary and kanji identities", () => {
    const catalog = build();
    expect(catalog).toMatchObject({ schemaVersion: 4, status: "draft", learningLanguage: "JAPANESE", teacherReview: "pending" });
    expect(catalog.cards).toHaveLength(10);
    expect(new Set(catalog.cards.map((card) => card.id)).size).toBe(10);
    expect(catalog.cards.filter((card) => card.kind === "vocabulary").map((card) => card.id)).toContain("ja-vocabulary:word-0");
    expect(catalog.cards.filter((card) => card.kind === "kanji").map((card) => card.id)).toContain("ja-kanji:一");
    expect(catalog.reconciliation).toHaveLength(5);
    expect(catalog.counts).toMatchObject({ vocabulary: 5, kanji: 5, matched: 5, referenceRows: 5 });
  });

  it("keeps source meanings, examples, dictionary identity, and pinned attribution without claiming content approval", () => {
    const input = corpus();
    input.vocabulary[0].examples = [{ ja: "一です。", en: "It is one.", tatoeba_id: 123, furigana: "一[いち]です。" }];
    const catalog = build(input);
    const card = catalog.cards.find((card) => card.id === "ja-vocabulary:word-0");
    expect(card).toMatchObject({
      kind: "vocabulary", sourceFileId: "openjlpt-data-json-vocab-n5.json",
      content: input.vocabulary[0], referenceRows: ["N5:2"],
      dictionaryEvidence: { sourceFileId: "jmdict", entryId: "1000000", verified: true },
    });
    expect(catalog.sourceLock).toEqual(lock);
    expect(catalog.attribution).toBe("data/japanese-content/ATTRIBUTION.md");
    expect(catalog.teacherReview).toBe("pending");
  });

  it("accepts only dictionary-compatible source spelling/reading pairs, never their unchecked cross product", () => {
    const input = corpus();
    input.vocabulary[0] = {
      ...input.vocabulary[0], word: "今日", reading: "きょう",
      other_forms: ["こんにち", "けふ"], other_readings: ["こんにち", "けふ"],
    };
    input.dictionaryWords[0] = {
      id: "1000000", kanji: [{ text: "今日" }], kana: [
        { text: "きょう", appliesToKanji: ["今日"] },
        { text: "こんにち", appliesToKanji: ["今日"] },
        { text: "けふ", appliesToKanji: [] },
      ],
    };
    const card = build(input).cards.find((card) => card.id === "ja-vocabulary:word-0");
    expect(card?.dictionaryEvidence).toMatchObject({ verified: true, acceptedPairs: [
      { written: "今日", reading: "きょう" }, { written: "今日", reading: "こんにち" },
      { written: "こんにち", reading: "こんにち" }, { written: "けふ", reading: "けふ" },
    ] });
  });

  it("deduplicates kana script equivalents in accepted pairs while retaining all source variants", () => {
    const input = corpus();
    input.vocabulary[0] = { ...input.vocabulary[0], word: "猫", reading: "ねこ", other_readings: ["ネコ", "ねこ"], other_forms: ["猫"] };
    input.dictionaryWords[0] = { id: "1000000", kanji: [{ text: "猫" }], kana: [{ text: "ねこ", appliesToKanji: ["*"] }] };
    const card = build(input).cards.find((card) => card.id === "ja-vocabulary:word-0");
    expect(card).toMatchObject({ content: { other_readings: ["ネコ", "ねこ"], other_forms: ["猫"] }, dictionaryEvidence: { acceptedPairs: [{ written: "猫", reading: "ねこ" }] } });
  });

  it("preserves complete on/kun notation and name readings separately, including inferred levels", () => {
    const catalog = build();
    const card = catalog.cards.find((card) => card.id === "ja-kanji:五");
    expect(card).toMatchObject({
      kind: "kanji", sourceFileId: "openjlpt-data-json-kanji-n1.json",
      content: { level: "N1", supplementary: true, onyomi: ["オン4"], kunyomi: ["くん.4", "くん-4"], nanori: ["なまえ4"] },
      dictionaryEvidence: { sourceFileId: "kanjidic", entryId: "五", verified: true },
    });
    expect(card?.dictionaryEvidence).not.toHaveProperty("acceptedPairs");
  });

  it("retains source part-of-speech and character metadata needed to author useful cards", () => {
    const input = corpus();
    input.vocabulary[0] = { ...input.vocabulary[0], pos: ["n"], romaji: "yomi" };
    input.kanji[0] = { ...input.kanji[0], strokes: 1, grade: 1, freq: null, radical: "一", radical_number: 1, words: ["一", "一日"] };
    const catalog = build(input);
    expect(catalog.cards.find((card) => card.id === "ja-vocabulary:word-0")?.content).toMatchObject({ pos: ["n"], romaji: "yomi" });
    expect(catalog.cards.find((card) => card.id === "ja-kanji:一")?.content).toMatchObject({ strokes: 1, grade: 1, freq: null, radical: "一", radical_number: 1, words: ["一", "一日"] });
  });

  it("keeps invalid or unlinked vocabulary in the catalog and reports it as unverified", () => {
    const input = corpus();
    delete input.vocabulary[0].jmdict_id;
    input.vocabulary[1].reading = "ちがう";
    input.vocabulary[2].other_readings = ["ちがう"];
    const catalog = build(input);
    expect(catalog.cards).toHaveLength(10);
    for (const id of ["word-0", "word-1", "word-2"]) {
      expect(catalog.cards.find((card) => card.id === `ja-vocabulary:${id}`)?.dictionaryEvidence.verified).toBe(false);
    }
    expect(catalog.cards.find((card) => card.id === "ja-vocabulary:word-0")?.dictionaryEvidence).toMatchObject({ entryId: null, acceptedPairs: [] });
    expect(catalog.issues.map((issue) => issue.code)).toEqual(expect.arrayContaining(["MISSING_DICTIONARY_LINK", "INVALID_DICTIONARY_PAIR", "INVALID_DICTIONARY_VARIANT"]));
    expect(summarizeJapaneseFlashcards(catalog).unsupportedVocabularyIds).toEqual(["ja-vocabulary:word-0", "ja-vocabulary:word-1", "ja-vocabulary:word-2"]);
  });

  it("does not manufacture missing kanji readings from vocabulary", () => {
    const input = corpus();
    input.kanji[0].onyomi = [];
    input.kanji[0].kunyomi = [];
    const catalog = build(input);
    expect(catalog.cards.find((card) => card.id === "ja-kanji:一")).toMatchObject({ content: { onyomi: [], kunyomi: [] }, dictionaryEvidence: { verified: false } });
    expect(summarizeJapaneseFlashcards(catalog).unverifiedKanjiIds).toEqual(["ja-kanji:一"]);
  });

  it("preserves conflicting reference levels, unmatched rows, and ambiguous candidates without silently merging them", () => {
    const input = corpus();
    input.referenceVocabulary[0].level = "N3";
    input.referenceVocabulary[1].kana = "ふめい";
    input.referenceVocabulary[1].kanji = "不明";
    input.referenceVocabulary[1].jmdict_seq = "9999999";
    input.vocabulary.push({ ...input.vocabulary[2], id: "word-2-kana", word: "別表記2" });
    input.referenceVocabulary[2].kanji = "";
    const catalog = build(input);
    expect(catalog.cards).toHaveLength(11);
    expect(catalog.cards.find((card) => card.id === "ja-vocabulary:word-0")?.content.level).toBe("N5");
    expect(catalog.reconciliation.find((row) => row.sourceRow === "N5:2")).toMatchObject({ level: "N3", status: "matched", candidateCardIds: ["ja-vocabulary:word-0"] });
    expect(catalog.reconciliation.find((row) => row.sourceRow === "N4:2")).toMatchObject({ status: "unmatched", candidateCardIds: [] });
    expect(catalog.reconciliation.find((row) => row.sourceRow === "N3:2")).toMatchObject({ status: "ambiguous", candidateCardIds: ["ja-vocabulary:word-2", "ja-vocabulary:word-2-kana"] });
    for (const id of ["word-2", "word-2-kana"]) expect(catalog.cards.find((card) => card.id === `ja-vocabulary:${id}`)?.referenceRows).toContain("N3:2");
    expect(catalog.issues).toContainEqual(expect.objectContaining({ id: "N5:2", code: "LEVEL_DISAGREEMENT" }));
  });

  it("does not merge homophones or different readings of the same word", () => {
    const input = corpus();
    input.vocabulary.push(
      { id: "rain", word: "雨", reading: "あめ", meanings: ["rain"], level: "N5" },
      { id: "candy", word: "飴", reading: "あめ", meanings: ["candy"], level: "N5" },
      { id: "tomorrow-a", word: "明日", reading: "あした", meanings: ["tomorrow"], level: "N5" },
      { id: "tomorrow-b", word: "明日", reading: "あす", meanings: ["tomorrow"], level: "N5" },
    );
    expect(build(input).cards).toHaveLength(14);
  });

  it.each(["vocabulary-id", "vocabulary-pair", "kanji", "reference-row"])("rejects duplicate %s before preparing an import", (kind) => {
    const input = corpus();
    if (kind === "vocabulary-id") input.vocabulary.push({ ...input.vocabulary[0], word: "別" });
    if (kind === "vocabulary-pair") input.vocabulary.push({ ...input.vocabulary[0], id: "other" });
    if (kind === "kanji") input.kanji.push({ ...input.kanji[0] });
    if (kind === "reference-row") input.referenceVocabulary.push({ ...input.referenceVocabulary[0] });
    expect(() => build(input)).toThrow(/duplicate/i);
  });

  it("rejects an incomplete N5–N1 corpus or malformed record instead of emitting a partial import", () => {
    const input = corpus();
    input.vocabulary.pop();
    expect(() => build(input)).toThrow(/level/i);
    input.vocabulary.push({ ...input.vocabulary[0], level: "N0" });
    expect(() => build(input)).toThrow();
  });

  it("rejects duplicate dictionary identities rather than selecting one version arbitrarily", () => {
    const input = corpus();
    input.dictionaryWords.push({ ...input.dictionaryWords[0] });
    expect(() => build(input)).toThrow(/duplicate.*JMdict/i);
    input.dictionaryWords.pop();
    input.dictionaryKanji.push({ ...input.dictionaryKanji[0] });
    expect(() => build(input)).toThrow(/duplicate.*KANJIDIC2/i);
  });

  it("rejects Unicode-equivalent duplicate word/reading pairs", () => {
    const input = corpus();
    input.vocabulary[0] = { ...input.vocabulary[0], word: "学校", reading: "がっこう" };
    input.vocabulary.push({ ...input.vocabulary[0], id: "duplicate-nfd", reading: "ガッコウ".normalize("NFD") });
    expect(() => build(input)).toThrow(/duplicate/i);
  });

  it("retains missing examples explicitly and fingerprints changes to source meaning or content", () => {
    const first = build();
    expect(first.cards.find((card) => card.id === "ja-vocabulary:word-0")).toMatchObject({ content: { examples: [] } });
    expect(summarizeJapaneseFlashcards(first).issuesByCode.MISSING_EXAMPLES).toBe(5);
    const input = corpus();
    input.vocabulary[0].meanings = ["a changed meaning"];
    const second = build(input);
    expect(summarizeJapaneseFlashcards(second).catalogSha256).not.toBe(summarizeJapaneseFlashcards(first).catalogSha256);
  });

  it("is reproducible across source-record ordering and does not mutate its inputs", () => {
    const input = corpus();
    const before = structuredClone(input);
    const first = build(input);
    expect(input).toEqual(before);
    const reversed = { ...input, vocabulary: [...input.vocabulary].reverse(), kanji: [...input.kanji].reverse(), dictionaryWords: [...input.dictionaryWords].reverse(), referenceVocabulary: [...input.referenceVocabulary].reverse() };
    expect(build(reversed)).toEqual(first);
    expect(summarizeJapaneseFlashcards(first)).toEqual(summarizeJapaneseFlashcards(build(reversed)));
  });

  it("keeps card identities through a dictionary release change while changing the content fingerprint", () => {
    const first = build();
    const updated = structuredClone(lock);
    updated.dictionaryRelease = "next-dictionary";
    for (const file of updated.files.filter((file) => ["jmdict", "kanjidic"].includes(file.role))) file.url = file.url.replace(encodeURIComponent(lock.dictionaryRelease), encodeURIComponent(updated.dictionaryRelease));
    const second = buildJapaneseFlashcardCatalog(corpus(), updated);
    expect(second.cards.map((card) => card.id)).toEqual(first.cards.map((card) => card.id));
    expect(summarizeJapaneseFlashcards(second).catalogSha256).not.toBe(summarizeJapaneseFlashcards(first).catalogSha256);
  });

  it("compiles a recorded correction with its original content and ledger fingerprint", () => {
    const input = corpus();
    input.vocabulary[0].word = "誤表記";
    const ledger = { schemaVersion: 1, sourceLockSha256: sourceLockDigest(lock), records: [{
      id: "word-0", beforeSha256: vocabularyRecordDigest(input.vocabulary[0]), status: "corrected",
      reason: "Replace the incorrect spelling with the pinned dictionary pair.", patch: { word: "表記0" },
      evidence: { dictionaryIds: ["1000000"], derivations: [] },
    }] };
    const catalog = buildJapaneseFlashcardCatalog(input, lock, ledger);
    expect(catalog.cards.find((card) => card.id === "ja-vocabulary:word-0")).toMatchObject({
      content: { word: "表記0" }, originalContent: { word: "誤表記" }, dictionaryEvidence: { verified: true, support: "direct" },
    });
    expect(catalog.corrections).toMatchObject({ records: ledger.records, sha256: expect.stringMatching(/^[a-f0-9]{64}$/) });
    expect(summarizeJapaneseFlashcards(catalog).corrections).toMatchObject({ corrected: 1, deferred: 0 });
    expect(summarizeJapaneseFlashcards(catalog).dictionarySupportedVocabulary).toBe(5);
  });

  it("labels derived support separately from a direct dictionary headword", () => {
    const input = corpus();
    input.vocabulary[0] = { ...input.vocabulary[0], word: "挨拶する", reading: "あいさつする" };
    input.dictionaryWords[0] = { id: "1000000", kanji: [{ text: "挨拶" }], kana: [{ text: "あいさつ", appliesToKanji: ["*"] }],
      sense: [{ partOfSpeech: ["n", "vs"], appliesToKanji: ["*"], appliesToKana: ["*"], gloss: [{ lang: "eng", text: "greeting" }] }] };
    input.vocabularyEvidence = { "word-0": { dictionaryIds: ["1000000"], derivations: [{ kind: "suru", entryId: "1000000", sense: 1, baseWritten: "挨拶", baseReading: "あいさつ" }] } };
    const catalog = build(input);
    expect(catalog.cards.find((card) => card.id === "ja-vocabulary:word-0")).toMatchObject({ dictionaryEvidence: { verified: true, support: "derived", acceptedPairs: [{ written: "挨拶する", reading: "あいさつする", evidence: [{ entryId: "1000000", kind: "suru", sense: 1 }] }] } });
    expect(summarizeJapaneseFlashcards(catalog).directDictionaryVocabulary).toBe(4);
    expect(summarizeJapaneseFlashcards(catalog).derivedVocabulary).toBe(1);
  });

  it("counts full-expression attestations without labelling them dictionary headwords", () => {
    const input = corpus();
    input.vocabulary[0] = { ...input.vocabulary[0], word: "お元気で", reading: "おげんきで", meanings: ["take care"] };
    delete input.vocabulary[0].jmdict_id;
    input.phraseEvidence = { "word-0": { sourceId: "teaching", locator: "page 31", quotedForm: "お元気で", attestedWritten: "お元気で", reading: "おげんきで", meanings: ["take care"], normalization: "none" } };
    const catalog = build(input);
    expect(catalog.cards.find((card) => card.id === "ja-vocabulary:word-0")).toMatchObject({ phraseEvidence: { sourceId: "teaching" }, dictionaryEvidence: { verified: false, entryId: null } });
    expect(summarizeJapaneseFlashcards(catalog)).toMatchObject({ supportedVocabulary: 5, attestedPhraseVocabulary: 1, unsupportedVocabularyIds: [], dictionaryUnverifiedVocabularyIds: ["ja-vocabulary:word-0"] });
  });
});
