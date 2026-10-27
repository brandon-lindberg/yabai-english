import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import { loadPlacementBankSync } from "@/lib/placement-bank/load-placement-bank";
import { scorePlacementAnswers, type PlacementQuestion } from "@/lib/placement-test";
import { createPlacementAttemptToken, verifyPlacementAttemptToken } from "@/lib/placement-attempt-token";
import { buildInitialAdaptiveState, chooseNextAdaptiveQuestion } from "@/lib/placement-adaptive";

const mocks = vi.hoisted(() => ({
  update: vi.fn(),
  setCookie: vi.fn(),
  bank: vi.fn(),
  auth: vi.fn(),
}));
vi.mock("@/auth", () => ({ auth: mocks.auth }));
vi.mock("@/lib/prisma", () => ({
  prisma: {
    studentProfile: {
      findUnique: vi.fn(async () => ({ placementCompletedAt: null })),
      update: mocks.update,
    },
    user: { findUnique: vi.fn(async () => ({ role: "STUDENT" })) },
  },
}));
vi.mock("next/headers", () => ({
  cookies: vi.fn(async () => ({ get: () => undefined, set: mocks.setCookie })),
}));
vi.mock("@/lib/placement-bank/placement-bank-access", () => ({
  getPlacementBankQuestions: mocks.bank,
}));

import { GET, POST } from "../route";

const bank = loadPlacementBankSync();
type Attempt = { attemptToken: string; expiresAt: number; question: PlacementQuestion | null };
const post = (body: unknown) => POST(new Request("http://test.local/api/placement", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify(body),
}));
const finish = (attempt: Attempt) => post({ action: "finish", attemptToken: attempt.attemptToken });

async function answerCorrectly(attempt: Attempt): Promise<Attempt> {
  const question = bank.find((q) => q.id === attempt.question?.id)!;
  const response = await post({
    action: "answer", attemptToken: attempt.attemptToken, answer: question.correctIndex,
  });
  expect(response.status).toBe(200);
  return response.json();
}

async function startAndAnswer(count: number): Promise<Attempt> {
  let attempt = await (await GET()).json() as Attempt;
  for (let i = 0; i < count; i++) attempt = await answerCorrectly(attempt);
  return attempt;
}

function expectNoResultSaved() {
  expect(mocks.update).not.toHaveBeenCalled();
  expect(mocks.setCookie).not.toHaveBeenCalled();
}

beforeEach(() => {
  vi.clearAllMocks();
  vi.spyOn(Date, "now").mockReturnValue(Date.parse("2026-10-27T00:00:00Z"));
  mocks.auth.mockResolvedValue({ user: { id: "english-student", learningLanguage: "ENGLISH" } });
  mocks.bank.mockResolvedValue(bank);
  mocks.update.mockResolvedValue({});
});
afterEach(() => vi.restoreAllMocks());

describe("English placement deadline and completion guards", () => {
  test("new attempts pin the scoring version and exact bank snapshot", async () => {
    const response = await (await GET()).json();
    const payload = verifyPlacementAttemptToken(response.attemptToken)!;
    expect(response.minimumAnswers).toBe(15);
    expect(response.question.cefrBand).toBe("A1");
    expect(payload).toMatchObject({ scoringVersion: 2, bankDigest: expect.stringMatching(/^[a-f0-9]{64}$/) });
    expect(payload.routingRevision).toBe("english-staircase-v1");
  });

  test("an already issued v2 per-skill token continues under its original routing", async () => {
    const attempt = await startAndAnswer(0);
    const payload = verifyPlacementAttemptToken(attempt.attemptToken)!;
    const adaptiveState = buildInitialAdaptiveState("legacy");
    const first = chooseNextAdaptiveQuestion(adaptiveState, bank)!;
    expect(first.cefrBand).toBe("A2");
    attempt.question = first;
    attempt.attemptToken = createPlacementAttemptToken({ ...payload, adaptiveState, routingRevision: undefined, currentQuestionId: first.id });
    const next = await answerCorrectly(attempt);
    expect(next.question?.cefrBand).toBe("A2");
    expect(verifyPlacementAttemptToken(next.attemptToken)?.adaptiveState.staircase).toBeUndefined();
  });

  test("a signed routing revision cannot be paired with a different state format", async () => {
    const attempt = await startAndAnswer(0);
    const payload = verifyPlacementAttemptToken(attempt.attemptToken)!;
    attempt.attemptToken = createPlacementAttemptToken({ ...payload, adaptiveState: buildInitialAdaptiveState("legacy") });
    expect((await finish(attempt)).status).toBe(409);
    expectNoResultSaved();
  });

  test("an unversioned active token must restart instead of acquiring new scoring rules", async () => {
    const attempt = await startAndAnswer(24);
    const payload = verifyPlacementAttemptToken(attempt.attemptToken)!;
    attempt.attemptToken = createPlacementAttemptToken({ ...payload, scoringVersion: undefined, bankDigest: undefined });
    expect((await finish(attempt)).status).toBe(409);
    expectNoResultSaved();
  });

  test("a changed answer key under the same bank ID cannot reinterpret accepted evidence", async () => {
    const attempt = await startAndAnswer(24);
    const first = verifyPlacementAttemptToken(attempt.attemptToken)!.asked[0]!.id;
    mocks.bank.mockResolvedValue(bank.map((q) => q.id === first ? { ...q, correctIndex: (q.correctIndex + 1) % 3 } : q));
    const response = await finish(attempt);
    expect(response.status).toBe(409);
    expect(await response.json()).toMatchObject({ error: "attempt_unavailable" });
    expectNoResultSaved();
  });
  test.each([0, 3, 23])("refuses an early finish with %i answers and preserves the active attempt", async (count) => {
    const attempt = await startAndAnswer(count);
    const response = await finish(attempt);
    expect(response.status).toBe(409);
    expect(await response.json()).toMatchObject({ error: "attempt_incomplete", expiresAt: attempt.expiresAt });
    expectNoResultSaved();
    const continued = await answerCorrectly(attempt);
    expect(verifyPlacementAttemptToken(continued.attemptToken)?.asked).toHaveLength(count + 1);
  });

  test.each([0, 1])("rejects answers at the deadline plus %i ms without counting the late response", async (offset) => {
    const attempt = await startAndAnswer(3);
    vi.mocked(Date.now).mockReturnValue(attempt.expiresAt + offset);
    const response = await post({ action: "answer", attemptToken: attempt.attemptToken, answer: 0 });
    expect(response.status).toBe(409);
    const body = await response.json();
    expect(body).toMatchObject({ error: "attempt_expired", expiresAt: attempt.expiresAt });
    expect(body).not.toHaveProperty("attemptToken");
    expect(body).not.toHaveProperty("question");
    const timedOut = await (await finish(attempt)).json();
    expect(timedOut).toMatchObject({ status: "inconclusive", answered: 3, required: 15 });
    expect(timedOut).not.toHaveProperty("level");
    expectNoResultSaved();
  });

  test("accepts an answer just before expiry without extending the signed deadline", async () => {
    const attempt = await startAndAnswer(0);
    vi.mocked(Date.now).mockReturnValue(attempt.expiresAt - 1);
    const continued = await answerCorrectly(attempt);
    const payload = verifyPlacementAttemptToken(continued.attemptToken)!;
    expect(continued.expiresAt).toBe(attempt.expiresAt);
    expect(payload.expiresAt).toBe(attempt.expiresAt);
    expect(payload.issuedAt).toBe(attempt.expiresAt - 20 * 60 * 1000);
    expect(payload.asked).toHaveLength(1);
    expectNoResultSaved();
  });

  test.each([0, 3, 14])("a timeout with %i accepted answers awards no level and starts no cooldown", async (count) => {
    const attempt = await startAndAnswer(count);
    vi.mocked(Date.now).mockReturnValue(attempt.expiresAt);
    const response = await finish(attempt);
    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body).toMatchObject({ status: "inconclusive", reason: "insufficient_evidence", answered: count, required: 15 });
    expect(body).not.toHaveProperty("level");
    expectNoResultSaved();
  });

  test.each([false, true])("a full attempt still saves its accepted evidence (finish after expiry: %s)", async (expired) => {
    const attempt = await startAndAnswer(24);
    expect(attempt.question).toBeNull();
    const payload = verifyPlacementAttemptToken(attempt.attemptToken)!;
    const selected = payload.asked.map(({ id }) => bank.find((q) => q.id === id)!);
    const expected = scorePlacementAnswers(payload.asked.map(({ answer }) => answer), selected, { version: 2, completionReason: "completed" });
    if (expired) vi.mocked(Date.now).mockReturnValue(attempt.expiresAt + 1);
    const response = await finish(attempt);
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual(expected);
    expect(mocks.update).toHaveBeenCalledTimes(1);
    expect(mocks.update).toHaveBeenCalledWith(expect.objectContaining({
      where: { userId: "english-student" },
      data: expect.objectContaining({ placedLevel: expected.level, placedSubLevel: expected.subLevel }),
    }));
    expect(mocks.setCookie).toHaveBeenCalledTimes(1);
  });

  test.each([15, 23])("a timeout with %i accepted answers saves its penalized difficulty-aware result", async (count) => {
    const attempt = await startAndAnswer(count);
    vi.mocked(Date.now).mockReturnValue(attempt.expiresAt);
    const response = await finish(attempt);
    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body).toMatchObject({ assessment: { policyVersion: 2, answered: count, minimumAnswers: 15, completionReason: "timeout" } });
    expect(body.level).toBeTruthy();
    expect(body.assessment.timeoutPenaltyPoints).toBeGreaterThan(0);
    expect(body.assessment.adjustedScore).toBeLessThan(body.assessment.unadjustedScore);
    expect(mocks.update).toHaveBeenCalledWith(expect.objectContaining({ data: expect.objectContaining({
      placedLevel: body.level, placedSubLevel: body.subLevel,
      placementReport: expect.objectContaining({ assessment: body.assessment }),
    }) }));
    expect(mocks.setCookie).toHaveBeenCalledTimes(1);
  });

  test("an exhausted question pool is inconclusive instead of awarding from a truncated attempt", async () => {
    mocks.bank.mockResolvedValue(bank.filter((q) => q.section === "grammar").slice(0, 1));
    const attempt = await startAndAnswer(1);
    expect(attempt.question).toBeNull();
    const response = await finish(attempt);
    expect(response.status).toBe(200);
    expect(await response.json()).toMatchObject({ status: "inconclusive", reason: "question_pool_exhausted", answered: 1 });
    expectNoResultSaved();
  });

  test("pool exhaustion at the minimum is an infrastructure outcome even if finish arrives after expiry", async () => {
    const sections = ["grammar", "vocabulary", "reading", "functional"] as const;
    const limited = sections.flatMap((section) => bank.filter((q) => q.section === section && q.cefrBand === "C1").slice(0, section === "functional" ? 3 : 4));
    limited[0] = bank.find(q => q.section === "grammar" && q.cefrBand === "A1")!;
    mocks.bank.mockResolvedValue(limited);
    const attempt = await startAndAnswer(15);
    expect(attempt.question).toBeNull();
    vi.mocked(Date.now).mockReturnValue(attempt.expiresAt + 1);
    const body = await (await finish(attempt)).json();
    expect(body).toMatchObject({ status: "inconclusive", reason: "question_pool_exhausted", answered: 15 });
    expect(body).not.toHaveProperty("level");
    expect(body).not.toHaveProperty("assessment");
    expectNoResultSaved();
  });

  test("a missing bank item cannot shift answer alignment or produce a saved result", async () => {
    const attempt = await startAndAnswer(24);
    const missing = verifyPlacementAttemptToken(attempt.attemptToken)!.asked[1]!.id;
    mocks.bank.mockResolvedValue(bank.filter((q) => q.id !== missing));
    const response = await finish(attempt);
    expect(response.status).toBe(409);
    expect(await response.json()).toMatchObject({ error: "attempt_unavailable" });
    expectNoResultSaved();
  });

  test("Japanese learners cannot use the English finalization path", async () => {
    const attempt = await startAndAnswer(0);
    mocks.auth.mockResolvedValue({ user: { id: "english-student", learningLanguage: "JAPANESE" } });
    expect((await finish(attempt)).status).toBe(403);
    expectNoResultSaved();
  });
});
