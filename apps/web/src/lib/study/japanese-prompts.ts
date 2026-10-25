import "server-only";
import { z } from "zod";
import { kanjiSchema, vocabularySchema, type JapaneseLevel } from "../japanese-content/corpus-audit";
import { dictionaryWordSchema, japaneseVocabularyPairKey, toHiragana, normalizeDictionaryText as normMeaning } from "../japanese-content/dictionary";
import { phraseAttestationSchema } from "../japanese-content/phrase-evidence";
import { sha256 } from "../japanese-content/digest";
import type { JapaneseFlashcardCatalog } from "../japanese-content/flashcard-catalog";
import { requireUnique, sameStringMembers } from "../unique";
import { canonicalJson } from "../canonical-json";
import { studyLevelIndex } from "./constants";
import { shuffleTokensForQueue } from "./card-exercise";
import { japaneseVocabularyUsage } from "./japanese-usage";
import { japaneseStudyInstructions, japaneseStudyQuestionSchema, japaneseStudyResponseSchema, type JapaneseStudyQuestion, type JapaneseStudyTask, type JapaneseStudyFeedback } from "./japanese-public";

const text = z.string().min(1);
const level = vocabularySchema.shape.level;
const supplementSchema = z.object({
  written: dictionaryWordSchema.shape.kanji.element.nullable(), reading: dictionaryWordSchema.shape.kana.element,
  senses: z.array(dictionaryWordSchema.shape.sense.unwrap().element.extend({ number: z.number().int().positive() })),
}).passthrough();
const recordBase = { id: text, sourceFileId: text, referenceRows: z.array(text) };
const vocabularyRecord = z.object({ ...recordBase, kind: z.literal("vocabulary"), content: vocabularySchema,
  dictionaryEvidence: z.object({ verified: z.boolean(), entryIds: z.array(text), acceptedPairs: z.array(z.object({ written: text, reading: text }).passthrough()) }).passthrough(),
  phraseEvidence: phraseAttestationSchema.optional(), referenceSupplement: supplementSchema.optional(),
}).passthrough();
const kanjiRecord = z.object({ ...recordBase, kind: z.literal("kanji"), content: kanjiSchema,
  dictionaryEvidence: z.object({ verified: z.boolean() }).passthrough(),
}).passthrough();
const contentSchema = z.object({ schemaVersion: z.literal(1), unit: z.object({
  id: text, kind: z.enum(["vocabulary", "kanji"]), recordIds: z.array(text).min(1), answerPolicy: z.literal("member-specific"),
  level: z.object({ code: level, evidence: z.array(z.object({
    source: z.enum(["record", "reference"]), recordId: text, sourceFileId: text, code: level, used: z.boolean(), sourceRow: text.optional(), scope: text,
  }).passthrough()) }),
}).passthrough(), records: z.array(z.discriminatedUnion("kind", [vocabularyRecord, kanjiRecord])).min(1) }).strict();
export type JapaneseStudyContent = z.infer<typeof contentSchema>;
type Record = JapaneseStudyContent["records"][number];
type Reference = JapaneseFlashcardCatalog["reconciliation"][number];

/** Decode persisted content without discarding source metadata or accepting legacy English rows. */
export function parseJapaneseStudyContent(raw: unknown): JapaneseStudyContent {
  const content = contentSchema.parse(raw);
  requireUnique(content.records.map(record => record.id), "prompt member");
  requireUnique(content.unit.recordIds, "prompt membership");
  if (!content.unit.recordIds.includes(content.unit.id) || !sameStringMembers(content.unit.recordIds, content.records.map(record => record.id)) || content.records.some(record => record.kind !== content.unit.kind)) throw new Error("Invalid canonical prompt membership/kind");
  for (const record of content.records) {
    const evidence = content.unit.level.evidence.filter(row => row.recordId === record.id && row.source === "record");
    if (evidence.length !== 1 || !evidence[0].used || evidence[0].scope !== "record" || evidence[0].code !== record.content.level || evidence[0].sourceFileId !== record.sourceFileId) throw new Error(`Stale prompt level evidence: ${record.id}`);
    if (record.kind === "kanji") {
      if (!record.dictionaryEvidence.verified) throw new Error(`Unverified kanji: ${record.id}`);
    } else {
      const primary = japaneseVocabularyPairKey(record.content.word, record.content.reading);
      const supported = record.dictionaryEvidence.verified && record.dictionaryEvidence.acceptedPairs.some(pair => japaneseVocabularyPairKey(pair.written, pair.reading) === primary);
      const phrase = record.phraseEvidence;
      if (!supported && !(phrase && [phrase.attestedWritten, phrase.reading].some(written => japaneseVocabularyPairKey(written, phrase.reading) === primary))) throw new Error(`Unsupported primary prompt pair: ${record.id}`);
    }
  }
  const eligible = content.unit.level.evidence.filter(row => row.used);
  if (eligible.some(row => !content.unit.recordIds.includes(row.recordId)) || Math.min(...eligible.map(row => rank(row.code))) !== rank(content.unit.level.code)) throw new Error("Invalid introduction level evidence");
  return content;
}

type Entry = { unitId: string; memberId: string; record: Record; introduction: JapaneseLevel; formLevel: JapaneseLevel; written: string; reading?: string; meanings: string[]; usage: string[]; sourceRow?: string };
type Candidate = { entry: Entry; text: string };
export type { JapaneseStudyFeedback } from "./japanese-public";
/** Server-only answer context. Only `question` is a learner-facing projection. */
export type CompiledJapaneseStudyPrompt = { question: JapaneseStudyQuestion; correctChoiceId: string; feedback: JapaneseStudyFeedback };
const normReading = (value: string) => toHiragana(value.trim());
const rank = (code: JapaneseLevel) => studyLevelIndex(code, "JAPANESE");

function entryForms(content: JapaneseStudyContent, record: Record, references: ReadonlyMap<string, Reference>): Entry[] {
  const entry = { unitId: content.unit.id, memberId: record.id, record, introduction: content.unit.level.code, formLevel: record.content.level,
    written: record.kind === "vocabulary" ? record.content.word : record.content.character,
    reading: record.kind === "vocabulary" ? record.content.reading : undefined, meanings: record.content.meanings,
    usage: record.kind === "vocabulary" ? japaneseVocabularyUsage(record) : [],
  };
  if (record.kind !== "vocabulary") {
    if (record.content.level !== content.unit.level.code) throw new Error("Kanji introduction/source level drift");
    return [entry];
  }
  // Retain later primary spellings, but introduce only forms supported at the selected band.
  const forms = content.unit.level.evidence.filter(row => row.recordId === record.id && row.source === "reference" && row.used);
  const evidenced = forms.map(evidence => {
    const reference = evidence.sourceRow ? references.get(evidence.sourceRow) : undefined;
    if (!reference || reference.status !== "matched" || reference.level !== evidence.code || reference.sourceFileId !== evidence.sourceFileId || !reference.candidateCardIds.includes(record.id) || normReading(reference.kana) !== normReading(record.content.reading)) throw new Error(`Missing or stale prompt reference: ${evidence.sourceRow}`);
    const written = reference.kanji || reference.kana;
    const pair = record.dictionaryEvidence.acceptedPairs.some(pair => japaneseVocabularyPairKey(pair.written, pair.reading) === japaneseVocabularyPairKey(written, reference.kana));
    if (!(evidence.scope === "declared-pair" && pair) && !(evidence.scope === "kana-reference" && !reference.kanji)) throw new Error(`Unsupported prompt reference form: ${evidence.sourceRow}`);
    return { ...entry, written, formLevel: reference.level, sourceRow: reference.sourceRow };
  });
  const byForm = new Map<string, Entry>();
  for (const form of [entry, ...evidenced]) {
    const key = japaneseVocabularyPairKey(form.written, form.reading!);
    const existing = byForm.get(key);
    if (!existing || rank(form.formLevel) < rank(existing.formLevel)) byForm.set(key, form);
  }
  return [...byForm.values()];
}

function answers(entry: Entry, task: JapaneseStudyTask): string[] {
  if (entry.record.kind === "vocabulary") {
    if (task === "vocabulary_meaning") return entry.meanings;
    if (task === "vocabulary_reading" && entry.reading && normReading(entry.written) !== normReading(entry.reading)) return [entry.reading];
  } else {
    if (task === "kanji_on") return entry.record.content.onyomi;
    if (task === "kanji_kun") return entry.record.content.kunyomi;
  }
  return [];
}

/** Build once per catalog snapshot; prompt creation then scans pre-indexed candidate pools. */
export function createJapanesePromptBank(rawContents: readonly unknown[], referenceRows: readonly Reference[]) {
  const compare = (a: string, b: string) => a < b ? -1 : a > b ? 1 : 0;
  const contents = rawContents.map(parseJapaneseStudyContent).sort((a, b) => compare(a.unit.id, b.unit.id));
  requireUnique(contents.map(content => content.unit.id), "prompt unit");
  requireUnique(contents.flatMap(content => content.unit.recordIds), "prompt bank member");
  requireUnique(referenceRows.map(row => row.sourceRow), "prompt reference");
  const references = new Map(referenceRows.map(row => [row.sourceRow, row]));
  const byUnit = new Map<string, Entry[]>();
  for (const content of contents) {
    const entries = content.records.sort((a, b) => compare(a.id, b.id)).flatMap(record => entryForms(content, record, references)).sort((a, b) => compare(a.memberId, b.memberId) || compare(a.sourceRow ?? "", b.sourceRow ?? ""));
    if (!entries.some(entry => rank(entry.formLevel) <= rank(content.unit.level.code))) throw new Error(`No evidenced introduction form: ${content.unit.id}`);
    byUnit.set(content.unit.id, entries);
  }
  const taskNames = Object.keys(japaneseStudyInstructions) as JapaneseStudyTask[];
  const pools = new Map(taskNames.map(task => [task, [...byUnit.values()].flat().flatMap(entry => answers(entry, task).map(text => ({ entry, text })))]));
  function select(unitId: string, memberId?: string, studyBand?: JapaneseLevel) {
    const candidates = byUnit.get(unitId);
    const band = studyBand ?? candidates?.[0].introduction;
    const entries = candidates?.filter(entry => band && rank(entry.formLevel) <= rank(band));
    const entry = entries?.find(entry => entry.memberId === (memberId ?? unitId)) ?? (!memberId ? entries?.[0] : undefined);
    if (!entry) throw new Error(`No eligible prompt member/form: ${unitId}/${memberId ?? "anchor"}`);
    return entry;
  }
  return {
    unitIds: [...byUnit.keys()],
    members(unitId: string, studyBand?: JapaneseLevel) {
      const entries = byUnit.get(unitId);
      if (!entries) throw new Error(`Unknown Japanese study unit: ${unitId}`);
      return [...new Set(entries.filter(entry => rank(entry.formLevel) <= rank(studyBand ?? entry.introduction)).map(entry => entry.memberId))];
    },
    tasks(unitId: string, memberId?: string, studyBand?: JapaneseLevel) { const entry = select(unitId, memberId, studyBand); return taskNames.filter(task => answers(entry, task).length > 0); },
    create(unitId: string, options: { task: JapaneseStudyTask; seed: string; memberId?: string; studyBand?: JapaneseLevel }): CompiledJapaneseStudyPrompt {
      const entry = select(unitId, options.memberId, options.studyBand);
      const accepted = answers(entry, options.task);
      if (!accepted.length) throw new Error(`Unavailable Japanese study task: ${options.task}`);
      // Keep notation in displayed source readings, while excluding equivalent
      // pronunciations as distractors (た.べる and タベル cannot be opposing choices).
      const normalize = options.task === "vocabulary_meaning" ? normMeaning
        : options.task.startsWith("kanji_") ? (value: string) => normReading(value).replace(/[.-]/g, "") : normReading;
      const acceptedNorms = new Set(accepted.map(normalize));
      const pool = pools.get(options.task)!;
      const seed = sha256(canonicalJson({ revision: "japanese-study-prompts-v1", entry, task: options.task, seed: options.seed }));
      const start = parseInt(seed.slice(0, 8), 16);
      const correctText = accepted[start % accepted.length];
      const texts = [correctText];
      const seen = new Set(acceptedNorms);
      for (let offset = 0; offset < pool.length && texts.length < 4; offset++) {
        const candidate: Candidate = pool[(start + offset) % pool.length];
        if (candidate.entry.unitId === unitId || rank(candidate.entry.formLevel) > rank(options.studyBand ?? entry.introduction) || seen.has(normalize(candidate.text))) continue;
        if (options.task === "vocabulary_meaning" && entry.record.kind === "vocabulary" && candidate.entry.record.kind === "vocabulary") {
          if (candidate.entry.written === entry.written || candidate.entry.meanings.some(meaning => acceptedNorms.has(normMeaning(meaning))) || candidate.entry.record.dictionaryEvidence.entryIds.some(id => entry.record.kind === "vocabulary" && entry.record.dictionaryEvidence.entryIds.includes(id))) continue;
        }
        seen.add(normalize(candidate.text)); texts.push(candidate.text);
      }
      if (texts.length < 2) throw new Error(`No safe source distractors: ${unitId}/${options.task}`);
      const choices = texts.map(text => ({ id: sha256(`${seed}\0${text}`).slice(0, 24), text }));
      const question = japaneseStudyQuestionSchema.parse({ id: sha256(JSON.stringify({ seed, choices })), unitId, memberId: entry.memberId, task: options.task,
        instruction: japaneseStudyInstructions[options.task], level: { introduction: entry.introduction, source: entry.record.content.level, form: entry.formLevel }, usage: entry.usage,
        stimulus: { written: entry.written, ...(options.task === "vocabulary_meaning" ? { reading: entry.reading } : { meanings: entry.meanings }) },
        choices: shuffleTokensForQueue(choices, seed),
      });
      const feedback: JapaneseStudyFeedback = { written: entry.written, ...(entry.reading ? { reading: entry.reading } : {}), meanings: entry.meanings,
        ...(entry.record.kind === "kanji" ? { onyomi: entry.record.content.onyomi, kunyomi: entry.record.content.kunyomi, nanori: entry.record.content.nanori } : {}),
      };
      return { question, correctChoiceId: choices[0].id, feedback };
    },
  };
}

/** Grade only an offered choice bound to this exact server-owned prompt. */
export function gradeJapaneseStudyPrompt(prompt: CompiledJapaneseStudyPrompt, raw: unknown) {
  const parsed = japaneseStudyResponseSchema.safeParse(raw);
  if (!parsed.success) return { status: "invalid", reason: "invalid_response" } as const;
  if (parsed.data.promptId !== prompt.question.id) return { status: "invalid", reason: "stale_prompt" } as const;
  if (!prompt.question.choices.some(choice => choice.id === parsed.data.choiceId)) return { status: "invalid", reason: "invalid_response" } as const;
  return { status: "graded", correct: parsed.data.choiceId === prompt.correctChoiceId, feedback: structuredClone(prompt.feedback) } as const;
}
