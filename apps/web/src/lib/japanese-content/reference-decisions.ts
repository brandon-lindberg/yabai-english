import { z } from "zod";
import { requireUnique, sameStringMembers } from "../unique";
import { auditJapaneseCorpus, japaneseVocabularyPairKey, kanjiSchema, vocabularySchema, type JapaneseCorpusInput } from "./corpus-audit";
import { dictionaryAllowsPair, dictionarySenseAllowsPair, toHiragana, type DictionaryWord } from "./dictionary";
import { sha256 } from "./digest";
import { referenceRecordDigest } from "./reference-coverage";
import { sourceLockDigest, type SourceLock } from "./source-files";

const text = z.string().trim().min(1);
const digest = z.string().regex(/^[a-f0-9]{64}$/);
const base = { sourceRow: text, beforeSha256: digest, reason: text };
const dictionaryDecision = z.object({ ...base, kind: z.literal("dictionary-supplement"), entryId: z.string().regex(/^[1-9][0-9]*$/),
  senses: z.array(z.number().int().positive()).min(1), glossStatus: z.enum(["aligned", "corrected", "missing"]),
}).strict();
const characterDecision = z.object({ ...base, kind: z.literal("character-reading"), readingType: z.enum(["ja_on", "ja_kun"]) }).strict();
const schema = z.object({ schemaVersion: z.literal(1), sourceLockSha256: digest,
  records: z.array(z.discriminatedUnion("kind", [dictionaryDecision, characterDecision])),
}).strict();
export type ReferenceDecisions = z.infer<typeof schema>;
export type ReferenceDecision = ReferenceDecisions["records"][number];
export const parseReferenceDecisions = (value: unknown) => schema.parse(value);
export const referenceVocabularyId = (written: string, reading: string) => `reference-${sha256(japaneseVocabularyPairKey(written, reading)).slice(0, 24)}`;
export type ReferenceSupplement = {
  sourceRow: string; entryId: string;
  written: DictionaryWord["kanji"][number] | null;
  reading: DictionaryWord["kana"][number];
  senses: Array<NonNullable<DictionaryWord["sense"]>[number] & { number: number }>;
};

/** Resolve the entire pre-supplement queue; retain original rows, meanings and levels as provenance. */
export function applyReferenceDecisions(input: JapaneseCorpusInput, lock: SourceLock, value: unknown) {
  const ledger = parseReferenceDecisions(value);
  if (ledger.sourceLockSha256 !== sourceLockDigest(lock)) throw new Error("Reference source lock drift");
  requireUnique(ledger.records.map((record) => record.sourceRow), "reference decision");
  const report = auditJapaneseCorpus(input, { preferPrimaryForms: true });
  const unmatched = report.reconciliation.filter((row) => row.status === "unmatched");
  if (!sameStringMembers(unmatched.map((row) => row.sourceRow), ledger.records.map((record) => record.sourceRow))) throw new Error("Unmatched reference coverage drift");
  const references = new Map(unmatched.map((row) => [row.sourceRow, row]));
  const dictionary = new Map(input.dictionaryWords.map((entry) => [entry.id, entry]));
  const characters = new Map(input.kanji.map((raw) => { const character = kanjiSchema.parse(raw); return [character.character, character]; }));
  const verifiedKanji = new Set(report.dictionaryVerifiedKanji);
  const dictionaryKanji = new Map(input.dictionaryKanji.map((entry) => [entry.literal, entry]));
  const vocabulary = [...input.vocabulary];
  const supplements: Record<string, ReferenceSupplement> = {};
  const characterReferences: Record<string, string> = {};
  for (const decision of [...ledger.records].sort((a, b) => a.sourceRow < b.sourceRow ? -1 : a.sourceRow > b.sourceRow ? 1 : 0)) {
    const row = references.get(decision.sourceRow)!;
    if (referenceRecordDigest(row) !== decision.beforeSha256) throw new Error(`Reference record drift: ${decision.sourceRow}`);
    const written = row.kanji || row.kana;
    if (decision.kind === "character-reading") {
      const character = characters.get(row.kanji);
      const readings = dictionaryKanji.get(row.kanji)?.readingMeaning?.groups.flatMap((group) => group.readings) ?? [];
      const entry = dictionary.get(row.jmdict_seq);
      const sourceReadings = decision.readingType === "ja_on" ? character?.onyomi : character?.kunyomi;
      if (!character || !verifiedKanji.has(row.kanji) ||
          !sourceReadings?.some((reading) => toHiragana(reading) === toHiragana(row.kana)) ||
          !readings.some((reading) => reading.type === decision.readingType && toHiragana(reading.value) === toHiragana(row.kana)) ||
          entry && dictionaryAllowsPair(entry, written, row.kana)) throw new Error(`Unsupported character reference: ${row.sourceRow}`);
      characterReferences[row.sourceRow] = character.character;
      continue;
    }
    requireUnique(decision.senses.map(String), "supplement dictionary sense");
    const entry = dictionary.get(decision.entryId);
    if (!entry || decision.senses.some((number) => !dictionarySenseAllowsPair(entry, number, written, row.kana))) throw new Error(`Unsupported dictionary supplement: ${row.sourceRow}`);
    if ((decision.glossStatus === "missing") !== !row.waller_definition.trim()) throw new Error(`Incorrect reference gloss status: ${row.sourceRow}`);
    const senses = decision.senses.map((number) => ({ ...entry.sense![number - 1], number }));
    const meanings = [...new Set(senses.flatMap((sense) => sense.gloss.filter((gloss) => gloss.lang === "eng").map((gloss) => gloss.text)))];
    const word = vocabularySchema.parse({ id: referenceVocabularyId(written, row.kana), word: written, reading: row.kana,
      level: row.level, jmdict_id: Number(entry.id), meanings, pos: [...new Set(senses.flatMap((sense) => sense.partOfSpeech))],
    });
    vocabulary.push(word);
    supplements[word.id] = { sourceRow: row.sourceRow, entryId: entry.id,
      written: entry.kanji.find((form) => form.text === written) ?? null,
      reading: (entry.kana.find((reading) => reading.text.normalize("NFC") === row.kana.normalize("NFC")) ??
        entry.kana.find((reading) => toHiragana(reading.text) === toHiragana(row.kana)))!, senses,
    };
  }
  requireUnique(vocabulary.map((word) => String(word.id)), "supplement vocabulary identity");
  requireUnique(vocabulary.map((raw) => { const word = vocabularySchema.parse(raw); return japaneseVocabularyPairKey(word.word, word.reading); }), "supplement vocabulary pair");
  return { input: { ...input, vocabulary }, ledger, supplements, characterReferences };
}
