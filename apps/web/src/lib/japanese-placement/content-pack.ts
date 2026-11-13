import "server-only";
import { z } from "zod";
import { japaneseBankSourceSchema, normalizedJapaneseContent as normalize, parseJapaneseBank, parseJapaneseItems, requireUnique as unique, type JapanesePlacementItem } from "./bank";
import { JAPANESE_REFERENCE_BANDS, japaneseOption, japaneseLocalizedText } from "./public";
import { dictionaryAllowsPair, dictionaryWordSchema, toHiragana } from "../japanese-content/corpus-audit";

const text = z.string().trim().min(1);
const identity = text.regex(/^[a-z][a-z0-9._-]*$/i);
const band = z.enum(JAPANESE_REFERENCE_BANDS);
const provenance = { id: identity, band, sourceId: identity, sourceRecord: text, changes: text };
const question = z.object({
  id: identity, prompt: text, choices: z.array(japaneseOption).min(2).max(6), correctChoiceId: identity,
  evidenceQuote: text, supportingQuotes: z.array(text).min(1).max(4).optional(),
  skill: z.enum(["detail", "inference", "main_idea", "purpose", "information_retrieval"]),
}).strict();
const evidenceQuotes = (q: z.infer<typeof question>) => [q.evidenceQuote, ...q.supportingQuotes ?? []];
function readingExplanation(q: z.infer<typeof question>) {
  const evidence = evidenceQuotes(q).join("\n");
  return { en: `Evidence in the passage: ${evidence}`, ja: `本文の根拠：${evidence}` };
}
const schema = z.object({
  schemaVersion: z.literal(1), id: identity, revision: z.number().int().positive(), status: z.literal("draft"),
  sources: z.array(japaneseBankSourceSchema).min(1),
  passages: z.array(z.object({ ...provenance, genre: z.enum(["narrative", "notice", "email", "opinion", "interview", "guide", "paired_texts"]), title: text, text, original: text.optional(), questions: z.array(question).min(1).max(4) }).strict()),
  assemblies: z.array(z.object({ ...provenance, focus: text, original: text, stimulus: text,
    tiles: z.array(japaneseOption).min(2).max(30), acceptedOrders: z.array(z.array(identity)).min(1).max(24), rationale: text,
  }).strict()),
  wordItems: z.array(z.object({ ...provenance, domain: z.enum(["kana", "kanji_reading", "vocabulary", "grammar"]),
    focus: text, original: text, prompt: japaneseLocalizedText, stimulus: text,
    choices: z.array(japaneseOption).min(2).max(6), correctChoiceId: identity,
    completion: text.optional(), rationale: text,
  }).strict()).default([]),
}).strict();
export type JapaneseContentPack = z.infer<typeof schema>;
export const contentSnapshotSchema = z.object({
  schemaVersion: z.literal(1), retrievedAt: z.string().date(),
  files: z.array(z.object({ url: z.string().url().startsWith("https://"), sha256: z.string().regex(/^[a-f0-9]{64}$/) }).strict()).min(1),
  records: z.array(z.object({
    sourceId: identity, id: text, band, text, title: text, fileUrl: z.string().url().startsWith("https://"),
    translation: text.optional(), questions: z.array(z.unknown()).optional(),
    wordEvidence: z.object({ written: text, reading: text, meanings: z.array(text).min(1), dictionary: dictionaryWordSchema,
      dictionaryFileUrl: z.string().url().startsWith("https://"), referenceFileUrl: z.string().url().startsWith("https://"),
      reference: z.object({ sourceRow: text, level: band, jmdict_seq: text, kana: text, kanji: text, waller_definition: text }).strict(),
    }).strict().optional(),
  }).strict()).min(1),
  selectionLedger: z.array(z.object({ sourceId: identity, recordId: text,
    status: z.enum(["selected", "deferred", "excluded"]), reason: text,
  }).strict()).min(1).optional(),
}).strict();
export type JapaneseContentSnapshots = z.infer<typeof contentSnapshotSchema>;

/** Verify retained source sentences/passage text against the pinned, private excerpts. */
export function verifyContentProvenance(pack: JapaneseContentPack, value: unknown): asserts value is JapaneseContentSnapshots {
  const snapshots = contentSnapshotSchema.parse(value);
  unique(snapshots.files.map((file) => file.url), "snapshot URL");
  unique(snapshots.records.map((record) => `${record.sourceId}:${record.id}`), "snapshot record");
  const sources = new Map(pack.sources.map((source) => [source.id, source]));
  const records = new Map(snapshots.records.map((record) => [`${record.sourceId}:${record.id}`, record]));
  const files = new Set(snapshots.files.map((file) => file.url));
  const recordFiles = (record: JapaneseContentSnapshots["records"][number]) => [record.fileUrl,
    ...record.wordEvidence ? [record.wordEvidence.dictionaryFileUrl, record.wordEvidence.referenceFileUrl] : []];
  if (snapshots.records.some((record) => recordFiles(record).some((url) => !files.has(url)))) throw new Error("Unpinned source excerpt");
  if (snapshots.files.some((file) => !snapshots.records.some((record) => recordFiles(record).includes(file.url)))) throw new Error("Unused source file");
  const used = new Set<string>();
  for (const entry of [...pack.passages, ...pack.assemblies, ...pack.wordItems]) {
    if (sources.get(entry.sourceId)?.origin !== "adapted") continue;
    const key = `${entry.sourceId}:${entry.sourceRecord}`;
    const original = records.get(key);
    if (!original || original.band !== entry.band || original.text !== ("text" in entry ? entry.original ?? entry.text : entry.original)) {
      throw new Error(`Source evidence mismatch: ${key}`);
    }
    used.add(key);
    if ("domain" in entry && ["kanji_reading", "vocabulary"].includes(entry.domain)) {
      const evidence = original.wordEvidence;
      if (!evidence) throw new Error(`Missing dictionary evidence: ${key}`);
      const { written, reading, dictionary, reference } = evidence;
      if (written !== entry.original || !dictionaryAllowsPair(dictionary, written, reading) ||
        reference.level !== entry.band || reference.jmdict_seq !== dictionary.id ||
        reference.kanji !== written || !dictionaryAllowsPair(dictionary, written, reference.kana)) throw new Error(`Lexical evidence mismatch: ${key}`);
      const correct = entry.choices.find((choice) => choice.id === entry.correctChoiceId)!;
      if (entry.domain === "kanji_reading" ? toHiragana(correct.text) !== toHiragana(reading) : correct.text !== written) throw new Error(`Lexical key mismatch: ${key}`);
      const alternatives = [written, reading, ...dictionary.kanji.map((form) => form.text), ...dictionary.kana.map((form) => form.text)].map(toHiragana);
      if (entry.choices.some((choice) => choice.id !== entry.correctChoiceId && (entry.domain === "kanji_reading"
        ? dictionaryAllowsPair(dictionary, written, choice.text) : alternatives.includes(toHiragana(choice.text))))) throw new Error(`Alternate correct lexical answer: ${key}`);
    }
  }
  if (snapshots.records.some((record) => !used.has(`${record.sourceId}:${record.id}`))) throw new Error("Unused source excerpt");
  if (snapshots.selectionLedger) {
    unique(snapshots.selectionLedger.map((row) => `${row.sourceId}:${row.recordId}`), "ledger record");
    const selected = new Set(snapshots.selectionLedger.filter((row) => row.status === "selected").map((row) => `${row.sourceId}:${row.recordId}`));
    if (selected.size !== records.size || [...selected].some((key) => !records.has(key))) throw new Error("Source selection ledger mismatch");
    if (snapshots.selectionLedger.some((row) => !sources.has(row.sourceId))) throw new Error("Unknown source in selection ledger");
  }
}

function projectItems(pack: JapaneseContentPack): JapanesePlacementItem[] {
  const base = (entry: JapaneseContentPack["passages"][number] | JapaneseContentPack["assemblies"][number] | JapaneseContentPack["wordItems"][number]) => ({
    id: `${entry.band.toLowerCase()}.${entry.id}`, revision: pack.revision, sourceIds: [entry.sourceId], referenceBand: entry.band, calibration: null,
  });
  return [
    ...pack.passages.flatMap((passage) => passage.questions.map((q) => ({
      ...base(passage), id: `${passage.band.toLowerCase()}.${passage.id}.${q.id}`, domain: "reading" as const,
      passageId: `${passage.band.toLowerCase()}.${passage.id}`,
      focus: `${passage.band} ${passage.genre}: ${q.skill}`,
      // Locale changes must not translate the comprehension question into the learner's L1.
      prompt: { en: q.prompt, ja: q.prompt }, stimulus: { kind: "text" as const, text: `${passage.title}\n\n${passage.text}` },
      responseType: "choice" as const, choices: q.choices, correctChoiceId: q.correctChoiceId,
      explanation: readingExplanation(q),
    }))),
    ...pack.assemblies.map((entry) => ({
      ...base(entry), domain: "writing" as const, focus: `${entry.band}: ${entry.focus}`,
      prompt: { en: "Arrange every tile to fill the blank and complete the sentence.", ja: "すべての語句を並べ、空欄に入れて文を完成させてください。" },
      stimulus: { kind: "text" as const, text: entry.stimulus }, responseType: "sentence_assembly" as const,
      tiles: entry.tiles, acceptedOrders: entry.acceptedOrders,
      explanation: { en: entry.rationale, ja: entry.rationale },
    })),
    ...pack.wordItems.map((entry) => ({ ...base(entry), domain: entry.domain, focus: `${entry.band}: ${entry.focus}`,
      prompt: entry.prompt, stimulus: { kind: "text" as const, text: entry.stimulus }, responseType: "choice" as const,
      choices: entry.choices, correctChoiceId: entry.correctChoiceId, explanation: { en: entry.rationale, ja: entry.rationale },
    })),
  ];
}

/** This is an authoring import. It never signs reviews, assigns likelihoods or publishes. */
export function parseContentPack(value: unknown): JapaneseContentPack {
  const pack = schema.parse(value);
  unique(pack.sources.map((source) => source.id), "source identity");
  const entries = [...pack.passages, ...pack.assemblies, ...pack.wordItems];
  unique(entries.map((entry) => `${entry.sourceId}:${entry.sourceRecord}`), "source record");
  unique(pack.passages.map((entry) => normalize(entry.text)), "passage text");
  unique(pack.assemblies.map((entry) => normalize(entry.original)), "construction text");
  unique(pack.assemblies.map((entry) => `${entry.band}:${normalize(entry.focus)}`), "construction target");
  const used = new Set(entries.map((entry) => entry.sourceId));
  if (pack.sources.some((source) => !used.has(source.id))) throw new Error("Unaccounted source");
  for (const passage of pack.passages) {
    if (passage.original !== undefined) {
      if (pack.sources.find((source) => source.id === passage.sourceId)?.origin !== "adapted") throw new Error(`Original text is only retained for adapted passages: ${passage.id}`);
      if (passage.original === passage.text) throw new Error(`Unchanged passage does not need an original override: ${passage.id}`);
    }
    for (const q of passage.questions) {
      for (const quote of evidenceQuotes(q)) {
        if (!normalize(passage.text).includes(normalize(quote))) throw new Error(`Missing evidence: ${passage.id}/${q.id}`);
      }
    }
  }
  for (const entry of pack.assemblies) {
    if (entry.stimulus.split("＿＿").length !== 2 || entry.stimulus.includes(entry.original)) throw new Error(`Construction needs one blank: ${entry.id}`);
    const tiles = new Map(entry.tiles.map((tile) => [tile.id, tile.text]));
    const completions = entry.acceptedOrders.map((order) => entry.stimulus.replace("＿＿", order.map((id) => tiles.get(id) ?? "").join("")));
    if (!completions.includes(entry.original)) throw new Error(`Original sentence missing from accepted orders: ${entry.id}`);
  }
  for (const entry of pack.wordItems) {
    const correct = entry.choices.find((choice) => choice.id === entry.correctChoiceId);
    if (!correct) throw new Error(`Missing choice key: ${entry.id}`);
    if (entry.domain === "kana") {
      const targetScript = /^[ァ-ヶー]+$/u.test(entry.stimulus) ? /^[ぁ-ゖー]+$/u : /^[ァ-ヶー]+$/u;
      if (entry.band !== "N5" || !/^[ぁ-ゖー]+$|^[ァ-ヶー]+$/u.test(entry.stimulus) || entry.stimulus === correct.text ||
        entry.choices.some((choice) => !targetScript.test(choice.text)) ||
        toHiragana(entry.stimulus) !== toHiragana(correct.text)) throw new Error(`Invalid kana conversion: ${entry.id}`);
    } else if (entry.domain === "grammar" || entry.domain === "vocabulary") {
      if (entry.stimulus.split("＿＿").length !== 2) throw new Error(`Choice needs one blank: ${entry.id}`);
      if (entry.stimulus.replace("＿＿", correct.text) !== entry.completion) throw new Error(`Choice completion mismatch: ${entry.id}`);
    }
    if (["kanji_reading", "vocabulary"].includes(entry.domain) && pack.sources.find((source) => source.id === entry.sourceId)?.origin !== "adapted") throw new Error(`Lexical items need pinned evidence: ${entry.id}`);
  }
  parseJapaneseItems(projectItems(pack), pack.sources.map((source) => source.id));
  return pack;
}

export function buildContentItems(pack: JapaneseContentPack): JapanesePlacementItem[] {
  const checked = parseContentPack(pack);
  return projectItems(checked);
}

/** Compile the verified authoring catalog into a private bank; release inputs remain absent. */
export function buildContentBank(pack: JapaneseContentPack) {
  const checked = parseContentPack(pack);
  const items = projectItems(checked);
  return parseJapaneseBank({ schemaVersion: 4, id: checked.id, version: checked.revision,
    assessment: null, sources: checked.sources, items, sequence: items.map((item) => item.id),
    reviews: { japaneseTeacher: null, rights: null, placement: null } });
}

/** Combine authoring packs without silently overwriting identities or source terms. */
export function mergeContentPacks(values: JapaneseContentPack[]): JapaneseContentPack {
  if (!values.length) throw new Error("At least one content pack required");
  const packs = values.map(parseContentPack);
  const sources = new Map<string, JapaneseContentPack["sources"][number]>();
  for (const pack of packs) for (const source of pack.sources) {
    const existing = sources.get(source.id);
    if (existing && JSON.stringify(existing) !== JSON.stringify(source)) throw new Error(`Source metadata conflict: ${source.id}`);
    sources.set(source.id, source);
  }
  return parseContentPack({ schemaVersion: 1, id: "japanese-content-catalog", revision: Math.max(...packs.map((p) => p.revision)),
    status: "draft", sources: [...sources.values()], passages: packs.flatMap((p) => p.passages), assemblies: packs.flatMap((p) => p.assemblies), wordItems: packs.flatMap((p) => p.wordItems) });
}

export function inspectContentCoverage(pack: JapaneseContentPack, requiredBands: readonly JapaneseContentPack["passages"][number]["band"][] = JAPANESE_REFERENCE_BANDS) {
  const checked = parseContentPack(pack);
  unique([...requiredBands], "coverage band");
  if (!requiredBands.length) throw new Error("Coverage bands required");
  const bands = requiredBands.map((level) => {
    const passages = checked.passages.filter((entry) => entry.band === level);
    const assemblies = checked.assemblies.filter((entry) => entry.band === level);
    const count = (domain: JapaneseContentPack["wordItems"][number]["domain"]) => checked.wordItems.filter((entry) => entry.band === level && entry.domain === domain).length;
    const [kana, kanjiReading, vocabulary, grammar] = [count("kana"), count("kanji_reading"), count("vocabulary"), count("grammar")];
    return { band: level, passages: passages.length, readingItems: passages.reduce((n, p) => n + p.questions.length, 0),
      assemblies: assemblies.length, genres: [...new Set(passages.map((entry) => entry.genre))].sort(),
      kana, kanjiReading, vocabulary, grammar,
      complete: passages.length >= 20 && assemblies.length >= 20 && passages.every((p) => p.questions.length >= 2) &&
        kanjiReading >= 10 && vocabulary >= 10 && grammar >= 10 && (level !== "N5" || kana >= 20) };
  });
  return { status: checked.status, complete: bands.every((entry) => entry.complete), bands };
}
