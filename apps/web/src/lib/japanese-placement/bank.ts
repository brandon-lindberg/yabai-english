import { canonicalJson } from "../canonical-json";
import "server-only";
import { requireUnique } from "../unique";
export { requireUnique } from "../unique";
import { createHash } from "node:crypto";
import { z } from "zod";

import { JAPANESE_PLACEMENT_DOMAINS, JAPANESE_REFERENCE_BANDS, japaneseLocalizedText, japaneseTextStimulus, japaneseOption, type JapanesePlacementDomain } from "./public";
export { JAPANESE_PLACEMENT_DOMAINS, JAPANESE_REFERENCE_BANDS, JAPANESE_STUDY_BANDS, type JapanesePlacementDomain } from "./public";
export const JAPANESE_POLICY_REVISION = "japanese-posterior-v1";
export const JAPANESE_GROUPED_POLICY_REVISION = "japanese-posterior-passages-v2";
export const JAPANESE_RUBRIC_POLICY_REVISION = "japanese-jlpt-rubric-v1";
export const JAPANESE_BANK_ITEM_LIMIT = 1000;
export const JAPANESE_MAX_QUESTIONS = 60;
export function japanesePolicyRevision(schemaVersion: 3 | 4 | 5) {
  return schemaVersion === 3 ? JAPANESE_POLICY_REVISION : schemaVersion === 4 ? JAPANESE_GROUPED_POLICY_REVISION : JAPANESE_RUBRIC_POLICY_REVISION;
}
const assessmentSchema = z.object({
  revision: z.enum([JAPANESE_POLICY_REVISION, JAPANESE_GROUPED_POLICY_REVISION, JAPANESE_RUBRIC_POLICY_REVISION]), timeLimitSec: z.literal(1200),
  quotas: z.object(Object.fromEntries(JAPANESE_PLACEMENT_DOMAINS.map((domain) => [domain, z.number().int().min(1).max(10)])) as Record<JapanesePlacementDomain, z.ZodNumber>).strict(),
  supportedBands: z.array(z.enum(JAPANESE_REFERENCE_BANDS)).min(1).max(5),
  minimumAnswers: z.number().int().min(6).max(JAPANESE_MAX_QUESTIONS), minimumDomains: z.number().int().min(1).max(6),
  referenceSources: z.array(z.string().url()).min(1).max(10).optional(),
}).strict();

const text = z.string().trim().min(1);
const identity = text.regex(/^[a-z][a-z0-9._-]*$/i);
const digest = z.string().regex(/^[a-f0-9]{64}$/);
const localizedText = japaneseLocalizedText;
const review = z.object({
  reviewerId: text, reviewedAt: z.string().datetime(), bankDigest: digest, evidence: text,
}).strict().nullable();
const ownerRelease = z.object({
  kind: z.literal("owner_authorized_ai_assisted"), authorizedBy: text,
  authorizedOn: z.string().date(), authorization: text, bankDigest: digest,
  checks: z.object({ content: text, rights: text, policy: text }).strict(),
  notices: z.object({ path: z.string().regex(/^\/japanese-placement\/v[1-9][0-9]*\/NOTICE\.txt$/), sha256: digest }).strict(),
}).strict();

const itemBase = z.object({
  id: identity,
  revision: z.number().int().positive(),
  domain: z.enum(JAPANESE_PLACEMENT_DOMAINS),
  focus: text,
  prompt: localizedText,
  stimulus: japaneseTextStimulus,
  explanation: localizedText,
  sourceIds: z.array(identity).min(1),
  // Authoring provenance is independent of empirically calibrated difficulty.
  referenceBand: z.enum(JAPANESE_REFERENCE_BANDS).optional(),
  passageId: identity.optional(),
  placementRole: z.enum(["anchor", "support"]).optional(),
  placementRationale: text.optional(),
  // Six ordered response probabilities: below N5, N5, N4, N3, N2, N1.
  // Required for legacy posterior policies; v5 explicitly forbids likelihoods.
  calibration: z.object({ band: z.enum(JAPANESE_REFERENCE_BANDS), probabilities: z.array(z.number().min(0.001).max(0.999)).length(6) }).strict().nullable(),
}).strict();

const itemSchema = z.discriminatedUnion("responseType", [
  itemBase.extend({
    responseType: z.literal("choice"),
    choices: z.array(japaneseOption).min(2).max(6),
    correctChoiceId: identity,
  }).strict(),
  itemBase.extend({
    responseType: z.literal("sentence_assembly"),
    tiles: z.array(japaneseOption).min(2).max(30),
    acceptedOrders: z.array(z.array(identity).min(2).max(30)).min(1).max(24),
  }).strict(),
]);

export const japaneseBankSourceSchema = z.object({
  id: identity, origin: z.enum(["original", "adapted"]), title: text,
  location: text, revision: text, license: text, attribution: text,
  permissionEvidence: text,
}).strict();

const bankSchema = z.object({
  schemaVersion: z.union([z.literal(3), z.literal(4), z.literal(5)]), id: identity, version: z.number().int().positive(),
  assessment: assessmentSchema.nullable(),
  sources: z.array(japaneseBankSourceSchema).min(1),
  items: z.array(itemSchema).min(6).max(JAPANESE_BANK_ITEM_LIMIT),
  sequence: z.array(identity).min(6).max(JAPANESE_BANK_ITEM_LIMIT),
  reviews: z.object({ japaneseTeacher: review, rights: review, placement: review }).strict(),
  ownerRelease: ownerRelease.optional(),
}).strict();

export type JapanesePlacementBank = z.infer<typeof bankSchema>;
export type JapanesePlacementItem = z.infer<typeof itemSchema>;
export type JapaneseSentenceItem = Extract<JapanesePlacementItem, { responseType: "sentence_assembly" }>;

export function normalizedJapaneseContent(value: string): string {
  return value.normalize("NFC").trim().replace(/\s+/g, " ");
}
const normalized = normalizedJapaneseContent;

/** Each supplied tile is used once. Identical particles remain interchangeable by text. */
export function sentenceOrderSignature(item: JapaneseSentenceItem, tileIds: string[]): string {
  requireUnique(tileIds, "sentence tile");
  const tiles = new Map(item.tiles.map((tile) => [tile.id, tile.text]));
  if (tileIds.length !== item.tiles.length || tileIds.some((id) => !tiles.has(id))) {
    throw new Error(`Invalid sentence tile set: ${item.id}`);
  }
  return JSON.stringify(tileIds.map((id) => normalized(tiles.get(id)!)));
}

export { canonicalJson } from "../canonical-json";

/** Validates authored data only; validation never constitutes content approval. */
export function parseJapaneseBank(value: unknown): JapanesePlacementBank {
  const bank = bankSchema.parse(value);
  if (bank.ownerRelease && bank.schemaVersion !== 5) throw new Error("Owner-authorized releases require the Japanese rubric policy");
  if (bank.ownerRelease && bank.ownerRelease.notices.path !== `/japanese-placement/v${bank.version}/NOTICE.txt`) throw new Error("Release notices version mismatch");
  for (const item of bank.items) {
    if (bank.schemaVersion === 5) {
      if (item.calibration !== null) throw new Error("Rubric policy cannot contain fitted or invented likelihoods");
      if (!item.placementRole) throw new Error(`Rubric placement role required: ${item.id}`);
      if (item.placementRole === "anchor" && !item.placementRationale) throw new Error(`Rubric anchor rationale required: ${item.id}`);
      if (item.placementRole === "anchor" && (!["reading", "writing"].includes(item.domain)
        || (item.responseType === "sentence_assembly" && japaneseUniformGuessingRate(item) > 0.25))) throw new Error(`Invalid or weak rubric anchor: ${item.id}`);
    } else if (item.placementRole !== undefined || item.placementRationale !== undefined) throw new Error("Legacy Japanese policy cannot contain rubric roles");
  }
  if (bank.schemaVersion === 3) {
    if (bank.items.length > 120 || bank.items.some((item) => item.referenceBand !== undefined || item.passageId !== undefined)) throw new Error("Legacy Japanese bank contract mismatch");
  } else {
    const passages = new Map<string, string>();
    const texts = new Map<string, string>();
    for (const item of bank.items) {
      if (!item.referenceBand || (item.domain === "kana" && item.referenceBand !== "N5")) throw new Error(`Japanese reference band required: ${item.id}`);
      if (item.domain !== "reading") continue;
      if (!item.passageId) throw new Error(`Reading passage identity required: ${item.id}`);
      const content = canonicalJson({ text: normalized(item.stimulus.text), band: item.referenceBand, sourceIds: [...item.sourceIds].sort() });
      if (passages.has(item.passageId) && passages.get(item.passageId) !== content) throw new Error(`Conflicting Japanese passage: ${item.passageId}`);
      const text = normalized(item.stimulus.text);
      if (texts.has(text) && texts.get(text) !== item.passageId) throw new Error("Same Japanese passage has different identities");
      passages.set(item.passageId, content);
      texts.set(text, item.passageId);
    }
  }
  requireUnique(bank.items.map((item) => item.id), "item identity");
  requireUnique(bank.sources.map((source) => source.id), "source identity");
  requireUnique(bank.sequence, "sequence item");
  if (bank.assessment) {
    if (bank.assessment.revision !== japanesePolicyRevision(bank.schemaVersion)) throw new Error("Japanese bank policy version mismatch");
    requireUnique(bank.assessment.supportedBands, "supported band");
    if (bank.schemaVersion === 5 && !bank.assessment.referenceSources?.length) throw new Error("Rubric source references required");
    if (bank.schemaVersion !== 5 && bank.assessment.referenceSources !== undefined) throw new Error("Legacy Japanese policy cannot contain rubric references");
    if (bank.assessment.minimumAnswers > japaneseQuestionLimit(bank)) throw new Error("Minimum evidence exceeds question budget");
    if (bank.schemaVersion === 5 && (bank.assessment.minimumAnswers < 12 || bank.assessment.minimumDomains < 4
      || bank.assessment.quotas.reading < 2 || bank.assessment.quotas.writing < 1)) throw new Error("Rubric minimum evidence is too small");
  }
  const itemIds = new Set(bank.items.map((item) => item.id));
  if (bank.sequence.length !== bank.items.length || bank.sequence.some((id) => !itemIds.has(id))) {
    throw new Error("Sequence must account for every bank item exactly once");
  }
  for (const domain of JAPANESE_PLACEMENT_DOMAINS) {
    if (!bank.items.some((item) => item.domain === domain)) throw new Error(`Missing domain: ${domain}`);
  }
  parseJapaneseItems(bank.items, bank.sources.map((source) => source.id));
  return bank;
}

/** Shared item validation for partial authoring packs and complete assessment banks. */
export function parseJapaneseItems(value: unknown, knownSourceIds: string[]): JapanesePlacementItem[] {
  const items = z.array(itemSchema).min(1).parse(value);
  requireUnique(items.map((item) => item.id), "item identity");
  const sourceIds = new Set(knownSourceIds);
  for (const item of items) {
    if (item.passageId && item.domain !== "reading") throw new Error(`Passage identity is only valid for reading: ${item.id}`);
    if (item.calibration) {
      const probabilities = item.calibration.probabilities;
      if (probabilities.some((value, index) => index > 0 && value < probabilities[index - 1]) || probabilities[0] >= probabilities[5]) {
        throw new Error(`Invalid ordered Japanese calibration: ${item.id}`);
      }
      if (item.domain === "kana" && (item.calibration.band !== "N5" || probabilities.slice(1).some((value) => value !== probabilities[1]))) {
        throw new Error("Kana evidence must not distinguish advanced Japanese bands");
      }
    }
    requireUnique(item.sourceIds, "item source");
    if (item.sourceIds.some((id) => !sourceIds.has(id))) throw new Error(`Unknown text source: ${item.id}`);
    if ((item.domain === "writing") !== (item.responseType === "sentence_assembly")) throw new Error(`Invalid response type for ${item.domain}`);
    if (item.responseType === "choice") {
      requireUnique(item.choices.map((choice) => choice.id), "choice identity");
      requireUnique(item.choices.map((choice) => normalized(choice.text)), "normalized choice");
      if (!item.choices.some((choice) => choice.id === item.correctChoiceId)) throw new Error(`Missing answer key: ${item.id}`);
    } else {
      requireUnique(item.tiles.map((tile) => tile.id), "tile identity");
      requireUnique(item.acceptedOrders.map((order) => sentenceOrderSignature(item, order)), "accepted sentence");
    }
  }
  // Compare exercise content, not ids or purported difficulty, to catch relabelled copies.
  requireUnique(items.map((item) => canonicalJson({
    prompt: { en: normalized(item.prompt.en), ja: normalized(item.prompt.ja) },
    stimulus: normalized(item.stimulus.text),
    options: (item.responseType === "choice" ? item.choices : item.tiles).map((option) => normalized(option.text)).sort(),
  })), "exercise");
  return items;
}

/** Content reviews attest to text, keys, accepted sentence orders and provenance. */
export function bankDigest(value: unknown): string {
  const { reviews: _reviews, ownerRelease: _release, ...content } = parseJapaneseBank(value);
  void _reviews;
  void _release;
  return createHash("sha256").update(canonicalJson(content)).digest("hex");
}

export function inspectBankReadiness(value: unknown): { ready: boolean; issues: string[] } {
  const bank = parseJapaneseBank(value);
  const hash = bankDigest(bank);
  const issues: string[] = [];
  if (bank.ownerRelease && bank.ownerRelease.bankDigest !== hash) issues.push("owner-release-stale");
  for (const [key, label] of [["japaneseTeacher", "japanese-teacher"], ["rights", "rights"], ["placement", "placement"]] as const) {
    const approval = bank.reviews[key];
    if (!approval && !bank.ownerRelease) issues.push(`${label}-review-required`);
    else if (approval && approval.bankDigest !== hash) issues.push(`${label}-review-stale`);
  }
  if (bank.schemaVersion === 5) {
    if (!bank.assessment) issues.push("assessment-policy-required");
  } else if (!bank.assessment || bank.items.some((item) => !item.calibration)) issues.push("assessment-calibration-required");
  if (bank.assessment) {
    for (const domain of JAPANESE_PLACEMENT_DOMAINS) {
      const pool = bank.items.filter((item) => item.domain === domain && (bank.schemaVersion !== 5 || !["reading", "writing"].includes(domain) || item.placementRole === "anchor"));
      if (new Set(pool.map(japaneseEvidenceKey)).size < bank.assessment.quotas[domain]) issues.push(`insufficient-pool:${domain}`);
      if (domain !== "kana") for (const band of bank.assessment.supportedBands) {
        if (bank.schemaVersion === 5) {
          if (new Set(pool.filter((item) => item.referenceBand === band).map(japaneseEvidenceKey)).size < bank.assessment.quotas[domain]) issues.push(`insufficient-anchors:${domain}:${band}`);
        } else if (!pool.some((item) => item.calibration?.band === band)) issues.push(`missing-anchor:${domain}:${band}`);
      }
    }
  }
  return { ready: issues.length === 0, issues };
}

export function japaneseQuestionLimit(bank: JapanesePlacementBank): number {
  if (!bank.assessment) throw new Error("Japanese assessment policy required");
  return Object.values(bank.assessment.quotas).reduce((sum, count) => sum + count, 0);
}

/** One reading question per passage; other items supply their own independent unit. */
export function japaneseEvidenceKey(item: JapanesePlacementItem): string {
  return item.passageId ? `passage:${item.passageId}` : `item:${item.id}`;
}

/** Nominal uniform guessing, not a fitted response probability. Identical visible tiles are interchangeable. */
export function japaneseUniformGuessingRate(item: JapanesePlacementItem): number {
  if (item.responseType === "choice") return 1 / item.choices.length;
  const factorial = (n: number): number => n <= 1 ? 1 : n * factorial(n - 1);
  const frequencies = new Map<string, number>();
  for (const tile of item.tiles) { const text = normalized(tile.text); frequencies.set(text, (frequencies.get(text) ?? 0) + 1); }
  const permutations = factorial(item.tiles.length) / [...frequencies.values()].reduce((product, n) => product * factorial(n), 1);
  return item.acceptedOrders.length / permutations;
}

export function loadApprovedJapaneseBank(value: unknown): JapanesePlacementBank {
  const bank = parseJapaneseBank(value);
  const readiness = inspectBankReadiness(bank);
  if (!readiness.ready) throw new Error(`Japanese bank is not ready: ${readiness.issues.join(", ")}`);
  return bank;
}
