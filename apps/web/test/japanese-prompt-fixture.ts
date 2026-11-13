import { japaneseStudyFixture } from "./japanese-study-fixture";
import { prepareJapaneseStudyImport } from "@/lib/study/japanese-import";

export function japanesePromptFixture() {
  const fixture = japaneseStudyFixture();
  const catalog = fixture.build();
  const cards = prepareJapaneseStudyImport(fixture.source, catalog).cards.sort((a, b) => a.kind === b.kind ? 0 : a.kind === "JAPANESE_VOCABULARY" ? -1 : 1).map(card => card.contentJson);
  return { cards, references: fixture.source.reconciliation };
}

import { createJapanesePromptBank, parseJapaneseStudyContent } from "@/lib/study/japanese-prompts";
export function japanesePracticeFixture() {
  const { cards, references } = japanesePromptFixture();
  const word = parseJapaneseStudyContent(cards[0]);
  const kanji = parseJapaneseStudyContent(cards[1]);
  const extras = [
    ["猫", "ねこ", "cat", "1"], ["犬", "いぬ", "dog", "2"], ["鳥", "とり", "bird", "3"], ["魚", "さかな", "fish", "4"],
  ].map(([written, reading, meaning, id]) => {
    const content = structuredClone(word);
    content.unit.id = `extra-${id}`; content.unit.recordIds = [content.unit.id];
    content.records = [structuredClone(content.records[0])];
    const record = content.records[0];
    if (record.kind !== "vocabulary") throw new Error("Fixture kind");
    record.id = content.unit.id; Object.assign(record.content, { id, word: written, reading, meanings: [meaning], level: "N5" });
    record.sourceFileId = "fixture";
    record.dictionaryEvidence.entryIds = [`entry-${id}`];
    record.dictionaryEvidence.acceptedPairs = [{ written, reading, evidence: [{ kind: "direct", entryId: `entry-${id}` }] }];
    content.unit.level = { code: "N5", evidence: [{ source: "record", recordId: record.id, sourceFileId: "fixture", code: "N5", used: true, scope: "record" }] };
    return content;
  });
  const characters = [
    ["食", "ショク", "た.べる", "eat"], ["飲", "イン", "の.む", "drink"], ["見", "ケン", "み.る", "see"], ["読", "ドク", "よ.む", "read"],
  ].map(([character, on, kun, meaning]) => {
    const content = structuredClone(kanji);
    content.unit.id = `character-${character}`; content.unit.recordIds = [content.unit.id]; content.records[0].id = content.unit.id;
    if (content.records[0].kind !== "kanji") throw new Error("Fixture kind");
    Object.assign(content.records[0].content, { character, onyomi: [on], kunyomi: [kun], nanori: ["なまえ"], meanings: [meaning] });
    content.unit.level.evidence.forEach(row => { row.recordId = content.unit.id; });
    return content;
  });
  const all = [word, kanji, ...extras, ...characters];
  return { all, word, kanji, extras, characters, references, build: () => createJapanesePromptBank(all, references) };
}

