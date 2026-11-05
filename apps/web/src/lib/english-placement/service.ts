import "server-only";
import { learningLanguageForRequest } from "../learning-site-request";
import { randomUUID } from "node:crypto";
import { z } from "zod";
import { Prisma, type PrismaClient } from "@/generated/prisma/client";
import { isLoginAllowedForAccountStatus } from "../account-status";
import { PrivateApiFailure } from "../private-api-error";
import { lockLearnerTransaction } from "../learner-transaction-lock";
import { placementBankDigest } from "../placement-bank/placement-bank-digest";
import { placementBankFileSchema } from "../placement-bank/schema";
import type { LoadedPlacementQuestion } from "../placement-bank/load-placement-bank";
import { applyAdaptiveAnswer, buildInitialAdaptiveState, chooseNextAdaptiveQuestion, ENGLISH_STAIRCASE_ROUTING_REVISION, type PlacementAdaptiveState } from "../placement-adaptive";
import { ENGLISH_PLACEMENT_POLICY_V2 as policy, englishPlacementEvidence } from "../placement-policy";
import { isPlacementRetakeAllowed, placementRetakeEligibleAt } from "../placement-cooldown";
import { scorePlacementAnswers } from "../placement-test";
import type { EnglishPlacementActive, EnglishPlacementReply } from "./public";

export class EnglishPlacementFailure extends PrivateApiFailure {
  constructor(status: number, code: string, public details: Record<string, unknown> = {}) { super(status, code); }
}
const include = { bankSnapshot: true } as const;
type Row = Prisma.EnglishPlacementAttemptGetPayload<{ include: typeof include }>;
type Tx = Prisma.TransactionClient;
export type EnglishPlacementState = {
  currentQuestionId: string | null;
  asked: Array<{ id: string; answer: number; acceptedAt: number }>;
  adaptiveState: PlacementAdaptiveState;
};
type Operation = { body: EnglishPlacementReply; recentIds?: string[] };
const json = (value: unknown) => JSON.parse(JSON.stringify(value)) as Prisma.InputJsonValue;

export function parseEnglishAttemptHandle(value: string) {
  if (!/^[0-9a-f-]{36}:\d{1,2}$/.test(value)) return null;
  const [id, revisionText] = value.split(":");
  const revision = Number(revisionText);
  return z.string().uuid().safeParse(id).success && revision <= policy.maxQuestions ? { id: id!, revision } : null;
}

async function transaction<T>(db: PrismaClient, userId: string, run: (tx: Tx, now: number) => Promise<T>) {
  return db.$transaction(async tx => {
    await lockLearnerTransaction(tx, "english-placement", userId);
    const actor = await tx.user.findUnique({ where: { id: userId }, select: { role: true, accountStatus: true, learningLanguage: true } });
    if (!actor) throw new EnglishPlacementFailure(401, "Unauthorized");
    if (!isLoginAllowedForAccountStatus(actor.accountStatus) || actor.role !== "STUDENT" || await learningLanguageForRequest(actor.learningLanguage) !== "ENGLISH") throw new EnglishPlacementFailure(403, "English students only");
    return run(tx, Date.now());
  }, { maxWait: 10_000, timeout: 15_000 });
}

function supported(row: Row) {
  return row.schemaVersion === 1 && row.scoringVersion === policy.version && row.routingRevision === ENGLISH_STAIRCASE_ROUTING_REVISION;
}
function state(row: Row) {
  const value = row.state as unknown as EnglishPlacementState;
  if (!value || !Array.isArray(value.asked) || value.asked.length !== row.revision || !value.adaptiveState?.staircase
    || value.adaptiveState.maxQuestions !== policy.maxQuestions || value.adaptiveState.perSectionMax !== policy.perSectionMax
    || JSON.stringify(value.asked.map(answer => answer.id)) !== JSON.stringify(value.adaptiveState.askedQuestionIds)
    || value.asked.some(answer => !Number.isInteger(answer.answer) || answer.answer < 0 || answer.answer > 2
      || !Number.isFinite(answer.acceptedAt) || answer.acceptedAt < row.startedAt.getTime() || answer.acceptedAt >= row.expiresAt.getTime())) {
    throw new EnglishPlacementFailure(500, "attempt_unavailable");
  }
  return value;
}
function bank(row: Row) {
  const parsed = z.array(placementBankFileSchema.extend({ stemId: z.string().min(1) })).safeParse(row.bankSnapshot.content);
  if (!parsed.success || placementBankDigest(parsed.data) !== row.bankSnapshot.digest) throw new EnglishPlacementFailure(500, "attempt_unavailable");
  return parsed.data;
}
function view(row: Row, now: number): EnglishPlacementActive {
  const current = state(row);
  const question = current.currentQuestionId ? bank(row).find(q => q.id === current.currentQuestionId) : null;
  if (current.currentQuestionId && !question) throw new EnglishPlacementFailure(500, "attempt_unavailable");
  const { correctIndex, stemId, ...publicQuestion } = question ?? {};
  void correctIndex; void stemId;
  return {
    attemptToken: `${row.id}:${row.revision}`, question: question ? publicQuestion as EnglishPlacementActive["question"] : null,
    objectiveComplete: !question, expiresAt: row.expiresAt.getTime(), serverNow: now,
    timeLimitSec: policy.timeLimitSec, minimumAnswers: policy.minimumAnswers,
    progress: { current: row.revision + (question ? 1 : 0), total: policy.maxQuestions },
  };
}
function receipt(row: Row): Operation {
  if (!row.result) throw new EnglishPlacementFailure(500, "attempt_unavailable");
  return { body: row.result as unknown as EnglishPlacementReply };
}

async function finalize(tx: Tx, row: Row, now: number): Promise<Operation> {
  if (row.status !== "IN_PROGRESS") return receipt(row);
  if (!supported(row)) {
    const body = { status: "inconclusive", reason: "attempt_unavailable", answered: row.revision, required: policy.minimumAnswers } as const;
    await tx.englishPlacementAttempt.update({ where: { id: row.id }, data: { status: "ABANDONED", activeLearnerId: null, finishedAt: new Date(now), result: json(body) } });
    return { body };
  }
  const current = state(row), questions = bank(row);
  const selected = current.asked.map(answer => questions.find(q => q.id === answer.id)).filter((q): q is LoadedPlacementQuestion => Boolean(q));
  const answers = current.asked.map(answer => answer.answer);
  const evidence = englishPlacementEvidence(answers, selected);
  if (!evidence.valid) throw new EnglishPlacementFailure(500, "attempt_unavailable");
  const complete = current.currentQuestionId === null && evidence.complete;
  if (!complete && current.currentQuestionId !== null && now < row.expiresAt.getTime()) {
    throw new EnglishPlacementFailure(409, "attempt_incomplete", { expiresAt: row.expiresAt.getTime(), serverNow: now });
  }
  const body = !complete && (current.currentQuestionId === null || !evidence.sufficient)
    ? { status: "inconclusive" as const, reason: current.currentQuestionId === null ? "question_pool_exhausted" as const : "insufficient_evidence" as const, answered: row.revision, required: policy.minimumAnswers }
    : scorePlacementAnswers(answers, selected, { version: policy.version, completionReason: complete ? "completed" : "timeout" });
  await tx.englishPlacementAttempt.update({ where: { id: row.id }, data: { status: "COMPLETED", activeLearnerId: null, finishedAt: new Date(now), result: json(body) } });
  if (!("level" in body)) return { body };
  await tx.studentProfile.update({ where: { userId: row.learnerId }, data: {
    placedLevel: body.level, placedSubLevel: body.subLevel, placementCompletedAt: new Date(now),
    placementNeedsReview: body.needsManualReview, placementReviewReason: body.manualReviewReasons.join(", "),
    placementReport: json({ earned: body.earned, max: body.max, subLevel: body.subLevel, sectionScores: body.sectionScores,
      strengths: body.strengths, improvements: body.improvements, manualReviewReasons: body.manualReviewReasons,
      assessment: body.assessment, bankDigest: row.bankSnapshot.digest, routingRevision: row.routingRevision, attemptId: row.id }),
    placementWritingSample: null,
  } });
  return { body, recentIds: selected.map(q => q.id) };
}

export async function getOrStartEnglishAttempt(db: PrismaClient, userId: string, loadBank: () => Promise<LoadedPlacementQuestion[]>, recentIds: string[] = []): Promise<Operation> {
  return transaction(db, userId, async (tx, now) => {
    const active = await tx.englishPlacementAttempt.findUnique({ where: { activeLearnerId: userId }, include });
    if (active) return !supported(active) || now >= active.expiresAt.getTime() ? finalize(tx, active, now) : { body: view(active, now) };
    const profile = await tx.studentProfile.findUnique({ where: { userId }, select: { placementCompletedAt: true } });
    if (profile?.placementCompletedAt && !isPlacementRetakeAllowed(profile.placementCompletedAt)) {
      throw new EnglishPlacementFailure(403, "cooldown", { eligibleAt: placementRetakeEligibleAt(profile.placementCompletedAt).toISOString() });
    }
    const questions = await loadBank(), adaptiveState = buildInitialAdaptiveState();
    const first = chooseNextAdaptiveQuestion(adaptiveState, questions, recentIds);
    if (!first) throw new EnglishPlacementFailure(503, "Question pool unavailable");
    const digest = placementBankDigest(questions);
    const snapshot = await tx.englishPlacementBankSnapshot.upsert({ where: { digest }, update: {}, create: { digest, content: json(questions) } });
    const row = await tx.englishPlacementAttempt.create({ data: {
      id: randomUUID(), learnerId: userId, activeLearnerId: userId, bankSnapshotId: snapshot.id,
      schemaVersion: 1, scoringVersion: policy.version, routingRevision: ENGLISH_STAIRCASE_ROUTING_REVISION,
      status: "IN_PROGRESS", revision: 0, startedAt: new Date(now), expiresAt: new Date(now + policy.timeLimitSec * 1000),
      state: json({ currentQuestionId: first.id, asked: [], adaptiveState }),
    }, include });
    return { body: view(row, now) };
  });
}

export async function submitEnglishAttempt(db: PrismaClient, userId: string, input: { action: "finish"; attemptToken: string } | { action: "answer"; attemptToken: string; answer: number }, recentIds: string[] = []): Promise<Operation> {
  const handle = parseEnglishAttemptHandle(input.attemptToken);
  if (!handle) throw new EnglishPlacementFailure(409, "attempt_unavailable");
  return transaction(db, userId, async (tx, now) => {
    const row = await tx.englishPlacementAttempt.findUnique({ where: { id: handle.id }, include });
    if (!row || row.learnerId !== userId) throw new EnglishPlacementFailure(404, "Attempt not found");
    if (handle.revision > row.revision) throw new EnglishPlacementFailure(409, "attempt_conflict");
    if (input.action === "finish" || !supported(row)) return finalize(tx, row, now);
    const current = state(row);
    if (handle.revision < row.revision) {
      if (current.asked[handle.revision]?.answer !== input.answer) throw new EnglishPlacementFailure(409, "attempt_conflict");
      return row.status !== "IN_PROGRESS" ? receipt(row) : now >= row.expiresAt.getTime() ? finalize(tx, row, now) : { body: view(row, now) };
    }
    if (row.status !== "IN_PROGRESS") return receipt(row);
    if (now >= row.expiresAt.getTime()) throw new EnglishPlacementFailure(409, "attempt_expired", { expiresAt: row.expiresAt.getTime() });
    const questions = bank(row), question = questions.find(q => q.id === current.currentQuestionId);
    if (!question) throw new EnglishPlacementFailure(409, "attempt_conflict");
    const adaptiveState = applyAdaptiveAnswer(current.adaptiveState, question, input.answer === question.correctIndex);
    const next = chooseNextAdaptiveQuestion(adaptiveState, questions, recentIds);
    const updated = await tx.englishPlacementAttempt.update({ where: { id: row.id }, data: {
      revision: row.revision + 1,
      state: json({ currentQuestionId: next?.id ?? null, asked: [...current.asked, { id: question.id, answer: input.answer, acceptedAt: now }], adaptiveState }),
    }, include });
    return { body: view(updated, now) };
  });
}
