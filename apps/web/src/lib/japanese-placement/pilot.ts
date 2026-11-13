import "server-only";
import { createHash } from "node:crypto";
import { z } from "zod";
import { bankDigest, canonicalJson, japaneseEvidenceKey, japaneseUniformGuessingRate, parseJapaneseBank, requireUnique, type JapanesePlacementItem } from "./bank";
import { isCorrectJapaneseResponse } from "./adaptive";
import { JAPANESE_PLACEMENT_DOMAINS, JAPANESE_STUDY_BANDS, japaneseResponseInputSchema } from "./public";
import { projectJapaneseQuestion, validateJapaneseResponse } from "./question";

const digest = z.string().regex(/^[a-f0-9]{64}$/);
const count = z.number().int().nonnegative();
const elapsed = count.max(1200000);
const identity = z.string().regex(/^[a-z][a-z0-9._-]*$/);
const itemRef = z.object({ id: identity, revision: z.number().int().positive() }).strict();
const formsSchema = z.object({
  schemaVersion: z.literal(1), kind: z.literal("japanese-pilot-forms"),
  bankId: identity, bankVersion: z.number().int().positive(), bankDigest: digest,
  timeLimitSec: z.literal(1200), maxQuestions: z.literal(24),
  forms: z.array(z.object({ id: identity, revision: z.literal(1), items: z.array(itemRef).min(1).max(24) }).strict()).min(1).max(1000),
}).strict();
export type JapanesePilotForms = z.infer<typeof formsSchema>;

function pilotBank(value: unknown) {
  const bank = parseJapaneseBank(value);
  if (bank.schemaVersion !== 4) throw new Error("Japanese pilot requires a passage-aware v4 bank");
  return bank;
}

export function parseJapanesePilotForms(bankValue: unknown, value: unknown): JapanesePilotForms {
  const bank = pilotBank(bankValue);
  const forms = formsSchema.parse(value);
  if (forms.bankId !== bank.id || forms.bankVersion !== bank.version || forms.bankDigest !== bankDigest(bank)) throw new Error("Pilot bank snapshot mismatch");
  requireUnique(forms.forms.map((form) => form.id), "pilot form");
  const byId = new Map(bank.items.map((item) => [item.id, item]));
  const refs = forms.forms.flatMap((form) => form.items);
  requireUnique(refs.map((ref) => ref.id), "pilot item");
  if (refs.length !== bank.items.length) throw new Error("Pilot forms must cover the complete bank exactly once");
  for (const form of forms.forms) {
    const keys = form.items.map((ref) => {
      const item = byId.get(ref.id);
      if (!item || item.revision !== ref.revision) throw new Error("Pilot item revision mismatch");
      return japaneseEvidenceKey(item);
    });
    requireUnique(keys, "pilot passage");
  }
  return forms;
}

/** Fixed collection forms, not adaptive delivery or a difficulty/level model. */
export function createJapanesePilotForms(bankValue: unknown): JapanesePilotForms {
  const bank = pilotBank(bankValue);
  const byId = new Map(bank.items.map((item) => [item.id, item]));
  const multiplicities = new Map<string, number>();
  for (const item of bank.items) multiplicities.set(japaneseEvidenceKey(item), (multiplicities.get(japaneseEvidenceKey(item)) ?? 0) + 1);
  const ordered = bank.sequence.map((id) => byId.get(id)!).sort((a, b) => multiplicities.get(japaneseEvidenceKey(b))! - multiplicities.get(japaneseEvidenceKey(a))!);
  // Keep siblings apart first; grow the form count if a future bank cannot fit this partition.
  for (let size = Math.max(Math.ceil(bank.items.length / 24), ...multiplicities.values()); size <= bank.items.length; size++) {
    const groups: JapanesePlacementItem[][] = Array.from({ length: size }, () => []);
    let fits = true;
    for (const item of ordered) {
      const candidates = groups.filter((group) => group.length < 24 && group.every((entry) => japaneseEvidenceKey(entry) !== japaneseEvidenceKey(item)));
      candidates.sort((a, b) => a.length - b.length
        || a.filter((entry) => entry.domain === item.domain && entry.referenceBand === item.referenceBand).length - b.filter((entry) => entry.domain === item.domain && entry.referenceBand === item.referenceBand).length
        || a.filter((entry) => entry.domain === item.domain).length - b.filter((entry) => entry.domain === item.domain).length);
      if (!candidates.length) { fits = false; break; }
      candidates[0].push(item);
    }
    if (!fits) continue;
    const forms = groups.filter((group) => group.length).map((group, index) => {
      const queues = JAPANESE_PLACEMENT_DOMAINS.map((domain) => group.filter((item) => item.domain === domain));
      const items: JapanesePlacementItem[] = [];
      while (queues.some((queue) => queue.length)) for (let offset = 0; offset < queues.length; offset++) {
        const item = queues[(index + offset) % queues.length].shift();
        if (item) items.push(item);
      }
      return { id: `form-${String(index + 1).padStart(3, "0")}`, revision: 1 as const, items: items.map(({ id, revision }) => ({ id, revision })) };
    });
    return parseJapanesePilotForms(bank, { schemaVersion: 1, kind: "japanese-pilot-forms", bankId: bank.id, bankVersion: bank.version,
      bankDigest: bankDigest(bank), timeLimitSec: 1200, maxQuestions: 24, forms });
  }
  throw new Error("Cannot partition Japanese pilot bank");
}

export function pilotFormsDigest(bankValue: unknown, value: unknown): string {
  return createHash("sha256").update(canonicalJson(parseJapanesePilotForms(bankValue, value))).digest("hex");
}

export function projectJapanesePilotForm(bankValue: unknown, formsValue: unknown, formId: string) {
  const bank = pilotBank(bankValue);
  const forms = parseJapanesePilotForms(bank, formsValue);
  const form = forms.forms.find((form) => form.id === formId);
  if (!form) throw new Error("Unknown Japanese pilot form");
  const byId = new Map(bank.items.map((item) => [item.id, item]));
  const sourceIds = new Set(form.items.flatMap((ref) => byId.get(ref.id)!.sourceIds));
  return { schemaVersion: 1, mode: "offline_static_pilot", awardsLevel: false, formsDigest: pilotFormsDigest(bank, forms),
    formId: form.id, formRevision: form.revision, timeLimitSec: forms.timeLimitSec,
    itemRevisions: form.items, questions: form.items.map((ref) => projectJapaneseQuestion(byId.get(ref.id)!)),
    notices: bank.sources.filter((source) => sourceIds.has(source.id)).map(({ title, location, license, attribution }) => ({ title, location, license, attribution })) };
}

const date = z.string().regex(/^\d{4}-\d{2}-\d{2}$/).refine((value) => {
  const parsed = new Date(`${value}T00:00:00.000Z`);
  return Number.isFinite(parsed.getTime()) && parsed.toISOString().slice(0, 10) === value;
}, "Invalid reference date");
const referenceSchema = z.object({ band: z.enum(JAPANESE_STUDY_BANDS),
  method: z.enum(["jlpt", "independent_japanese_reading_writing"]), assessedOn: date, evidenceId: z.string().uuid(),
}).strict().refine((value) => value.method !== "jlpt" || value.band !== "BELOW_N5", "JLPT has no below-N5 award");
const observationSchema = z.object({ itemId: identity, itemRevision: z.number().int().positive(), position: count.positive(),
  presentedAtMs: elapsed, submittedAtMs: elapsed.nullable(), response: japaneseResponseInputSchema.nullable(),
}).strict();
const dataSchema = z.object({ schemaVersion: z.literal(1), kind: z.literal("japanese-pilot-observations"),
  formsDigest: digest, studyId: z.string().uuid(), protocolDigest: digest,
  participants: z.array(z.object({ id: z.string().uuid(), split: z.enum(["development", "holdout"]), reference: referenceSchema,
    session: z.object({ id: z.string().uuid(), formId: identity, elapsedMs: elapsed,
      endedBy: z.enum(["completed", "time_limit", "withdrawn"]), observations: z.array(observationSchema).max(24),
    }).strict(),
  }).strict()).max(100000),
}).strict();
export type JapanesePilotData = z.infer<typeof dataSchema>;

export function parseJapanesePilotData(bankValue: unknown, formsValue: unknown, value: unknown): JapanesePilotData {
  const bank = pilotBank(bankValue);
  const forms = parseJapanesePilotForms(bank, formsValue);
  const data = dataSchema.parse(value);
  if (data.formsDigest !== pilotFormsDigest(bank, forms)) throw new Error("Pilot forms digest mismatch");
  requireUnique(data.participants.map((participant) => participant.id), "pilot participant");
  requireUnique(data.participants.map((participant) => participant.session.id), "pilot session");
  requireUnique(data.participants.map((participant) => participant.reference.evidenceId), "pilot reference evidence");
  const byId = new Map(bank.items.map((item) => [item.id, item]));
  for (const { session } of data.participants) {
    const form = forms.forms.find((form) => form.id === session.formId);
    if (!form) throw new Error("Unknown pilot session form");
    if (session.observations.length > form.items.length) throw new Error("Too many pilot observations");
    if (session.endedBy === "time_limit" && session.elapsedMs !== forms.timeLimitSec * 1000) throw new Error("Pilot time-limit mismatch");
    if (session.endedBy === "completed" && (session.observations.length !== form.items.length || session.observations.some((entry) => !entry.response))) throw new Error("Incomplete pilot completion");
    let earliest = 0;
    session.observations.forEach((entry, index) => {
      const ref = form.items[index];
      if (entry.itemId !== ref.id || entry.itemRevision !== ref.revision || entry.position !== index + 1) throw new Error("Pilot item order or revision mismatch");
      if (entry.presentedAtMs < earliest || entry.presentedAtMs >= session.elapsedMs || entry.presentedAtMs >= forms.timeLimitSec * 1000) throw new Error("Invalid pilot presentation time");
      if (entry.response === null) {
        if (entry.submittedAtMs !== null || index !== session.observations.length - 1) throw new Error("Unanswered pilot item must be final");
      } else {
        if (entry.submittedAtMs === null || entry.submittedAtMs < entry.presentedAtMs || entry.submittedAtMs > session.elapsedMs || entry.submittedAtMs >= forms.timeLimitSec * 1000) throw new Error("Invalid pilot submission time");
        validateJapaneseResponse(byId.get(entry.itemId)!, entry.response);
        earliest = entry.submittedAtMs;
      }
    });
  }
  return data;
}

const emptyCounts = () => ({ assigned: 0, presented: 0, answered: 0, correct: 0, incorrect: 0, notSure: 0, unanswered: 0, unreached: 0 });
type Counts = ReturnType<typeof emptyCounts>;
const emptyCell = () => ({ ...emptyCounts(), responseMs: 0, responseCount: 0 });
const cells = () => Object.fromEntries(JAPANESE_STUDY_BANDS.map((band) => [band, emptyCell()])) as Record<typeof JAPANESE_STUDY_BANDS[number], ReturnType<typeof emptyCell>>;
function summarizeCell(cell: ReturnType<typeof emptyCell>) {
  const { responseMs, responseCount, ...counts } = cell;
  return { ...counts, correctRate: counts.answered ? counts.correct / counts.answered : null,
    correctIncludingSkipsRate: counts.answered + counts.notSure ? counts.correct / (counts.answered + counts.notSure) : null,
    meanResponseMs: responseCount ? responseMs / responseCount : null };
}
const summarizeCells = (value: ReturnType<typeof cells>) => Object.fromEntries(JAPANESE_STUDY_BANDS.map((band) => [band, summarizeCell(value[band])])) as Record<typeof JAPANESE_STUDY_BANDS[number], ReturnType<typeof summarizeCell>>;

/** Counts only; deliberately produces no fitted parameters, policy or release approvals. */
export function inspectJapanesePilot(bankValue: unknown, formsValue: unknown, dataValue: unknown) {
  const bank = pilotBank(bankValue);
  const forms = parseJapanesePilotForms(bank, formsValue);
  const data = parseJapanesePilotData(bank, forms, dataValue);
  const byId = new Map(bank.items.map((item) => [item.id, item]));
  const rows = new Map(bank.items.map((item) => [item.id, { development: cells(), holdout: cells(),
    optionSelections: item.responseType === "choice" ? Object.fromEntries(item.choices.map((choice) => [choice.id, 0])) : null }]));
  const referenceCounts = { development: Object.fromEntries(JAPANESE_STUDY_BANDS.map((band) => [band, 0])), holdout: Object.fromEntries(JAPANESE_STUDY_BANDS.map((band) => [band, 0])) };
  const totals = emptyCounts();
  const completions = { completed: 0, time_limit: 0, withdrawn: 0 };
  for (const participant of data.participants) {
    referenceCounts[participant.split][participant.reference.band]++;
    completions[participant.session.endedBy]++;
    const form = forms.forms.find((form) => form.id === participant.session.formId)!;
    form.items.forEach((ref, index) => {
      const cell = rows.get(ref.id)![participant.split][participant.reference.band];
      cell.assigned++;
      const observation = participant.session.observations[index];
      if (!observation) { cell.unreached++; return; }
      cell.presented++;
      const response = observation.response;
      if (!response) { cell.unanswered++; return; }
      cell.responseMs += observation.submittedAtMs! - observation.presentedAtMs;
      cell.responseCount++;
      if (response.kind === "skip") cell.notSure++;
      else {
        cell.answered++;
        if (isCorrectJapaneseResponse(byId.get(ref.id)!, response)) cell.correct++; else cell.incorrect++;
        if (response.kind === "answer") rows.get(ref.id)!.optionSelections![response.choiceId]++;
      }
    });
  }
  const items = bank.sequence.map((id) => {
    const item = byId.get(id)!, row = rows.get(id)!;
    const combined = emptyCounts();
    for (const split of [row.development, row.holdout]) for (const cell of Object.values(split)) for (const key of Object.keys(totals) as (keyof Counts)[]) {
      combined[key] += cell[key]; totals[key] += cell[key];
    }
    return { id, revision: item.revision, domain: item.domain, referenceBand: item.referenceBand!, uniformGuessingRate: japaneseUniformGuessingRate(item),
      totals: combined, development: summarizeCells(row.development), holdout: summarizeCells(row.holdout), optionSelections: row.optionSelections };
  });
  return { schemaVersion: 1, status: "descriptive_only", studyId: data.studyId, protocolDigest: data.protocolDigest,
    bankDigest: forms.bankDigest, formsDigest: data.formsDigest, participants: data.participants.length, totals, completions, referenceCounts, items,
    coverage: { missingReferenceBands: JAPANESE_STUDY_BANDS.filter((band) => referenceCounts.development[band] + referenceCounts.holdout[band] === 0),
      missingHoldoutBands: JAPANESE_STUDY_BANDS.filter((band) => referenceCounts.holdout[band] === 0),
      unobservedItems: items.filter((item) => !item.totals.presented).map((item) => item.id),
      unattemptedItems: items.filter((item) => !item.totals.answered).map((item) => item.id) },
    fittedModel: null, publicationReady: false };
}
