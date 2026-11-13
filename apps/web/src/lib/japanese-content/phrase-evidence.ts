import { z } from "zod";
import { type Vocabulary } from "./corpus-audit";
import { toHiragana } from "./dictionary";
import { pinnedSourceSchema } from "./source-files";

const text = z.string().trim().min(1);
export const phraseSourceSchema = pinnedSourceSchema.extend({
  role: z.literal("phrase"), title: text, publisher: text, retrievedAt: z.string().date(), use: z.literal("citation-only"),
}).strict();
export const phraseAttestationSchema = z.object({
  sourceId: text, locator: text, quotedForm: text, attestedWritten: text, reading: text, meanings: z.array(text).min(1),
  normalization: z.enum(["none", "optional-question-particle", "with-shoushou"]),
}).strict();
export type PhraseAttestation = z.infer<typeof phraseAttestationSchema>;

/** Check a curated complete-expression attestation, without claiming dictionary coverage. */
export function verifyPhraseAttestation(word: Vocabulary, value: unknown, sourceIds: ReadonlySet<string>): asserts value is PhraseAttestation {
  const evidence = phraseAttestationSchema.parse(value);
  let quoted = evidence.quotedForm.normalize("NFC").replace(/\s/g, "");
  if (evidence.normalization === "optional-question-particle") quoted = quoted.replace(/（か）|\(か\)/g, "か");
  if (evidence.normalization === "with-shoushou") quoted = quoted.replace(/^少々/, "");
  const written = evidence.attestedWritten.normalize("NFC");
  const supportsWritten = (form: string) => form.normalize("NFC") === written || toHiragana(form) === toHiragana(evidence.reading);
  if (!sourceIds.has(evidence.sourceId) || quoted !== written ||
    ![word.word, ...word.other_forms].every(supportsWritten) ||
    ![word.reading, ...word.other_readings].every((reading) => toHiragana(reading) === toHiragana(evidence.reading)) ||
    !word.meanings.every((meaning) => evidence.meanings.includes(meaning))) throw new Error(`Unsupported phrase attestation: ${word.id}`);
}
