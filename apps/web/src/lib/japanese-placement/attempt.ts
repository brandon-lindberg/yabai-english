import "server-only";
import { z } from "zod";
import {
  bankDigest, loadApprovedJapaneseBank, JAPANESE_PLACEMENT_DOMAINS, JAPANESE_POLICY_REVISION, japaneseQuestionLimit, parseJapaneseBank, sentenceOrderSignature,
  type JapanesePlacementItem,
} from "./bank";

import { answerInput, sentenceInput, skipInput, type JapaneseQuestion, type JapaneseResponseInput } from "./public";
export { japaneseResponseInputSchema, type JapaneseQuestion, type JapaneseResponseInput } from "./public";
import { estimateJapaneseLevel, initialJapaneseEvidence, isCorrectJapaneseResponse, selectJapaneseItem, updateJapaneseEvidence } from "./adaptive";

const text = z.string().trim().min(1);
const timestamp = z.string().datetime();
export const JAPANESE_ATTEMPT_SCHEMA_VERSION = 3;
export const JAPANESE_SCORING_REVISION = "japanese-reading-writing-posterior-v1";
const startSchema = z.object({ id: text, learnerId: text, startedAt: timestamp }).strict();
const responseSchema = z.discriminatedUnion("kind", [
  answerInput.extend({ submittedAt: timestamp }), sentenceInput.extend({ submittedAt: timestamp }), skipInput.extend({ submittedAt: timestamp }),
]);
const attemptSchema = startSchema.extend({
  schemaVersion: z.literal(JAPANESE_ATTEMPT_SCHEMA_VERSION), bankId: text, bankVersion: z.number().int().positive(),
  expiresAt: timestamp, policyRevision: z.literal(JAPANESE_POLICY_REVISION),
  bankDigest: z.string().regex(/^[a-f0-9]{64}$/), responses: z.array(responseSchema).max(120),
}).strict();

export type JapaneseAttempt = z.infer<typeof attemptSchema>;
export type JapaneseResponse = z.infer<typeof responseSchema>;

export const parseStoredJapaneseResponse = (value: unknown): JapaneseResponse => responseSchema.parse(value);
export const parseJapaneseAttempt = (value: unknown): JapaneseAttempt => attemptSchema.parse(value);

function validateResponse(item: JapanesePlacementItem, response: JapaneseResponse, earliest: string): void {
  if (Date.parse(response.submittedAt) < Date.parse(earliest)) throw new Error("Invalid response timestamp");
  if (response.kind === "answer") {
    if (item.responseType !== "choice") throw new Error("Invalid response type for sentence assembly");
    if (!item.choices.some((choice) => choice.id === response.choiceId)) throw new Error("Unknown choice for the current Japanese item");
  }
  if (response.kind === "sentence_assembly") {
    if (item.responseType !== "sentence_assembly") throw new Error("Invalid response type for a choice question");
    sentenceOrderSignature(item, response.tileIds);
  }
}

/** Input must come from trusted server persistence, never from a learner's request body. */
function context(bankValue: unknown, attemptValue: unknown) {
  const bank = parseJapaneseBank(bankValue);
  const attempt = parseJapaneseAttempt(attemptValue);
  if (attempt.bankId !== bank.id || attempt.bankVersion !== bank.version || attempt.bankDigest !== bankDigest(bank)) {
    throw new Error("Japanese attempt bank snapshot mismatch");
  }
  if (!bank.assessment || attempt.policyRevision !== bank.assessment.revision) throw new Error("Japanese policy mismatch");
  if (Date.parse(attempt.expiresAt) !== Date.parse(attempt.startedAt) + bank.assessment.timeLimitSec * 1000) throw new Error("Japanese deadline mismatch");
  if (attempt.responses.length > japaneseQuestionLimit(bank)) throw new Error("Too many Japanese responses");
  const evidence = initialJapaneseEvidence();
  const items = new Map(bank.items.map((item) => [item.id, item]));
  let earliest = attempt.startedAt;
  attempt.responses.forEach((response) => {
    if (response.itemId !== selectJapaneseItem(bank, evidence)?.id) throw new Error("Stored Japanese responses are out of order");
    validateResponse(items.get(response.itemId)!, response, earliest);
    if (Date.parse(response.submittedAt) >= Date.parse(attempt.expiresAt)) throw new Error("Stored Japanese response expired");
    updateJapaneseEvidence(evidence, items.get(response.itemId)!, response);
    earliest = response.submittedAt;
  });
  return { bank, attempt, items, earliest, evidence };
}

/** Callers supply server-generated identity and time after authorizing the Japanese learner. */
export function startJapaneseAttempt(bankValue: unknown, input: unknown): JapaneseAttempt {
  const bank = loadApprovedJapaneseBank(bankValue);
  const start = startSchema.parse(input);
  return {
    ...start, expiresAt: new Date(Date.parse(start.startedAt) + bank.assessment!.timeLimitSec * 1000).toISOString(),
    policyRevision: bank.assessment!.revision, schemaVersion: JAPANESE_ATTEMPT_SCHEMA_VERSION,
    bankId: bank.id, bankVersion: bank.version, bankDigest: bankDigest(bank), responses: [],
  };
}

/** Explicit projection: keys, accepted orders, explanations and content reviews stay on the server. */
export function nextJapaneseQuestion(bankValue: unknown, attemptValue: unknown, now?: string): JapaneseQuestion | null {
  const { bank, attempt, evidence } = context(bankValue, attemptValue);
  loadApprovedJapaneseBank(bank);
  if (now && Date.parse(timestamp.parse(now)) >= Date.parse(attempt.expiresAt)) return null;
  const item = selectJapaneseItem(bank, evidence);
  if (!item) return null;
  return {
    id: item.id, domain: item.domain, prompt: { ...item.prompt },
    stimulus: { ...item.stimulus },
    response: item.responseType === "choice"
      ? { kind: "choice", choices: item.choices.map((choice) => ({ ...choice })) }
      : { kind: "sentence_assembly", tiles: item.tiles.map((tile) => ({ ...tile })) },
  };
}

/** A repository transaction must serialize concurrent submissions of this pure transition. */
export function recordJapaneseResponse(bankValue: unknown, attemptValue: unknown, input: unknown): JapaneseAttempt {
  const { bank, attempt, items, earliest, evidence } = context(bankValue, attemptValue);
  loadApprovedJapaneseBank(bank);
  const response = responseSchema.parse(input);
  const previous = attempt.responses.find((entry) => entry.itemId === response.itemId);
  if (previous) {
    if (!sameJapaneseResponse(previous, response)) throw new Error("Japanese response already recorded with a different answer");
    return attempt;
  }
  if (Date.parse(response.submittedAt) >= Date.parse(attempt.expiresAt)) throw new Error("Japanese attempt expired");
  if (response.itemId !== selectJapaneseItem(bank, evidence)?.id) throw new Error("Expected the current Japanese item");
  validateResponse(items.get(response.itemId)!, response, earliest);
  return { ...attempt, responses: [...attempt.responses, response] };
}

export function sameJapaneseResponse(previous: JapaneseResponseInput, response: JapaneseResponseInput): boolean {
  if (previous.itemId !== response.itemId) return false;
  if (previous.kind === "answer" && response.kind === "answer") return previous.choiceId === response.choiceId;
  if (previous.kind === "sentence_assembly" && response.kind === "sentence_assembly") {
    return previous.tileIds.length === response.tileIds.length && previous.tileIds.every((id, index) => id === response.tileIds[index]);
  }
  return previous.kind === "skip" && response.kind === "skip" && previous.reason === response.reason;
}

/** Completion and expiry produce a provisional study estimate, never an official JLPT score. */
export function summarizeJapaneseAttempt(bankValue: unknown, attemptValue: unknown, now?: string) {
  const { bank, attempt, items, earliest, evidence } = context(bankValue, attemptValue);
  const total = japaneseQuestionLimit(bank);
  const complete = attempt.responses.length === total;
  const at = now ? timestamp.parse(now) : earliest;
  if (!complete && Date.parse(at) < Date.parse(attempt.expiresAt)) throw new Error("Japanese attempt is incomplete");
  const domains = JAPANESE_PLACEMENT_DOMAINS.map((domain) => {
    const responses = attempt.responses.filter((response) => items.get(response.itemId)!.domain === domain);
    const answered = responses.filter((response) => response.kind !== "skip").length;
    const correct = responses.filter((response) => isCorrectJapaneseResponse(items.get(response.itemId)!, response)).length;
    const notSure = responses.filter((response) => response.kind === "skip" && response.reason === "not_sure").length;
    return {
      domain, planned: bank.assessment!.quotas[domain], answered, correct, incorrect: answered - correct, notSure,
      unanswered: bank.assessment!.quotas[domain] - responses.length,
      observation: answered === 0 ? "not_assessed" as const : answered < bank.assessment!.quotas[domain] ? "limited" as const : "observed" as const,
    };
  });
  return {
    attemptId: attempt.id, bankId: bank.id, bankVersion: bank.version, bankDigest: attempt.bankDigest,
    scoringRevision: JAPANESE_SCORING_REVISION,
    policyRevision: attempt.policyRevision, expiresAt: attempt.expiresAt,
    startedAt: attempt.startedAt, completedAt: complete ? earliest : attempt.expiresAt,
    completionReason: complete ? "question_limit" as const : "time_limit" as const,
    responded: attempt.responses.length, answered: attempt.responses.filter((entry) => entry.kind !== "skip").length, total, domains,
    levelEstimate: estimateJapaneseLevel(bank, evidence, attempt.responses),
  };
}
