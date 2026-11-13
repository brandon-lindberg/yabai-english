import { describe, expect, it } from "vitest";
import { japanesePromptFixture, japanesePracticeFixture as fixture } from "../../test/japanese-prompt-fixture";
import { createJapanesePromptBank, gradeJapaneseStudyPrompt, parseJapaneseStudyContent } from "@/lib/study/japanese-prompts";
import { japaneseStudyQuestionSchema } from "@/lib/study/japanese-public";


describe("member-bound Japanese study prompts", () => {
  it("projects bilingual, deterministic MCQs without keys or internal content", () => {
    const bank = fixture().build();
    const prompt = bank.create("word-0", { task: "vocabulary_reading", seed: "session-1" });
    expect(japaneseStudyQuestionSchema.parse(prompt.question)).toMatchObject({ unitId: "word-0", memberId: "word-0", task: "vocabulary_reading", stimulus: { written: "中身", meanings: ["contents"] } });
    expect(prompt.question.choices).toHaveLength(4);
    expect(prompt.question).toEqual(bank.create("word-0", { task: "vocabulary_reading", seed: "session-1" }).question);
    expect(JSON.stringify(prompt.question)).not.toMatch(/correctChoice|acceptedPairs|dictionaryEvidence|originalContent|sharedSenses/);
    const correct = gradeJapaneseStudyPrompt(prompt, { promptId: prompt.question.id, choiceId: prompt.correctChoiceId });
    expect(correct).toMatchObject({ status: "graded", correct: true, feedback: { written: "中身", reading: "なかみ", meanings: ["contents"] } });
    const wrong = prompt.question.choices.find(choice => choice.id !== prompt.correctChoiceId)!;
    expect(gradeJapaneseStudyPrompt(prompt, { promptId: prompt.question.id, choiceId: wrong.id })).toMatchObject({ status: "graded", correct: false });
  });

  it("never unions merged members' forms/readings or accepts an unoffered response", () => {
    const { word, build } = fixture();
    const member = word.records[1];
    if (member.kind !== "vocabulary") throw new Error("Fixture kind");
    member.content.meanings = ["separate member context"]; member.content.level = "N3";
    word.unit.level.evidence.filter(row => row.recordId === member.id && row.source === "record").forEach(row => { row.code = "N3"; });
    const prompt = build().create("word-0", { task: "vocabulary_reading", memberId: "word-1", seed: "test" });
    expect(prompt.question.stimulus.written).toBe("中味");
    expect(prompt.question.stimulus.meanings).toEqual(["separate member context"]);
    expect(gradeJapaneseStudyPrompt(prompt, { promptId: prompt.question.id, choiceId: "なかみ" })).toEqual({ status: "invalid", reason: "invalid_response" });
    expect(gradeJapaneseStudyPrompt(prompt, { promptId: "different-prompt", choiceId: prompt.correctChoiceId })).toEqual({ status: "invalid", reason: "stale_prompt" });
    expect(gradeJapaneseStudyPrompt(prompt, { promptId: prompt.question.id, choiceId: prompt.correctChoiceId, correct: true })).toMatchObject({ status: "invalid" });
  });

  it("keeps prompt identities stable through JSONB key ordering and database result order", () => {
    const { all, references, build } = fixture();
    const reorder = (value: unknown): unknown => Array.isArray(value) ? value.map(reorder)
      : value && typeof value === "object" ? Object.fromEntries(Object.entries(value).reverse().map(([key, child]) => [key, reorder(child)])) : value;
    const options = { task: "vocabulary_meaning" as const, seed: "same-catalog" };
    const expected = build().create("word-0", options);
    const actual = createJapanesePromptBank(all.toReversed().map(reorder), references).create("word-0", options);
    expect(actual).toEqual(expected);
  });

  it("defers later member spellings at introduction, then supports them at their evidenced study band", () => {
    const bank = fixture().build();
    expect(() => bank.create("word-0", { memberId: "word-1", task: "vocabulary_reading", seed: "later" })).toThrow(/member|form/i);
    expect(bank.create("word-0", { memberId: "word-1", studyBand: "N2", task: "vocabulary_reading", seed: "later" }).question)
      .toMatchObject({ memberId: "word-1", stimulus: { written: "中味" }, level: { introduction: "N3", source: "N2", form: "N2" } });
  });

  it("binds readings to the exact written pair and primary member reading", () => {
    const { word, build } = fixture();
    const record = word.records[0];
    if (record.kind !== "vocabulary") throw new Error("Fixture kind");
    record.dictionaryEvidence.acceptedPairs = [{ written: "違う", reading: "なかみ", evidence: [{ kind: "direct", entryId: "1" }] }];
    expect(build).toThrow(/pair|support/i);
  });

  it("excludes dictionary siblings and every accepted meaning from meaning distractors", () => {
    const { extras, build } = fixture();
    if (extras[0].records[0].kind !== "vocabulary" || extras[1].records[0].kind !== "vocabulary") throw new Error("Fixture kind");
    extras[0].records[0].content.meanings = ["cat", "dog"];
    const prompt = build().create("extra-1", { task: "vocabulary_meaning", seed: "same" });
    expect(prompt.question.choices.filter(choice => choice.id !== prompt.correctChoiceId).map(choice => choice.text)).not.toContain("dog");
    expect(prompt.question.choices.filter(choice => choice.id !== prompt.correctChoiceId).map(choice => choice.text)).not.toContain("cat");
    expect(prompt.question.stimulus).toMatchObject({ written: "猫", reading: "ねこ" });
    expect(prompt.question.stimulus.meanings).toBeUndefined();
  });

  it("keeps distractors inside the introduced study bands and requires reading context for meaning tasks", () => {
    const bank = fixture().build();
    for (let n = 0; n < 10; n++) {
      const prompt = bank.create("extra-1", { task: "vocabulary_meaning", seed: String(n) });
      expect(prompt.question.choices.map(choice => choice.text)).not.toContain("contents");
      expect(japaneseStudyQuestionSchema.safeParse({ ...prompt.question, stimulus: { written: "猫" } }).success).toBe(false);
    }
  });

  it("keeps on/kun readings and notation distinct and name readings outside the answer set", () => {
    const bank = fixture().build();
    const on = bank.create("character-食", { task: "kanji_on", seed: "on" });
    const kun = bank.create("character-食", { task: "kanji_kun", seed: "kun" });
    expect(on.question.choices.map(choice => choice.text)).toContain("ショク");
    expect(on.question.choices.map(choice => choice.text)).not.toContain("た.べる");
    expect(kun.question.choices.map(choice => choice.text)).toContain("た.べる");
    expect(kun.question.choices.map(choice => choice.text)).not.toContain("なまえ");
    expect(gradeJapaneseStudyPrompt(kun, { promptId: kun.question.id, choiceId: kun.correctChoiceId })).toMatchObject({ feedback: { onyomi: ["ショク"], kunyomi: ["た.べる"], nanori: ["なまえ"] } });
  });

  it("does not offer notation/script variants of a valid reading as wrong alternatives", () => {
    const { characters, build } = fixture();
    const alias = characters[1].records[0];
    if (alias.kind !== "kanji") throw new Error("Fixture kind");
    alias.content.kunyomi = ["タベル", "の.む"];
    const bank = build();
    for (let n = 0; n < 20; n++) {
      const prompt = bank.create("character-食", { task: "kanji_kun", seed: String(n) });
      expect(prompt.question.choices.filter(choice => choice.id !== prompt.correctChoiceId).map(choice => choice.text)).not.toContain("タベル");
    }
  });

  it("omits missing reading categories and refuses sparse distractor pools without fallback inventions", () => {
    const { kanji, build } = fixture();
    if (kanji.records[0].kind !== "kanji") throw new Error("Fixture kind");
    kanji.records[0].content.kunyomi = [];
    expect(build().tasks("kanji")).toEqual(["kanji_on"]);
    expect(() => build().create("kanji", { task: "kanji_kun", seed: "s" })).toThrow(/task/i);
    const { cards, references } = japanesePromptFixture();
    expect(() => createJapanesePromptBank(cards, references).create("word-0", { task: "vocabulary_meaning", seed: "s" })).toThrow(/distractor/i);
  });

  it("uses an earlier kana-only reference without exposing the later kanji spelling", () => {
    const { extras, references, build } = fixture();
    const soap = extras[0];
    const record = soap.records[0];
    if (record.kind !== "vocabulary") throw new Error("Fixture kind");
    record.content.word = "石鹸"; record.content.reading = "せっけん"; record.content.level = "N2";
    record.dictionaryEvidence.acceptedPairs = [{ written: "石鹸", reading: "せっけん", evidence: [{ kind: "direct", entryId: "1" }] }];
    soap.unit.level.evidence = [
      { source: "record", recordId: record.id, sourceFileId: record.sourceFileId, code: "N2", used: true, scope: "record" },
      { source: "reference", recordId: record.id, sourceFileId: "reference", sourceRow: "N5:2", code: "N5", used: true, scope: "kana-reference" },
    ];
    references.push({ sourceRow: "N5:2", sourceFileId: "reference", kanji: "", kana: "せっけん", level: "N5", status: "matched", method: "dictionary-id-and-reading", jmdict_seq: "1", waller_definition: "soap", candidateIds: ["1"], candidateCardIds: [record.id] });
    const bank = build();
    expect(bank.tasks(soap.unit.id)).toEqual(["vocabulary_meaning"]);
    expect(bank.create(soap.unit.id, { task: "vocabulary_meaning", seed: "s" }).question.stimulus.written).toBe("せっけん");
    references[0].kana = "べつ";
    expect(build).toThrow(/reference|form/i);
  });

  it("rejects malformed, stale and duplicate canonical members", () => {
    const { word } = fixture();
    expect(() => parseJapaneseStudyContent({ ...word, schemaVersion: 2 })).toThrow();
    expect(() => parseJapaneseStudyContent({ ...word, records: [word.records[0], word.records[0]] })).toThrow();
    expect(() => parseJapaneseStudyContent({ ...word, unit: { ...word.unit, kind: "kanji" } })).toThrow();
    word.unit.level.evidence[0].code = "N1";
    expect(() => parseJapaneseStudyContent(word)).toThrow(/level|evidence/i);
  });
});
