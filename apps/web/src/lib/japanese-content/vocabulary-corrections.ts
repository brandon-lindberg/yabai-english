import { z } from "zod";
import { requireUnique } from "../unique";
import { auditJapaneseCorpus, vocabularySchema, type JapaneseCorpusInput, type Vocabulary } from "./corpus-audit";
import { sha256 } from "./digest";
import { sourceLockDigest, type SourceLock } from "./source-files";
import { vocabularyEvidenceSchema, vocabularyPairEvidence, type VocabularyEvidence } from "./vocabulary-evidence";
import { phraseAttestationSchema, phraseSourceSchema, verifyPhraseAttestation } from "./phrase-evidence";
import { referenceCoverageSchema, verifyReferenceCoverage } from "./reference-coverage";
import { dictionarySenseAllowsPair, normalizeDictionaryText as normalizedMeaning, type DictionaryWord } from "./dictionary";

const text = z.string().trim().min(1);
const digest = z.string().regex(/^[a-f0-9]{64}$/);
const base = { id: text, beforeSha256: digest, reason: text };
const patch = vocabularySchema.pick({ word: true, reading: true, romaji: true, pos: true, meanings: true, jmdict_id: true, other_forms: true, other_readings: true, examples: true }).partial().strict();
const sense = { entryId: text, sense: z.number().int().positive() };
const exampleIndex = { index: z.number().int().nonnegative(), reason: text };
const exampleSelectionSchema = z.object({ keep: z.array(z.object(exampleIndex).strict()), omit: z.array(z.object(exampleIndex).strict()) }).strict();
const attestedCorrectionSchema = z.object({ ...base, status: z.literal("attested"), patch, attestation: phraseAttestationSchema,
  exampleReview: exampleSelectionSchema.optional(),
}).strict();
const meaningReviewSchema = z.object({ ...base, action: z.enum(["retain", "correct"]),
  meanings: z.array(z.object({ ...sense, text, gloss: text, relation: z.enum(["exact", "equivalent", "construction"]), reason: text }).strict()).min(1),
  examples: z.object({ keep: z.array(z.object({ ...exampleIndex, ...sense }).strict()), omit: z.array(z.object(exampleIndex).strict()) }).strict().optional(),
}).strict();
const schema = z.object({
  schemaVersion: z.literal(1), sourceLockSha256: digest,
  phraseSources: z.array(phraseSourceSchema).default([]),
  referenceResolutions: z.array(referenceCoverageSchema).default([]),
  meaningReviews: z.array(meaningReviewSchema).optional(),
  records: z.array(z.discriminatedUnion("status", [
    z.object({ ...base, status: z.literal("corrected"), patch, evidence: vocabularyEvidenceSchema }).strict(),
    z.object({ ...base, status: z.literal("deferred") }).strict(),
    attestedCorrectionSchema,
  ])),
}).strict();
export type VocabularyCorrections = z.infer<typeof schema>;
export const parseVocabularyCorrections = (value: unknown) => schema.parse(value);
export const vocabularyRecordDigest = (record: unknown) => sha256(JSON.stringify(vocabularySchema.parse(record)));
export type VocabularyMeaningReview = z.infer<typeof meaningReviewSchema>;

function selectReviewedExamples(before: Vocabulary, selection: z.infer<typeof exampleSelectionSchema>) {
  const indices = [...selection.keep, ...selection.omit].map(item => item.index);
  requireUnique(indices.map(String), "review example index");
  if (indices.length !== before.examples.length || indices.some(index => index >= before.examples.length)) throw new Error(`Incomplete review example accounting: ${before.id}`);
  const keep = new Set(selection.keep.map(item => item.index));
  return before.examples.filter((_, index) => keep.has(index));
}

/** Phrase decisions cite the verified full expression; they cannot invent dictionary senses. */
export function verifyAttestedVocabularyCorrection(raw: Vocabulary, value: unknown, sourceIds: ReadonlySet<string>): Vocabulary {
  const change = attestedCorrectionSchema.parse(value);
  const before = vocabularySchema.parse(raw);
  if (before.id !== change.id || vocabularyRecordDigest(before) !== change.beforeSha256) throw new Error(`Correction record drift: ${change.id}`);
  if (change.exampleReview && change.patch.examples !== undefined) throw new Error(`Phrase example review cannot replace its source examples: ${change.id}`);
  const corrected = vocabularySchema.parse({ ...before, ...change.patch });
  if (corrected.jmdict_id) throw new Error(`Phrase attestation cannot assert a dictionary headword: ${change.id}`);
  verifyPhraseAttestation(corrected, change.attestation, sourceIds);
  if (change.exampleReview) corrected.examples = selectReviewedExamples(before, change.exampleReview);
  return corrected;
}

/** Dictionary support is machine-checked; equivalence/example reasons are explicit authored decisions. */
export function verifyVocabularyMeaningReview(raw: Vocabulary, dictionary: ReadonlyMap<string, DictionaryWord>, value: unknown, evidence?: VocabularyEvidence): Vocabulary {
  const review = meaningReviewSchema.parse(value);
  const before = vocabularySchema.parse(raw);
  if (before.id !== review.id || vocabularyRecordDigest(before) !== review.beforeSha256) throw new Error(`Meaning review record drift: ${review.id}`);
  requireUnique(review.meanings.map(item => normalizedMeaning(item.text)), "reviewed meaning");
  const constructions = evidence ? vocabularyPairEvidence(before.word, before.reading, dictionary, evidence).filter(item => item.kind !== "direct") : [];
  const eligible = (entryId: string, senseNumber: number, relation: VocabularyMeaningReview["meanings"][number]["relation"]) => {
    const entry = dictionary.get(entryId);
    const derived = relation !== "exact" && constructions.some(item => item.entryId === entryId && item.sense === senseNumber);
    const direct = relation !== "construction" && entry && dictionarySenseAllowsPair(entry, senseNumber, before.word, before.reading);
    if (!entry || (!direct && !derived)) throw new Error(`Unsupported meaning review sense: ${review.id}`);
    return entry.sense![senseNumber - 1];
  };
  for (const meaning of review.meanings) {
    const cited = eligible(meaning.entryId, meaning.sense, meaning.relation);
    if (!cited.gloss.some(gloss => gloss.lang === "eng" && gloss.text === meaning.gloss)) throw new Error(`Unsupported meaning review gloss: ${review.id}`);
    if ((meaning.relation === "exact" && normalizedMeaning(meaning.text) !== normalizedMeaning(meaning.gloss)) || (meaning.relation === "equivalent" && !before.meanings.includes(meaning.text))) throw new Error(`Unsupported meaning review relation: ${review.id}`);
  }
  const meanings = review.meanings.map(item => item.text);
  if (review.action === "retain" && JSON.stringify(meanings) !== JSON.stringify(before.meanings)) throw new Error(`Retain review cannot rewrite meanings: ${review.id}`);
  let examples = before.examples;
  if (review.examples) {
    examples = selectReviewedExamples(before, review.examples);
    const selected = new Set(review.meanings.map(item => `${item.entryId}:${item.sense}`));
    for (const example of review.examples.keep) if (!selected.has(`${example.entryId}:${example.sense}`)) throw new Error(`Example requires a selected meaning sense: ${review.id}`);
  }
  return { ...before, meanings, examples };
}

/** Preserve the upstream record and reject stale or unsupported changes before compilation. */
export function applyVocabularyCorrections(input: JapaneseCorpusInput, lock: SourceLock, value: unknown) {
  const ledger = parseVocabularyCorrections(value);
  if (ledger.sourceLockSha256 !== sourceLockDigest(lock)) throw new Error("Correction source lock drift");
  requireUnique(ledger.records.map((record) => record.id), "correction identity");
  requireUnique((ledger.meaningReviews ?? []).map(review => review.id), "meaning review identity");
  requireUnique([...lock.files, ...ledger.phraseSources].map((source) => source.id), "source identity");
  requireUnique([...lock.files, ...ledger.phraseSources].map((source) => source.filename), "source filename");
  requireUnique(input.vocabulary.map((record) => vocabularySchema.parse(record).id), "vocabulary identity");
  const records = new Map(input.vocabulary.map((record) => [String(record.id), record]));
  const dictionary = new Map(input.dictionaryWords.map((word) => [word.id, word]));
  const originals: Record<string, Vocabulary> = {};
  const meaningReviewBefore: Record<string, Vocabulary> = {};
  const vocabularyEvidence = { ...input.vocabularyEvidence };
  const phraseEvidence = { ...input.phraseEvidence };
  const phraseSourceIds = new Set(ledger.phraseSources.map((source) => source.id));
  for (const change of ledger.records) {
    const raw = records.get(change.id);
    if (!raw) throw new Error(`Unknown correction identity: ${change.id}`);
    if (vocabularyRecordDigest(raw) !== change.beforeSha256) throw new Error(`Correction record drift: ${change.id}`);
    if (change.status === "deferred") continue;
    const corrected = change.status === "attested"
      ? verifyAttestedVocabularyCorrection(vocabularySchema.parse(raw), change, phraseSourceIds)
      : vocabularySchema.parse({ ...raw, ...change.patch });
    originals[change.id] = vocabularySchema.parse(raw);
    records.set(change.id, corrected);
    if (change.status === "attested") {
      phraseEvidence[change.id] = change.attestation;
      delete vocabularyEvidence[change.id];
      continue;
    }
    requireUnique(change.evidence.dictionaryIds, "correction dictionary identity");
    for (const id of change.evidence.dictionaryIds) if (!dictionary.has(id)) throw new Error(`Missing correction dictionary entry: ${id}`);
    if (!change.evidence.dictionaryIds.includes(String(corrected.jmdict_id))) throw new Error(`Primary dictionary entry omitted: ${change.id}`);
    const used = new Set<string>();
    for (const written of [corrected.word, ...corrected.other_forms]) for (const reading of [corrected.reading, ...corrected.other_readings]) {
      for (const support of vocabularyPairEvidence(written, reading, dictionary, change.evidence)) used.add(support.entryId);
    }
    if (change.evidence.dictionaryIds.some((id) => !used.has(id))) throw new Error(`Unused correction evidence: ${change.id}`);
    vocabularyEvidence[change.id] = change.evidence;
    delete phraseEvidence[change.id];
  }
  for (const review of ledger.meaningReviews ?? []) {
    const raw = records.get(review.id);
    if (!raw) throw new Error(`Unknown meaning review identity: ${review.id}`);
    const before = vocabularySchema.parse(raw);
    const reviewed = verifyVocabularyMeaningReview(before, dictionary, review, vocabularyEvidence[review.id]);
    meaningReviewBefore[review.id] = before;
    if (JSON.stringify(before) !== JSON.stringify(reviewed)) originals[review.id] ??= before;
    records.set(review.id, reviewed);
  }
  const correctedInput = { ...input, vocabulary: input.vocabulary.map((word) => records.get(String(word.id))!), vocabularyEvidence, phraseEvidence };
  const report = auditJapaneseCorpus(correctedInput, { preferPrimaryForms: true });
  const verified = new Set(report.dictionaryVerifiedVocabularyIds);
  for (const change of ledger.records) if (change.status === "corrected" && !verified.has(change.id)) throw new Error(`Unsupported correction: ${change.id}`);
  const referenceCoverage = verifyReferenceCoverage(correctedInput, report, ledger.referenceResolutions);
  return { input: correctedInput, ledger, originals, meaningReviewBefore, report, referenceCoverage };
}
