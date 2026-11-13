import { createHash, timingSafeEqual } from "node:crypto";
import { z } from "zod";
import { japaneseVocabularyPairKey, toHiragana, type DictionaryWord } from "./dictionary";
import { vocabularyPairEvidence, type VocabularyEvidence } from "./vocabulary-evidence";
import { type PhraseAttestation } from "./phrase-evidence";
export { dictionaryAllowsPair, dictionaryWordSchema, japaneseVocabularyPairKey, toHiragana } from "./dictionary";

export const JLPT_LEVELS = ["N5", "N4", "N3", "N2", "N1"] as const;
const levelSchema = z.enum(JLPT_LEVELS);
export type JapaneseLevel = z.infer<typeof levelSchema>;

const text = z.string().trim().min(1);
const strings = z.array(text);
export const vocabularySchema = z.object({
  id: text, word: text, reading: text, meanings: strings.min(1), level: levelSchema,
  romaji: text.optional(), pos: strings.optional(),
  jmdict_id: z.number().int().positive().optional(),
  other_forms: strings.default([]), other_readings: strings.default([]),
  examples: z.array(z.object({ ja: text, en: text, tatoeba_id: z.number().int().positive().optional(), furigana: text.optional() })).default([]),
});
export const kanjiSchema = z.object({
  character: text.refine((value) => Array.from(value).length === 1, "Expected one character"),
  level: levelSchema, onyomi: strings, kunyomi: strings, meanings: strings.min(1),
  supplementary: z.boolean().optional(), nanori: strings.default([]),
  strokes: z.number().int().positive().optional(), grade: z.number().int().positive().optional(),
  freq: z.number().int().positive().nullable().optional(), radical: text.optional(),
  radical_number: z.number().int().positive().optional(), words: strings.optional(),
});

export type Vocabulary = z.infer<typeof vocabularySchema>;
export type Kanji = z.infer<typeof kanjiSchema>;
type DictionaryKanji = {
  literal: string;
  readingMeaning: {
    groups: Array<{ readings: Array<{ type: string; value: string }>; meanings: Array<{ lang: string; value: string }> }>;
    nanori: string[];
  } | null;
};
export type ReferenceVocabulary = {
  sourceRow: string; level: JapaneseLevel; jmdict_seq: string;
  kana: string; kanji: string; waller_definition: string;
};

export type JapaneseCorpusInput = {
  vocabulary: Array<Record<string, unknown>>;
  kanji: Array<Record<string, unknown>>;
  dictionaryWords: DictionaryWord[];
  dictionaryKanji: DictionaryKanji[];
  referenceVocabulary: ReferenceVocabulary[];
  vocabularyEvidence?: Record<string, VocabularyEvidence>;
  phraseEvidence?: Record<string, PhraseAttestation>;
};

export type SourceIntegrity = { algorithm: "git-sha1" | "sha256"; digest: string };

/** A Git blob SHA hashes the byte-length header too, unlike a plain file SHA-1. */
export function verifySourceIntegrity(bytes: Buffer, integrity: SourceIntegrity): void {
  const hash = createHash(integrity.algorithm === "git-sha1" ? "sha1" : "sha256");
  if (integrity.algorithm === "git-sha1") hash.update(`blob ${bytes.length}\0`);
  const actual = hash.update(bytes).digest();
  const expected = Buffer.from(integrity.digest, "hex");
  if (actual.length !== expected.length || !timingSafeEqual(actual, expected)) {
    throw new Error(`Source integrity mismatch: expected ${integrity.algorithm}:${integrity.digest}`);
  }
}

/** Parse the upstream CSV, including quoted newlines; malformed rows are never skipped. */
export function parseReferenceCsv(csv: string, level: JapaneseLevel): ReferenceVocabulary[] {
  const rows: string[][] = [];
  let row: string[] = [], cell = "", quoted = false, closedQuote = false;
  const input = csv.replace(/^\uFEFF/, "");
  for (let i = 0; i < input.length; i++) {
    const c = input[i];
    if (c === '"') {
      if (quoted && input[i + 1] === '"') { cell += '"'; i++; }
      else if (quoted) { quoted = false; closedQuote = true; }
      else if (!cell && !closedQuote) quoted = true;
      else throw new Error("Invalid CSV quote");
    } else if (!quoted && (c === "," || c === "\n" || c === "\r")) {
      row.push(cell); cell = ""; closedQuote = false;
      if (c !== ",") {
        if (c === "\r" && input[i + 1] === "\n") i++;
        rows.push(row); row = [];
      }
    } else {
      if (closedQuote) throw new Error("Unexpected text after CSV quote");
      cell += c;
    }
  }
  if (quoted) throw new Error("Unterminated CSV quote");
  if (cell || row.length || closedQuote) { row.push(cell); rows.push(row); }
  const expected = ["jmdict_seq", "kana", "kanji", "waller_definition"];
  if (JSON.stringify(rows.shift()) !== JSON.stringify(expected)) throw new Error("Unexpected reference CSV headers");
  return rows.map((values, index) => {
    if (values.length !== expected.length || (values[0] && !/^\d+$/.test(values[0])) || !values[1].trim()) {
      throw new Error(`Invalid reference CSV row ${index + 2}`);
    }
    return { sourceRow: `${level}:${index + 2}`, level, jmdict_seq: values[0], kana: values[1], kanji: values[2], waller_definition: values[3] };
  });
}

export type CorpusIssue = { id: string; code: string; message: string };
type Reconciliation = ReferenceVocabulary & {
  status: "matched" | "ambiguous" | "unmatched";
  method: "form-and-reading" | "dictionary-id-and-reading" | "none";
  candidateIds: string[];
  allCandidateIds?: string[];
  selection?: "primary-form-and-reading";
};
export type JapaneseCorpusReport = {
  counts: {
    vocabulary: number; kanji: number; referenceRows: number; matched: number;
    ambiguous: number; unmatched: number; supplementaryKanji: number;
    vocabularyByLevel: Record<JapaneseLevel, number>; kanjiByLevel: Record<JapaneseLevel, number>;
  };
  issues: CorpusIssue[];
  reconciliation: Reconciliation[];
  dictionaryVerifiedVocabularyIds: string[];
  dictionaryVerifiedKanji: string[];
  teacherReview: "pending";
  publicationReady: false;
};

const compare = (a: string, b: string) => a < b ? -1 : a > b ? 1 : 0;
const unique = (values: string[]) => [...new Set(values)].sort(compare);
const forms = (word: Vocabulary) => [word.word, ...word.other_forms];
const readings = (word: Vocabulary) => [word.reading, ...word.other_readings];

function indexBy<T>(rows: T[], keys: (row: T) => string[]): Map<string, T[]> {
  const index = new Map<string, T[]>();
  for (const row of rows) for (const key of new Set(keys(row))) {
    const found = index.get(key);
    if (found) found.push(row); else index.set(key, [row]);
  }
  return index;
}

export function auditJapaneseCorpus(input: JapaneseCorpusInput, options: { preferPrimaryForms?: boolean } = {}): JapaneseCorpusReport {
  const vocabulary = input.vocabulary.map((row) => vocabularySchema.parse(row));
  const kanji = input.kanji.map((row) => kanjiSchema.parse(row));
  const issues: CorpusIssue[] = [];
  const issue = (id: string, code: string, message: string) => { issues.push({ id, code, message }); };
  const vocabularyByLevel = Object.fromEntries(JLPT_LEVELS.map((level) => [level, 0])) as Record<JapaneseLevel, number>;
  const kanjiByLevel = { ...vocabularyByLevel };
  for (const word of vocabulary) vocabularyByLevel[word.level]++;
  for (const entry of kanji) kanjiByLevel[entry.level]++;
  for (const level of JLPT_LEVELS) {
    if (!vocabularyByLevel[level]) issue(level, "MISSING_VOCABULARY_LEVEL", "No vocabulary at this level");
    if (!kanjiByLevel[level]) issue(level, "MISSING_KANJI_LEVEL", "No kanji at this level");
  }
  for (const [code, index] of [
    ["DUPLICATE_VOCABULARY_ID", indexBy(vocabulary, (w) => [w.id])],
    ["DUPLICATE_VOCABULARY_PAIR", indexBy(vocabulary, (w) => [japaneseVocabularyPairKey(w.word, w.reading)])],
    ["DUPLICATE_KANJI", indexBy(kanji, (k) => [k.character])],
  ] as const) {
    for (const [key, rows] of index) if (rows.length > 1) issue(key, code, `${rows.length} records share this identity`);
  }

  const dictionaryWords = new Map(input.dictionaryWords.map((row) => [row.id, row]));
  const dictionaryKanji = new Map(input.dictionaryKanji.map((row) => [row.literal, row]));
  const dictionaryVerifiedVocabularyIds: string[] = [], dictionaryVerifiedKanji: string[] = [];
  for (const word of vocabulary) {
    if (!word.examples.length) issue(word.id, "MISSING_EXAMPLES", "No source example sentence; do not generate a replacement silently");
    const dictionary = word.jmdict_id ? dictionaryWords.get(String(word.jmdict_id)) : undefined;
    const evidence = input.vocabularyEvidence?.[word.id] ?? { dictionaryIds: word.jmdict_id ? [String(word.jmdict_id)] : [], derivations: [] };
    const allowsPair = (written: string, reading: string) => vocabularyPairEvidence(written, reading, dictionaryWords, evidence).length > 0;
    if (!word.jmdict_id) issue(word.id, "MISSING_DICTIONARY_LINK", `${word.word} has no JMdict ID`);
    else if (!dictionary) issue(word.id, "MISSING_DICTIONARY_ENTRY", `${word.word}: JMdict ${word.jmdict_id} absent from pinned dictionary`);
    else if (!allowsPair(word.word, word.reading)) {
      issue(word.id, "INVALID_DICTIONARY_PAIR", `${word.word} / ${word.reading} is not an allowed pair in JMdict ${word.jmdict_id}`);
    } else {
      const invalidForms = word.other_forms.filter((form) => !readings(word).some((reading) => allowsPair(form, reading)));
      const invalidReadings = word.other_readings.filter((reading) => !forms(word).some((form) => allowsPair(form, reading)));
      if (invalidForms.length || invalidReadings.length) {
        issue(word.id, "INVALID_DICTIONARY_VARIANT", JSON.stringify({ forms: invalidForms, readings: invalidReadings }));
      } else dictionaryVerifiedVocabularyIds.push(word.id);
    }
  }
  for (const entry of kanji) {
    const dictionary = dictionaryKanji.get(entry.character);
    if (!dictionary) { issue(entry.character, "MISSING_KANJIDIC_ENTRY", "Character absent from pinned KANJIDIC2"); continue; }
    const dictionaryReadings = dictionary.readingMeaning?.groups.flatMap((group) => group.readings) ?? [];
    const expectedOn = unique(dictionaryReadings.filter((r) => r.type === "ja_on").map((r) => r.value));
    const expectedKun = unique(dictionaryReadings.filter((r) => r.type === "ja_kun").map((r) => r.value));
    if (!entry.onyomi.length && !entry.kunyomi.length) {
      issue(entry.character, "MISSING_JAPANESE_READINGS", "Neither on nor kun readings are present");
    } else if (JSON.stringify(unique(entry.onyomi)) !== JSON.stringify(expectedOn) || JSON.stringify(unique(entry.kunyomi)) !== JSON.stringify(expectedKun)) {
      issue(entry.character, "KANJI_READING_DIFFERENCE", JSON.stringify({ source: { on: entry.onyomi, kun: entry.kunyomi }, dictionary: { on: expectedOn, kun: expectedKun } }));
    } else dictionaryVerifiedKanji.push(entry.character);
  }

  const byIdReading = indexBy(vocabulary, (word) => {
    const ids = input.vocabularyEvidence?.[word.id]?.dictionaryIds ?? (word.jmdict_id ? [String(word.jmdict_id)] : []);
    return ids.flatMap((id) => readings(word).filter((reading) => String(word.jmdict_id) === id || forms(word).some((written) =>
      vocabularyPairEvidence(written, reading, dictionaryWords, { dictionaryIds: [id], derivations: [] }).length > 0,
    )).map((reading) => `${id}\0${toHiragana(reading)}`));
  });
  const byFormReading = indexBy(vocabulary, (word) => forms(word).flatMap((f) => readings(word).map((r) => japaneseVocabularyPairKey(f, r))));
  const reconciliation = input.referenceVocabulary.map((reference): Reconciliation => {
    if (!reference.jmdict_seq) issue(reference.sourceRow, "MISSING_REFERENCE_DICTIONARY_LINK", "Reference row has no JMdict ID; preserve it for review");
    if (!reference.waller_definition.trim()) issue(reference.sourceRow, "MISSING_REFERENCE_GLOSS", "Reference row has no English gloss; preserve it for review");
    const written = reference.kanji || reference.kana;
    const supportsReference = (word: Vocabulary) => {
      const evidence = input.vocabularyEvidence?.[word.id];
      return !evidence || vocabularyPairEvidence(written, reference.kana, dictionaryWords, evidence).length > 0;
    };
    const idMatches = (byIdReading.get(`${reference.jmdict_seq}\0${toHiragana(reference.kana)}`) ?? []).filter(supportsReference);
    const formMatches = (byFormReading.get(japaneseVocabularyPairKey(written, reference.kana)) ?? []).filter(supportsReference);
    const hasReferenceId = (word: Vocabulary) => {
      const evidence = input.vocabularyEvidence?.[word.id];
      return evidence ? evidence.dictionaryIds.includes(reference.jmdict_seq) && vocabularyPairEvidence(written, reference.kana, dictionaryWords, {
        dictionaryIds: [reference.jmdict_seq], derivations: evidence.derivations,
      }).length > 0 : String(word.jmdict_id) === reference.jmdict_seq;
    };
    const exact = formMatches.filter(hasReferenceId);
    const allCandidates = exact.length ? exact : idMatches.length ? idMatches : formMatches;
    const primary = options.preferPrimaryForms ? allCandidates.filter((word) => japaneseVocabularyPairKey(word.word, word.reading) === japaneseVocabularyPairKey(written, reference.kana)) : [];
    const preferred = primary.length === 1 && allCandidates.length > 1;
    const candidates = preferred ? primary : allCandidates;
    const candidateIds = unique(candidates.map((w) => w.id));
    const status = candidateIds.length === 1 ? "matched" : candidateIds.length ? "ambiguous" : "unmatched";
    const method = exact.length || (!idMatches.length && formMatches.length) ? "form-and-reading" : idMatches.length ? "dictionary-id-and-reading" : "none";
    if (status === "matched") {
      const match = candidates[0];
      if (match.level !== reference.level) issue(reference.sourceRow, "LEVEL_DISAGREEMENT", `${written}: reference ${reference.level}; candidate ${match.level} (${match.id}). Review earliest-level merges and reclassifications.`);
      if (reference.jmdict_seq && !hasReferenceId(match)) issue(reference.sourceRow, "REFERENCE_DICTIONARY_ID_DIFFERENCE", `${written}: reference ${reference.jmdict_seq}; candidate ${match.jmdict_id ?? "unlinked"}`);
    }
    return { ...reference, status, method, candidateIds, ...(preferred ? { allCandidateIds: unique(allCandidates.map((word) => word.id)), selection: "primary-form-and-reading" as const } : {}) };
  }).sort((a, b) => compare(a.sourceRow, b.sourceRow));

  return {
    counts: {
      vocabulary: vocabulary.length, kanji: kanji.length, referenceRows: reconciliation.length,
      matched: reconciliation.filter((row) => row.status === "matched").length,
      ambiguous: reconciliation.filter((row) => row.status === "ambiguous").length,
      unmatched: reconciliation.filter((row) => row.status === "unmatched").length,
      supplementaryKanji: kanji.filter((row) => row.supplementary).length,
      vocabularyByLevel, kanjiByLevel,
    },
    issues: issues.sort((a, b) => compare(a.code, b.code) || compare(a.id, b.id) || compare(a.message, b.message)),
    reconciliation,
    dictionaryVerifiedVocabularyIds: unique(dictionaryVerifiedVocabularyIds),
    dictionaryVerifiedKanji: unique(dictionaryVerifiedKanji),
    teacherReview: "pending", publicationReady: false,
  };
}

export type JapaneseSample = {
  kind: "vocabulary" | "kanji"; id: string; level: JapaneseLevel;
  sourceVerification: "dictionary-form-and-reading"; teacherReview: "pending";
  content: Vocabulary | Kanji;
};

export function buildJapaneseSamples(input: JapaneseCorpusInput, report: JapaneseCorpusReport): JapaneseSample[] {
  const words = input.vocabulary.map((row) => vocabularySchema.parse(row)).sort((a, b) => compare(a.id, b.id));
  const kanji = input.kanji.map((row) => kanjiSchema.parse(row)).sort((a, b) => compare(a.character, b.character));
  const verifiedWords = new Set(report.dictionaryVerifiedVocabularyIds);
  const verifiedKanji = new Set(report.dictionaryVerifiedKanji);
  const samples: JapaneseSample[] = [];
  for (const level of JLPT_LEVELS) {
    const word = words.find((w) => w.level === level && verifiedWords.has(w.id) && w.examples.length);
    const character = kanji.find((k) => k.level === level && verifiedKanji.has(k.character) && !k.supplementary);
    for (const sample of [
      word ? { kind: "vocabulary" as const, id: word.id, content: word } : null,
      character ? { kind: "kanji" as const, id: character.character, content: character } : null,
    ]) if (sample) samples.push({ ...sample, level, sourceVerification: "dictionary-form-and-reading", teacherReview: "pending" });
  }
  return samples;
}
