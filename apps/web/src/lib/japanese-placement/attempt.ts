import "server-only";
import { z } from "zod";
import { freezeJson } from "../freeze-json";
import {
  bankDigest, loadApprovedJapaneseBank, JAPANESE_PLACEMENT_DOMAINS, JAPANESE_STUDY_BANDS, JAPANESE_REFERENCE_BANDS, JAPANESE_POLICY_REVISION, JAPANESE_GROUPED_POLICY_REVISION, JAPANESE_RUBRIC_POLICY_REVISION, JAPANESE_MAX_QUESTIONS, japanesePolicyRevision, japaneseQuestionLimit, parseJapaneseBank,
  type JapanesePlacementItem,
} from "./bank";

import { answerInput, sentenceInput, skipInput, type JapaneseQuestion, type JapaneseResponseInput } from "./public";
export { japaneseResponseInputSchema, type JapaneseQuestion, type JapaneseResponseInput } from "./public";
import { estimateJapaneseLevel, initialJapaneseEvidence, isCorrectJapaneseResponse, selectJapaneseItem, updateJapaneseEvidence } from "./adaptive";
import { projectJapaneseQuestion, validateJapaneseResponse } from "./question";
import { JAPANESE_STAIRCASE_POLICY_REVISION, JAPANESE_STAIRCASE_SCORING_REVISION, JAPANESE_STAIRCASE_POLICY } from "./staircase-policy";

const text = z.string().trim().min(1);
const timestamp = z.string().datetime();
export const JAPANESE_ATTEMPT_SCHEMA_VERSION = 5;
export const JAPANESE_SUPPORTED_ATTEMPT_SCHEMAS = [3, 4, JAPANESE_ATTEMPT_SCHEMA_VERSION] as const;
export const JAPANESE_SCORING_REVISION = "japanese-reading-writing-rubric-v1";
export function japaneseScoringRevision(schemaVersion: 3 | 4 | 5, policyRevision?: string) {
  if (schemaVersion === 5 && policyRevision === JAPANESE_STAIRCASE_POLICY_REVISION) return JAPANESE_STAIRCASE_SCORING_REVISION;
  return schemaVersion === 3 ? "japanese-reading-writing-posterior-v1" : schemaVersion === 4 ? "japanese-reading-writing-passages-v2" : JAPANESE_SCORING_REVISION;
}
export function supportsJapaneseRuntime(schemaVersion: number, scoringRevision: string, policyRevision?: string | null): boolean {
  return JAPANESE_SUPPORTED_ATTEMPT_SCHEMAS.some((version) => version === schemaVersion &&
    (policyRevision === undefined || policyRevision === japanesePolicyRevision(version) ||
      (version === 5 && policyRevision === JAPANESE_STAIRCASE_POLICY_REVISION)) &&
    japaneseScoringRevision(version, policyRevision ?? undefined) === scoringRevision);
}
export function japaneseAttemptPolicyMatchesBank(bank: ReturnType<typeof parseJapaneseBank>, schemaVersion: number, policyRevision: string | null) {
  return bank.schemaVersion === schemaVersion && (policyRevision === bank.assessment?.revision ||
    (schemaVersion === 5 && bank.assessment?.revision === JAPANESE_RUBRIC_POLICY_REVISION &&
      policyRevision === JAPANESE_STAIRCASE_POLICY_REVISION && japaneseQuestionLimit(bank) === 24 &&
      JAPANESE_REFERENCE_BANDS.every(band => bank.assessment!.supportedBands.includes(band))));
}
const startSchema = z.object({ id: text, learnerId: text, startedAt: timestamp }).strict();
const responseSchema = z.discriminatedUnion("kind", [
  answerInput.extend({ submittedAt: timestamp }), sentenceInput.extend({ submittedAt: timestamp }), skipInput.extend({ submittedAt: timestamp }),
]);
const attemptSchema = startSchema.extend({
  schemaVersion: z.union([z.literal(3), z.literal(4), z.literal(JAPANESE_ATTEMPT_SCHEMA_VERSION)]), bankId: text, bankVersion: z.number().int().positive(),
  expiresAt: timestamp, policyRevision: z.enum([JAPANESE_POLICY_REVISION, JAPANESE_GROUPED_POLICY_REVISION, JAPANESE_RUBRIC_POLICY_REVISION, JAPANESE_STAIRCASE_POLICY_REVISION]),
  bankDigest: z.string().regex(/^[a-f0-9]{64}$/), responses: z.array(responseSchema).max(120),
}).strict().superRefine((attempt, ctx) => {
  if ((attempt.policyRevision !== japanesePolicyRevision(attempt.schemaVersion) &&
    !(attempt.schemaVersion === 5 && attempt.policyRevision === JAPANESE_STAIRCASE_POLICY_REVISION)) ||
    (attempt.schemaVersion >= 4 && attempt.responses.length > JAPANESE_MAX_QUESTIONS)) ctx.addIssue({ code: "custom", message: "Japanese attempt version or response budget mismatch" });
});

export type JapaneseAttempt = z.infer<typeof attemptSchema>;
export type JapaneseResponse = z.infer<typeof responseSchema>;

export const parseStoredJapaneseResponse = (value: unknown): JapaneseResponse => responseSchema.parse(value);
export const parseJapaneseAttempt = (value: unknown): JapaneseAttempt => attemptSchema.parse(value);

function validateResponse(item: JapanesePlacementItem, response: JapaneseResponse, earliest: string): void {
  if (Date.parse(response.submittedAt) < Date.parse(earliest)) throw new Error("Invalid response timestamp");
  validateJapaneseResponse(item, response);
}

type Bank = ReturnType<typeof parseJapaneseBank>;
type Evidence = ReturnType<typeof initialJapaneseEvidence>;
type ContextData = { bank: Bank; attempt: JapaneseAttempt; items: Map<string, JapanesePlacementItem>; earliest: string; evidence: Evidence };
export type JapaneseAttemptContext = {
  readonly attempt: JapaneseAttempt;
  next(now?: string): JapaneseQuestion | null;
  record(input: unknown): JapaneseAttemptContext;
  summarize(now?: string): ReturnType<typeof summarizeContext>;
};

/** Only this immutable bank runtime is shared across requests; learner evidence is request-local. */
export function createJapaneseAttemptRuntime(bankValue: unknown) {
  const bank = freezeJson(parseJapaneseBank(bankValue));
  const digest = bankDigest(bank);
  const items = new Map(bank.items.map(item => [item.id, item]));
  let approved = false;
  function assertApproved() {
    if (!approved) { loadApprovedJapaneseBank(bank); approved = true; }
  }
  function makeContext(attempt: JapaneseAttempt, evidence: Evidence, earliest: string): JapaneseAttemptContext {
    freezeJson(attempt);
    const context: JapaneseAttemptContext = {
      attempt,
      next(now) {
        assertApproved();
        if (now && Date.parse(timestamp.parse(now)) >= Date.parse(attempt.expiresAt)) return null;
        const item = selectJapaneseItem(bank, evidence);
        return item ? projectJapaneseQuestion(item) : null;
      },
      record(input) {
        assertApproved();
        const response = responseSchema.parse(input);
        const previous = attempt.responses.find(entry => entry.itemId === response.itemId);
        if (previous) {
          if (!sameJapaneseResponse(previous, response)) throw new Error("Japanese response already recorded with a different answer");
          return context;
        }
        if (Date.parse(response.submittedAt) >= Date.parse(attempt.expiresAt)) throw new Error("Japanese attempt expired");
        if (response.itemId !== selectJapaneseItem(bank, evidence)?.id) throw new Error("Expected the current Japanese item");
        const item = items.get(response.itemId)!;
        validateResponse(item, response, earliest);
        const nextEvidence = structuredClone(evidence);
        updateJapaneseEvidence(nextEvidence, item, response);
        return makeContext({ ...attempt, responses: [...attempt.responses, response] }, nextEvidence, response.submittedAt);
      },
      summarize(now) { return summarizeContext({ bank, attempt, items, earliest, evidence }, now); },
    };
    return context;
  }
  return {
    bank, digest, assertApproved,
    /** Callers supply server-generated identity and time after authorizing the Japanese learner. */
    start(input: unknown, policyRevision?: typeof JAPANESE_STAIRCASE_POLICY_REVISION): JapaneseAttempt {
      assertApproved();
      const start = startSchema.parse(input);
      if (policyRevision && !japaneseAttemptPolicyMatchesBank(bank, bank.schemaVersion, policyRevision)) throw new Error("Japanese policy mismatch");
      return freezeJson(parseJapaneseAttempt({
        ...start, expiresAt: new Date(Date.parse(start.startedAt) + bank.assessment!.timeLimitSec * 1000).toISOString(),
        policyRevision: policyRevision ?? bank.assessment!.revision, schemaVersion: bank.schemaVersion,
        bankId: bank.id, bankVersion: bank.version, bankDigest: digest, responses: [],
      }));
    },
    /** Input must come from trusted persistence, never from a learner's request body. Replay once per request. */
    context(attemptValue: unknown): JapaneseAttemptContext {
      const attempt = parseJapaneseAttempt(attemptValue);
      if (attempt.schemaVersion !== bank.schemaVersion || attempt.bankId !== bank.id || attempt.bankVersion !== bank.version || attempt.bankDigest !== digest) {
        throw new Error("Japanese attempt bank snapshot mismatch");
      }
      if (!bank.assessment || !japaneseAttemptPolicyMatchesBank(bank, attempt.schemaVersion, attempt.policyRevision)) throw new Error("Japanese policy mismatch");
      if (Date.parse(attempt.expiresAt) !== Date.parse(attempt.startedAt) + bank.assessment.timeLimitSec * 1000) throw new Error("Japanese deadline mismatch");
      if (attempt.responses.length > japaneseQuestionLimit(bank)) throw new Error("Too many Japanese responses");
      const evidence = initialJapaneseEvidence(attempt.policyRevision);
      let earliest = attempt.startedAt;
      for (const response of attempt.responses) {
        if (response.itemId !== selectJapaneseItem(bank, evidence)?.id) throw new Error("Stored Japanese responses are out of order");
        validateResponse(items.get(response.itemId)!, response, earliest);
        if (Date.parse(response.submittedAt) >= Date.parse(attempt.expiresAt)) throw new Error("Stored Japanese response expired");
        updateJapaneseEvidence(evidence, items.get(response.itemId)!, response);
        earliest = response.submittedAt;
      }
      return makeContext(attempt, evidence, earliest);
    },
  };
}

export function startJapaneseAttempt(bankValue: unknown, input: unknown, policyRevision?: typeof JAPANESE_STAIRCASE_POLICY_REVISION): JapaneseAttempt {
  return createJapaneseAttemptRuntime(bankValue).start(input, policyRevision);
}

/** Explicit projection: keys, accepted orders, explanations and content reviews stay on the server. */
export function nextJapaneseQuestion(bankValue: unknown, attemptValue: unknown, now?: string): JapaneseQuestion | null {
  return createJapaneseAttemptRuntime(bankValue).context(attemptValue).next(now);
}

/** A repository transaction must serialize concurrent submissions of this pure transition. */
export function recordJapaneseResponse(bankValue: unknown, attemptValue: unknown, input: unknown): JapaneseAttempt {
  return createJapaneseAttemptRuntime(bankValue).context(attemptValue).record(input).attempt;
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
  return createJapaneseAttemptRuntime(bankValue).context(attemptValue).summarize(now);
}

function summarizeContext({ bank, attempt, items, earliest, evidence }: ContextData, now?: string) {
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
  let levelEstimate = estimateJapaneseLevel(bank, evidence, attempt.responses);
  let timeoutAdjustment;
  if (!complete && attempt.policyRevision === JAPANESE_STAIRCASE_POLICY_REVISION && levelEstimate.status === "estimated") {
    const unadjustedBand = levelEstimate.band!;
    const rank = JAPANESE_STUDY_BANDS.indexOf(unadjustedBand);
    const unanswered = total - attempt.responses.length;
    const penaltyBandFraction = JAPANESE_STAIRCASE_POLICY.maximumTimeoutBandFraction *
      Math.min(1, unanswered / (total - bank.assessment!.minimumAnswers));
    // Slowness alone cannot establish below-N5; that label requires the existing basic-task evidence.
    const adjustedRank = rank === 0 ? 0 : Math.max(1, Math.floor(rank - penaltyBandFraction));
    levelEstimate = { ...levelEstimate, band: JAPANESE_STUDY_BANDS[adjustedRank] };
    timeoutAdjustment = { unadjustedBand, unanswered, penaltyBandFraction, bandReduction: rank - adjustedRank };
  }
  return {
    attemptId: attempt.id, bankId: bank.id, bankVersion: bank.version, bankDigest: attempt.bankDigest,
    scoringRevision: japaneseScoringRevision(bank.schemaVersion, attempt.policyRevision),
    policyRevision: attempt.policyRevision, expiresAt: attempt.expiresAt,
    startedAt: attempt.startedAt, completedAt: complete ? earliest : attempt.expiresAt,
    completionReason: complete ? "question_limit" as const : "time_limit" as const,
    responded: attempt.responses.length, answered: attempt.responses.filter((entry) => entry.kind !== "skip").length, total, domains,
    levelEstimate,
    ...(timeoutAdjustment ? { timeoutAdjustment } : {}),
  };
}
