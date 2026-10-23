import { z } from "zod";
import { requireUnique } from "../unique";
import { auditJapaneseCorpus, vocabularySchema, type JapaneseCorpusInput, type Vocabulary } from "./corpus-audit";
import { sha256 } from "./digest";
import { sourceLockDigest, type SourceLock } from "./source-files";
import { vocabularyEvidenceSchema, vocabularyPairEvidence } from "./vocabulary-evidence";
import { phraseAttestationSchema, phraseSourceSchema, verifyPhraseAttestation } from "./phrase-evidence";
import { referenceCoverageSchema, verifyReferenceCoverage } from "./reference-coverage";

const text = z.string().trim().min(1);
const digest = z.string().regex(/^[a-f0-9]{64}$/);
const base = { id: text, beforeSha256: digest, reason: text };
const patch = vocabularySchema.pick({ word: true, reading: true, romaji: true, pos: true, meanings: true, jmdict_id: true, other_forms: true, other_readings: true, examples: true }).partial().strict();
const schema = z.object({
  schemaVersion: z.literal(1), sourceLockSha256: digest,
  phraseSources: z.array(phraseSourceSchema).default([]),
  referenceResolutions: z.array(referenceCoverageSchema).default([]),
  records: z.array(z.discriminatedUnion("status", [
    z.object({ ...base, status: z.literal("corrected"), patch, evidence: vocabularyEvidenceSchema }).strict(),
    z.object({ ...base, status: z.literal("deferred") }).strict(),
    z.object({ ...base, status: z.literal("attested"), patch, attestation: phraseAttestationSchema }).strict(),
  ])),
}).strict();
export type VocabularyCorrections = z.infer<typeof schema>;
export const parseVocabularyCorrections = (value: unknown) => schema.parse(value);
export const vocabularyRecordDigest = (record: unknown) => sha256(JSON.stringify(vocabularySchema.parse(record)));

/** Preserve the upstream record and reject stale or unsupported changes before compilation. */
export function applyVocabularyCorrections(input: JapaneseCorpusInput, lock: SourceLock, value: unknown) {
  const ledger = parseVocabularyCorrections(value);
  if (ledger.sourceLockSha256 !== sourceLockDigest(lock)) throw new Error("Correction source lock drift");
  requireUnique(ledger.records.map((record) => record.id), "correction identity");
  requireUnique([...lock.files, ...ledger.phraseSources].map((source) => source.id), "source identity");
  requireUnique([...lock.files, ...ledger.phraseSources].map((source) => source.filename), "source filename");
  requireUnique(input.vocabulary.map((record) => vocabularySchema.parse(record).id), "vocabulary identity");
  const records = new Map(input.vocabulary.map((record) => [String(record.id), record]));
  const dictionary = new Map(input.dictionaryWords.map((word) => [word.id, word]));
  const originals: Record<string, Vocabulary> = {};
  const vocabularyEvidence = { ...input.vocabularyEvidence };
  const phraseEvidence = { ...input.phraseEvidence };
  const phraseSourceIds = new Set(ledger.phraseSources.map((source) => source.id));
  for (const change of ledger.records) {
    const raw = records.get(change.id);
    if (!raw) throw new Error(`Unknown correction identity: ${change.id}`);
    if (vocabularyRecordDigest(raw) !== change.beforeSha256) throw new Error(`Correction record drift: ${change.id}`);
    if (change.status === "deferred") continue;
    const corrected = vocabularySchema.parse({ ...raw, ...change.patch });
    originals[change.id] = vocabularySchema.parse(raw);
    records.set(change.id, corrected);
    if (change.status === "attested") {
      if (corrected.jmdict_id) throw new Error(`Phrase attestation cannot assert a dictionary headword: ${change.id}`);
      verifyPhraseAttestation(corrected, change.attestation, phraseSourceIds);
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
  const correctedInput = { ...input, vocabulary: input.vocabulary.map((word) => records.get(String(word.id))!), vocabularyEvidence, phraseEvidence };
  const report = auditJapaneseCorpus(correctedInput, { preferPrimaryForms: true });
  const verified = new Set(report.dictionaryVerifiedVocabularyIds);
  for (const change of ledger.records) if (change.status === "corrected" && !verified.has(change.id)) throw new Error(`Unsupported correction: ${change.id}`);
  const referenceCoverage = verifyReferenceCoverage(correctedInput, report, ledger.referenceResolutions);
  return { input: correctedInput, ledger, originals, report, referenceCoverage };
}
