import { z } from "zod";
import { dictionaryAllowsPair, dictionarySenseAllowsPair, japaneseVocabularyPairKey, type DictionaryWord } from "./dictionary";

const text = z.string().trim().min(1);
export const vocabularyEvidenceSchema = z.object({
  dictionaryIds: z.array(text).min(1),
  derivations: z.array(z.object({
    kind: z.enum(["suru", "adverb-to", "adverb-ni"]), entryId: text, sense: z.number().int().positive(),
    baseWritten: text, baseReading: text,
  }).strict()),
}).strict();
export type VocabularyEvidence = z.infer<typeof vocabularyEvidenceSchema>;
export type VocabularyPairEvidence = { entryId: string; kind: "direct" } | VocabularyEvidence["derivations"][number];
const rules = { suru: { suffix: "する", pos: "vs" }, "adverb-to": { suffix: "と", pos: "adv-to" }, "adverb-ni": { suffix: "に", pos: "adj-na" } } as const;

/** Only explicitly authored constructions with an eligible, restricted dictionary sense. */
export function vocabularyPairEvidence(written: string, reading: string, dictionary: ReadonlyMap<string, DictionaryWord>, evidence: VocabularyEvidence): VocabularyPairEvidence[] {
  const matches: VocabularyPairEvidence[] = evidence.dictionaryIds.flatMap((entryId) => {
    const entry = dictionary.get(entryId);
    return entry && dictionaryAllowsPair(entry, written, reading) ? [{ entryId, kind: "direct" as const }] : [];
  });
  for (const derivation of evidence.derivations) {
    if (!evidence.dictionaryIds.includes(derivation.entryId)) continue;
    const rule = rules[derivation.kind];
    if (japaneseVocabularyPairKey(written, reading) !== japaneseVocabularyPairKey(derivation.baseWritten + rule.suffix, derivation.baseReading + rule.suffix)) continue;
    const entry = dictionary.get(derivation.entryId);
    const sense = entry?.sense?.[derivation.sense - 1];
    if (!entry || !sense?.partOfSpeech.includes(rule.pos) || !dictionarySenseAllowsPair(entry, derivation.sense, derivation.baseWritten, derivation.baseReading)) continue;
    matches.push(derivation);
  }
  return matches;
}
