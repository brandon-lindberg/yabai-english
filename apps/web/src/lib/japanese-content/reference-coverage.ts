import { z } from "zod";
import { requireUnique, sameStringMembers } from "../unique";
import { vocabularySchema, type JapaneseCorpusInput, type JapaneseCorpusReport, type ReferenceVocabulary } from "./corpus-audit";
import { dictionarySenseAllowsPair } from "./dictionary";
import { sha256 } from "./digest";

const text = z.string().trim().min(1);
export const referenceCoverageSchema = z.object({
  sourceRow: text, beforeSha256: z.string().regex(/^[a-f0-9]{64}$/),
  expectedCandidateIds: z.array(text).min(2), disposition: z.literal("multiple-senses"), reason: text,
  coverage: z.array(z.object({ id: text, entryId: text, sense: z.number().int().positive(), meaning: text, referenceGloss: text }).strict()).min(2),
}).strict();
export type ReferenceCoverage = z.infer<typeof referenceCoverageSchema>;
export const referenceRecordDigest = (row: ReferenceVocabulary) => sha256(JSON.stringify({
  sourceRow: row.sourceRow, level: row.level, jmdict_seq: row.jmdict_seq, kana: row.kana, kanji: row.kanji, waller_definition: row.waller_definition,
}));

/** A curated lexical decision: all candidates survive, and the row remains ambiguous. */
export function verifyReferenceCoverage(input: JapaneseCorpusInput, report: JapaneseCorpusReport, values: unknown[]): ReferenceCoverage[] {
  const decisions = values.map((value) => referenceCoverageSchema.parse(value));
  requireUnique(decisions.map((decision) => decision.sourceRow), "reference coverage row");
  const references = new Map(input.referenceVocabulary.map((row) => [row.sourceRow, row]));
  const reconciled = new Map(report.reconciliation.map((row) => [row.sourceRow, row]));
  const words = new Map(input.vocabulary.map((raw) => { const word = vocabularySchema.parse(raw); return [word.id, word]; }));
  const dictionary = new Map(input.dictionaryWords.map((entry) => [entry.id, entry]));
  for (const decision of decisions) {
    const reference = references.get(decision.sourceRow);
    const row = reconciled.get(decision.sourceRow);
    if (!reference || referenceRecordDigest(reference) !== decision.beforeSha256) throw new Error(`Reference record drift: ${decision.sourceRow}`);
    if (row?.status !== "ambiguous") throw new Error(`Coverage requires an ambiguous reference: ${decision.sourceRow}`);
    requireUnique(decision.expectedCandidateIds, "expected coverage candidate");
    if (!sameStringMembers(row.candidateIds, decision.expectedCandidateIds)) throw new Error(`Reference candidate drift: ${decision.sourceRow}`);
    requireUnique(decision.coverage.map((item) => item.id), "coverage candidate");
    if (!sameStringMembers(decision.coverage.map((item) => item.id), row.candidateIds)) throw new Error(`Coverage must retain every candidate: ${decision.sourceRow}`);
    const senses = new Set<string>();
    for (const item of decision.coverage) {
      const word = words.get(item.id);
      const entry = dictionary.get(item.entryId);
      const ids = word && (input.vocabularyEvidence?.[word.id]?.dictionaryIds ?? [String(word.jmdict_id)]);
      const sense = entry?.sense?.[item.sense - 1];
      if (!word || !entry || !ids?.includes(item.entryId) || reference.jmdict_seq !== item.entryId ||
          !dictionarySenseAllowsPair(entry, item.sense, word.word, word.reading) ||
          !dictionarySenseAllowsPair(entry, item.sense, reference.kanji || word.word, reference.kana) ||
          !word.meanings.includes(item.meaning) || !sense?.gloss.some((gloss) => gloss.lang === "eng" && gloss.text === item.meaning)) {
        throw new Error(`Unsupported reference coverage: ${decision.sourceRow}/${item.id}`);
      }
      if (!reference.waller_definition.includes(item.referenceGloss)) throw new Error(`Missing reference gloss: ${decision.sourceRow}/${item.id}`);
      senses.add(`${item.entryId}:${item.sense}`);
    }
    if (senses.size < 2) throw new Error(`Coverage requires multiple dictionary senses: ${decision.sourceRow}`);
  }
  return decisions;
}
