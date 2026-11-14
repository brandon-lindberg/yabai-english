import "server-only";
import { createBoundedAsyncCache } from "../bounded-async-cache";
import { PrivateApiFailure } from "../private-api-error";
import { lockLearnerTransaction } from "../learner-transaction-lock";
import { randomUUID } from "node:crypto";
import { z } from "zod";
import { Prisma, type PrismaClient } from "@/generated/prisma/client";
import { isLoginAllowedForAccountStatus } from "@/lib/account-status";
import { isTeacherCabinetRole } from "@/lib/dashboard/teacher-cabinet-role";
import { bankDigest, loadApprovedJapaneseBank, japaneseQuestionLimit } from "./bank";
import {
  JAPANESE_SUPPORTED_ATTEMPT_SCHEMAS, japaneseScoringRevision, supportsJapaneseRuntime, japaneseResponseInputSchema,
  createJapaneseAttemptRuntime, type JapaneseAttemptContext, sameJapaneseResponse,
  summarizeJapaneseAttempt, parseStoredJapaneseResponse,
  japaneseAttemptPolicyMatchesBank,
} from "./attempt";
import { JAPANESE_STAIRCASE_POLICY_REVISION } from "./staircase-policy";
import { readJapanesePlacementRetake, readLatestJapanesePlacementAward } from "./retake";
import { learningLanguageForRequest } from "../learning-site-request";

export class JapanesePlacementFailure extends PrivateApiFailure {}
const startInput = z.object({ requestId: z.string().uuid() }).strict();
const snapshotSelect = { id: true, bankKey: true, version: true, digest: true, itemCount: true, revokedAt: true } as const;
const relations = { bankSnapshot: { select: snapshotSelect }, responses: { select: { itemId: true, payload: true }, orderBy: { position: "asc" as const } } } as const;
type Runtime = ReturnType<typeof createJapaneseAttemptRuntime>;
const cachedBank = createBoundedAsyncCache<Runtime>(2);
type StoredAttempt = Prisma.JapanesePlacementAttemptGetPayload<{ include: typeof relations }>;
type Tx = Prisma.TransactionClient;
const json = (value: unknown) => JSON.parse(JSON.stringify(value)) as Prisma.InputJsonValue;

function input<T>(schema: z.ZodType<T>, value: unknown): T {
  const parsed = schema.safeParse(value);
  if (!parsed.success) throw new JapanesePlacementFailure(400, "INVALID_INPUT");
  return parsed.data;
}

async function actor(tx: Tx, userId: string) {
  const user = await tx.user.findUnique({ where: { id: userId }, select: { role: true, accountStatus: true, learningLanguage: true } });
  if (!user) throw new JapanesePlacementFailure(401, "UNAUTHORIZED");
  if (!isLoginAllowedForAccountStatus(user.accountStatus)) throw new JapanesePlacementFailure(403, "ACCOUNT_INACTIVE");
  return user;
}

async function lockJapaneseLearner(tx: Tx, learnerId: string) {
  await lockLearnerTransaction(tx, "japanese-placement", learnerId);
}

/** Serializes starts, reads and submissions for one learner; no application table is touched by the lock. */
async function studentTransaction<T>(db: PrismaClient, learnerId: string, run: (tx: Tx, now: number) => Promise<T>): Promise<T> {
  return db.$transaction(async (tx) => {
    await lockJapaneseLearner(tx, learnerId);
    const user = await actor(tx, learnerId);
    if (user.role !== "STUDENT" || await learningLanguageForRequest(user.learningLanguage) !== "JAPANESE") throw new JapanesePlacementFailure(403, "JAPANESE_STUDENT_REQUIRED");
    return run(tx, Date.now());
  }, { maxWait: 10_000, timeout: 10_000 });
}

function state(row: StoredAttempt) {
  return {
    id: row.id, learnerId: row.learnerId, startedAt: row.startedAt.toISOString(), schemaVersion: row.schemaVersion,
    expiresAt: row.expiresAt?.toISOString(), policyRevision: row.policyRevision,
    bankId: row.bankSnapshot.bankKey, bankVersion: row.bankSnapshot.version, bankDigest: row.bankSnapshot.digest,
    responses: row.responses.map((response) => response.payload),
  };
}

async function loadRuntime(db: PrismaClient, tx: Tx, snapshot: StoredAttempt["bankSnapshot"]) {
  const runtime = await cachedBank(db, `${snapshot.id}:${snapshot.digest}`, async () => {
    const stored = await tx.japanesePlacementBankSnapshot.findUniqueOrThrow({ where: { id: snapshot.id }, select: { content: true } });
    const ready = createJapaneseAttemptRuntime(stored.content);
    if (ready.digest !== snapshot.digest || ready.bank.id !== snapshot.bankKey
      || ready.bank.version !== snapshot.version || ready.bank.items.length !== snapshot.itemCount) {
      throw new JapanesePlacementFailure(500, "STORED_BANK_INVALID");
    }
    ready.assertApproved();
    return ready;
  });
  return runtime;
}

async function runnableBank(db: PrismaClient, tx: Tx, row: StoredAttempt, forCompletion = false) {
  // Revocation and attempt eligibility are always read from this transaction, never cached.
  if (!forCompletion && row.bankSnapshot.revokedAt) throw new JapanesePlacementFailure(503, "BANK_UNAVAILABLE");
  if (!supportsJapaneseRuntime(row.schemaVersion, row.scoringRevision, row.policyRevision)) {
    throw new JapanesePlacementFailure(409, "ATTEMPT_VERSION_UNSUPPORTED");
  }
  const runtime = await loadRuntime(db, tx, row.bankSnapshot);
  if (!japaneseAttemptPolicyMatchesBank(runtime.bank, row.schemaVersion, row.policyRevision)
    || japaneseQuestionLimit(runtime.bank) !== row.questionLimit) throw new JapanesePlacementFailure(500, "STORED_BANK_INVALID");
  return runtime;
}

async function view(db: PrismaClient, tx: Tx, row: StoredAttempt, now: number, context?: JapaneseAttemptContext) {
  const eligibility = await readJapanesePlacementRetake(tx, row.learnerId, now);
  return {
    canStartNewAttempt: row.status !== "IN_PROGRESS" && eligibility.canStartNewAttempt,
    retakeEligibleAt: eligibility.retakeEligibleAt,
    retakeEligibleDate: eligibility.retakeEligibleDate,
    attemptId: row.id, status: row.status, answered: row.responses.length, total: row.questionLimit ?? row.bankSnapshot.itemCount,
    expiresAt: row.expiresAt?.toISOString() ?? null,
    timeLimitSec: row.expiresAt ? (row.expiresAt.getTime() - row.startedAt.getTime()) / 1000 : null,
    ...(row.status === "IN_PROGRESS" ? { serverNow: new Date(now).toISOString() } : {}),
    question: row.status === "IN_PROGRESS" ? (context ?? (await runnableBank(db, tx, row)).context(state(row))).next(new Date(now).toISOString()) : null,
    result: row.status === "COMPLETED" ? row.result : null,
  };
}

async function completeAttempt(tx: Tx, row: StoredAttempt, result: ReturnType<typeof summarizeJapaneseAttempt>) {
  return tx.japanesePlacementAttempt.update({ where: { id: row.id }, data: {
    status: "COMPLETED", activeLearnerId: null, finishedAt: new Date(result.completedAt), result: json(result),
  }, include: relations });
}

/** No worker is needed: reads, starts and submissions settle an expired attempt under the same lock. */
async function settleExpired(db: PrismaClient, tx: Tx, row: StoredAttempt, now: number): Promise<StoredAttempt> {
  if (row.status !== "IN_PROGRESS" || !row.expiresAt || now < row.expiresAt.getTime()) return row;
  return completeAttempt(tx, row, (await runnableBank(db, tx, row, true)).context(state(row)).summarize(row.expiresAt.toISOString()));
}

/** Explicit server-side publication only. No route or seed imports the draft review bank. */
export async function publishJapaneseBank(db: PrismaClient, value: unknown) {
  const bank = loadApprovedJapaneseBank(value);
  const digest = bankDigest(bank);
  const snapshot = await db.japanesePlacementBankSnapshot.upsert({
    where: { bankKey_version: { bankKey: bank.id, version: bank.version } }, update: {},
    create: { bankKey: bank.id, version: bank.version, digest, itemCount: bank.items.length, content: json(bank) },
  });
  if (snapshot.digest !== digest) throw new JapanesePlacementFailure(409, "BANK_VERSION_CONFLICT");
  if (snapshot.revokedAt) throw new JapanesePlacementFailure(409, "BANK_REVOKED");
  return snapshot;
}

export async function startStoredJapaneseAttempt(db: PrismaClient, learnerId: string, value: unknown) {
  const { requestId } = input(startInput, value);
  const outcome = await studentTransaction(db, learnerId, async (tx, now) => {
    const retry = await tx.japanesePlacementAttempt.findUnique({ where: { learnerId_requestId: { learnerId, requestId } }, include: relations });
    if (retry) return view(db, tx, await settleExpired(db, tx, retry, now), now);
    let active = await tx.japanesePlacementAttempt.findUnique({ where: { activeLearnerId: learnerId }, include: relations });
    if (active) active = await settleExpired(db, tx, active, now);
    const eligibility = await readJapanesePlacementRetake(tx, learnerId, now);
    // Commit any expired result before reporting refusal outside the transaction.
    if (!eligibility.canStartNewAttempt) return { cooldown: true } as const;
    if (active?.status !== "IN_PROGRESS") active = null;
    if (active && !active.bankSnapshot.revokedAt && supportsJapaneseRuntime(active.schemaVersion, active.scoringRevision, active.policyRevision)) throw new JapanesePlacementFailure(409, "ACTIVE_ATTEMPT_EXISTS");
    const snapshot = await tx.japanesePlacementBankSnapshot.findFirst({
      select: snapshotSelect,
      where: { revokedAt: null, OR: JAPANESE_SUPPORTED_ATTEMPT_SCHEMAS.map((version) => ({ content: { path: ["schemaVersion"], equals: version } })) }, orderBy: [{ publishedAt: "desc" }, { version: "desc" }, { id: "desc" }],
    });
    if (!snapshot) throw new JapanesePlacementFailure(503, "BANK_UNAVAILABLE");
    if (active) await tx.japanesePlacementAttempt.update({
      where: { id: active.id }, data: { status: "ABANDONED", activeLearnerId: null, finishedAt: new Date(now) },
    });
    const runtime = await loadRuntime(db, tx, snapshot), { bank } = runtime;
    const started = runtime.start({ id: randomUUID(), learnerId, startedAt: new Date(now).toISOString() },
      bank.schemaVersion === 5 ? JAPANESE_STAIRCASE_POLICY_REVISION : undefined);
    const row = await tx.japanesePlacementAttempt.create({
      data: { id: started.id, startedAt: new Date(started.startedAt), expiresAt: new Date(started.expiresAt), policyRevision: started.policyRevision,
        questionLimit: japaneseQuestionLimit(bank), learnerId, requestId, activeLearnerId: learnerId, bankSnapshotId: snapshot.id,
        schemaVersion: started.schemaVersion, scoringRevision: japaneseScoringRevision(started.schemaVersion, started.policyRevision) },
      include: relations,
    });
    return view(db, tx, row, now, runtime.context(started));
  });
  if ("cooldown" in outcome) throw new JapanesePlacementFailure(403, "PLACEMENT_COOLDOWN");
  return outcome;
}

export async function getCurrentJapaneseAttempt(db: PrismaClient, learnerId: string) {
  return studentTransaction(db, learnerId, async (tx, now) => {
    let row = await tx.japanesePlacementAttempt.findFirst({ where: { learnerId }, orderBy: [{ startedAt: "desc" }, { id: "desc" }], include: relations });
    if (!row) return null;
    row = await settleExpired(db, tx, row, now);
    if (row.status !== "IN_PROGRESS") {
      const award = await readLatestJapanesePlacementAward(tx, learnerId);
      if (award && award.id !== row.id) row = await tx.japanesePlacementAttempt.findUniqueOrThrow({ where: { id: award.id, learnerId }, include: relations });
    }
    return view(db, tx, row, now);
  });
}

export async function getStoredJapaneseAttempt(db: PrismaClient, learnerId: string, attemptId: string) {
  return studentTransaction(db, learnerId, async (tx, now) => {
    const row = await tx.japanesePlacementAttempt.findFirst({ where: { id: attemptId, learnerId }, include: relations });
    if (!row) throw new JapanesePlacementFailure(404, "ATTEMPT_NOT_FOUND");
    return view(db, tx, await settleExpired(db, tx, row, now), now);
  });
}

export async function submitStoredJapaneseResponse(db: PrismaClient, learnerId: string, attemptId: string, value: unknown) {
  const response = input(japaneseResponseInputSchema, value);
  return studentTransaction(db, learnerId, async (tx, now) => {
    const row = await tx.japanesePlacementAttempt.findFirst({ where: { id: attemptId, learnerId }, include: relations });
    if (!row) throw new JapanesePlacementFailure(404, "ATTEMPT_NOT_FOUND");
    const settled = await settleExpired(db, tx, row, now);
    if (settled.status === "COMPLETED") {
      // An expired result is the outcome of any late submission, with no answer appended.
      if (settled.result && typeof settled.result === "object" && !Array.isArray(settled.result) && settled.result.completionReason === "time_limit") return view(db, tx, settled, now);
      const priorRow = settled.responses.find((entry) => entry.itemId === response.itemId);
      const prior = priorRow ? parseStoredJapaneseResponse(priorRow.payload) : null;
      if (prior && sameJapaneseResponse(prior, response)) return view(db, tx, settled, now);
      throw new JapanesePlacementFailure(409, "ATTEMPT_COMPLETED");
    }
    if (row.status !== "IN_PROGRESS") throw new JapanesePlacementFailure(409, "ATTEMPT_CLOSED");
    const runtime = await runnableBank(db, tx, row);
    const context = runtime.context(state(row)), { attempt } = context;
    const last = attempt.responses.at(-1)?.submittedAt ?? attempt.startedAt;
    const submittedAt = new Date(Math.max(now, Date.parse(last))).toISOString();
    let next;
    try { next = context.record({ ...response, submittedAt }); }
    catch (error) {
      const conflict = error instanceof Error && /already recorded|Expected the current/.test(error.message);
      throw new JapanesePlacementFailure(conflict ? 409 : 400, conflict ? "RESPONSE_CONFLICT" : "INVALID_RESPONSE");
    }
    if (next.attempt.responses.length === attempt.responses.length) return view(db, tx, row, now, next);
    await tx.japanesePlacementResponse.create({ data: {
      attemptId, itemId: response.itemId, position: attempt.responses.length, payload: json(next.attempt.responses.at(-1)),
    } });
    if (next.attempt.responses.length === row.questionLimit) return view(db, tx, await completeAttempt(tx, row, next.summarize()), now);
    const updated = await tx.japanesePlacementAttempt.findUniqueOrThrow({ where: { id: attemptId }, include: relations });
    return view(db, tx, updated, now, next);
  });
}

/** A teacher-created roster is not proof that a learner chose to share assessment data. */
export async function getTeacherJapaneseResult(db: PrismaClient, teacherUserId: string, learnerId: string) {
  return db.$transaction(async (tx) => {
    const user = await actor(tx, teacherUserId);
    if (!isTeacherCabinetRole(user.role)) throw new JapanesePlacementFailure(403, "TEACHER_REQUIRED");
    const booking = await tx.booking.findFirst({ where: {
      studentId: learnerId, student: { role: "STUDENT", accountStatus: "ACTIVE" },
      teacher: { userId: teacherUserId }, learningLanguage: "JAPANESE", groupLessonSessionId: null,
      status: { in: ["CONFIRMED", "COMPLETED"] },
    }, select: { id: true } });
    if (!booking) throw new JapanesePlacementFailure(404, "RESULT_NOT_FOUND");
    await lockJapaneseLearner(tx, learnerId);
    const active = await tx.japanesePlacementAttempt.findUnique({ where: { activeLearnerId: learnerId }, include: relations });
    if (active) await settleExpired(db, tx, active, Date.now());
    const award = await readLatestJapanesePlacementAward(tx, learnerId);
    if (award) return { result: award.result };
    const row = await tx.japanesePlacementAttempt.findFirst({
      where: { learnerId, status: "COMPLETED" }, orderBy: [{ finishedAt: "desc" }, { id: "desc" }], select: { result: true },
    });
    return { result: row?.result ?? null };
  });
}
