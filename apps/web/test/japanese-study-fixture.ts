import sourceLock from "../data/japanese-content/source-lock.json";
import { type JapaneseFlashcardCatalog, serializeJapaneseFlashcards } from "@/lib/japanese-content/flashcard-catalog";
import { JLPT_LEVELS } from "@/lib/japanese-content/corpus-audit";
import { type DictionaryWord } from "@/lib/japanese-content/dictionary";
import { parseSourceLock, sourceLockDigest } from "@/lib/japanese-content/source-files";
import { sha256 } from "@/lib/japanese-content/digest";
import { buildJapaneseStudyCatalog } from "@/lib/japanese-content/study-catalog";

export function japaneseStudyFixture() {
  const lock = parseSourceLock(sourceLock);
  const cards: JapaneseFlashcardCatalog["cards"] = ["中身", "中味"].map((word, i) => ({
    id: `word-${i}`, kind: "vocabulary", sourceFileId: `source-${i}`, referenceRows: [],
    content: { id: String(i), word, reading: "なかみ", level: i ? "N2" : "N3", meanings: ["contents"], other_forms: [], other_readings: [], examples: [], jmdict_id: 1 },
    dictionaryEvidence: { sourceFileId: "jmdict", entryId: "1", entryIds: ["1"], support: "direct", verified: true,
      acceptedPairs: [{ written: word, reading: "なかみ", evidence: [{ kind: "direct", entryId: "1" }] }],
    },
  }));
  cards.push({ id: "kanji", kind: "kanji", sourceFileId: "characters", referenceRows: [], content: { character: "中", level: "N5", meanings: ["middle"], onyomi: ["チュウ"], kunyomi: ["なか"], nanori: [] }, dictionaryEvidence: { sourceFileId: "kanjidic", entryId: "中", verified: true } });
  const source: JapaneseFlashcardCatalog = {
    schemaVersion: 4, status: "draft", learningLanguage: "JAPANESE", teacherReview: "pending", attribution: "data/japanese-content/ATTRIBUTION.md", sourceLock: lock,
    cards, reconciliation: [], issues: [], sourceCounts: { vocabulary: 2, kanji: 1, referenceRows: 0 },
    counts: { vocabulary: 2, kanji: 1, referenceRows: 0, matched: 0, ambiguous: 0, unmatched: 0, supplementaryKanji: 0,
      vocabularyByLevel: Object.fromEntries(JLPT_LEVELS.map(level=>[level,0])) as Record<typeof JLPT_LEVELS[number],number>,
      kanjiByLevel: Object.fromEntries(JLPT_LEVELS.map(level=>[level,0])) as Record<typeof JLPT_LEVELS[number],number>,
    },
  };
  const dictionary: DictionaryWord[] = [{ id: "1", kanji: [{ text: "中身" }, { text: "中味" }], kana: [{ text: "なかみ", appliesToKanji: ["*"] }], sense: [{ partOfSpeech: ["n"], appliesToKanji: ["*"], appliesToKana: ["*"], gloss: [{ lang: "eng", text: "contents" }] }] }];
  const policy = { schemaVersion: 1, id: "japanese-study-groups-v1", levelPolicy: "earliest-matching-community-evidence-v1", sourceCatalogSha256: sha256(serializeJapaneseFlashcards(source)), sourceLockSha256: sourceLockDigest(lock),
    overlaps: [{ entryId: "1", memberIds: ["word-0", "word-1"], reason: "Orthographic variants share the contents sense and pronunciation.", groups: [{ anchorId: "word-0", memberIds: ["word-0", "word-1"], senses: [1] }] }],
  };
  const bind = () => { policy.sourceCatalogSha256 = sha256(serializeJapaneseFlashcards(source)); };
  return { source, dictionary, policy, bind, build: () => buildJapaneseStudyCatalog(source, dictionary, policy) };
}
