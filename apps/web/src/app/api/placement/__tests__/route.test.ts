import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import { loadPlacementBankSync } from "@/lib/placement-bank/load-placement-bank";
import { scorePlacementAnswers, type PlacementQuestion } from "@/lib/placement-test";
import { englishPlacementFixture } from "../../../../../test/english-placement-fixture";
import type { EnglishPlacementState } from "@/lib/english-placement/service";
import { buildInitialAdaptiveState } from "@/lib/placement-adaptive";

const mocks = vi.hoisted(() => ({
  db: {},
  setCookie: vi.fn(),
  bank: vi.fn(),
  auth: vi.fn(),
}));
vi.mock("@/auth", () => ({ auth: mocks.auth }));
vi.mock("@/lib/prisma", () => ({ prisma: mocks.db }));
vi.mock("next/headers", () => ({
  cookies: vi.fn(async () => ({ get: () => undefined, set: mocks.setCookie })),
}));
vi.mock("@/lib/placement-bank/placement-bank-access", () => ({
  getPlacementBankQuestions: mocks.bank,
}));

import { GET, POST } from "../route";

const bank = loadPlacementBankSync();
let fixture: ReturnType<typeof englishPlacementFixture>;
type Attempt = { attemptToken: string; expiresAt: number; serverNow: number; question: PlacementQuestion | null; progress: { current: number; total: number } };
function inspect(attempt: Attempt) {
  const row = fixture.attempts.get(attempt.attemptToken.split(":")[0])!;
  return { ...row.state as EnglishPlacementState, scoringVersion: row.scoringVersion, routingRevision: row.routingRevision,
    bankSnapshotId: String(row.bankSnapshotId), issuedAt: row.startedAt.getTime(), expiresAt: row.expiresAt.getTime(), bankDigest: fixture.banks.get(row.bankSnapshotId)!.digest };
}
const post = (body: unknown) => POST(new Request("http://test.local/api/placement", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify(body),
}));
const finish = (attempt: Attempt) => post({ action: "finish", attemptToken: attempt.attemptToken });

async function answerCorrectly(attempt: Attempt, choice?: number): Promise<Attempt> {
  const question = bank.find((q) => q.id === attempt.question?.id)!;
  const response = await post({
    action: "answer", attemptToken: attempt.attemptToken, answer: choice ?? question.correctIndex,
  });
  expect(response.status).toBe(200);
  return response.json();
}

async function startAndAnswer(count: number): Promise<Attempt> {
  let attempt = await (await post({ action: "start" })).json() as Attempt;
  for (let i = 0; i < count; i++) attempt = await answerCorrectly(attempt);
  return attempt;
}

function expectNoResultSaved() {
  expect(fixture.mocks.studentProfile.update).not.toHaveBeenCalled();
  expect(mocks.setCookie).not.toHaveBeenCalled();
}

beforeEach(() => {
  vi.clearAllMocks();
  fixture = englishPlacementFixture(); Object.assign(mocks.db, fixture.db);
  vi.spyOn(Date, "now").mockReturnValue(Date.parse("2026-10-27T00:00:00Z"));
  mocks.auth.mockResolvedValue({ user: { id: "english-student", learningLanguage: "ENGLISH" } });
  mocks.bank.mockResolvedValue(bank);
});
afterEach(() => vi.restoreAllMocks());

describe("explicit English placement start", () => {
  test("opening and revisiting the page cannot create an attempt or a bank snapshot", async () => {
    for (let visit = 0; visit < 2; visit++) {
      const response = await GET();
      expect(response.status).toBe(200);
      expect(await response.json()).toEqual({ status: "ready" });
    }
    expect(fixture.attempts.size).toBe(0);
    expect(fixture.banks.size).toBe(0);
    expect(mocks.bank).not.toHaveBeenCalled();
    expectNoResultSaved();
  });

  test("only an explicit start creates the attempt and repeated starts preserve its deadline", async () => {
    const first = await post({ action: "start" });
    expect(first.status).toBe(200);
    const started = await first.json();
    expect(started).toMatchObject({ progress: { current: 1, total: 24 }, expiresAt: Date.now() + 1_200_000 });
    vi.mocked(Date.now).mockReturnValue(Date.now() + 60_000);
    expect(await (await post({ action: "start" })).json()).toMatchObject({ attemptToken: started.attemptToken, expiresAt: started.expiresAt });
    expect(await (await GET()).json()).toMatchObject({ attemptToken: started.attemptToken, expiresAt: started.expiresAt });
    expect(fixture.attempts.size).toBe(1);
  });
});

describe("English placement deadline and completion guards", () => {
  test("starts at midnight on the saved local retake date", async () => {
    fixture.mocks.studentProfile.findUnique.mockResolvedValue({
      placementCompletedAt: new Date("2026-11-01T04:30:00.000Z"), timezone: "America/Los_Angeles",
    });
    vi.mocked(Date.now).mockReturnValue(Date.parse("2026-11-30T07:59:59.999Z"));
    const blocked = await GET();
    expect(blocked.status).toBe(403);
    expect(await blocked.json()).toMatchObject({ error: "cooldown", eligibleDate: "2026-11-30", eligibleAt: "2026-11-30T08:00:00.000Z" });
    vi.mocked(Date.now).mockReturnValue(Date.parse("2026-11-30T08:00:00.000Z"));
    expect(await (await GET()).json()).toEqual({ status: "ready" });
    expect((await post({ action: "start" })).status).toBe(200);
  });

  test("new attempts pin the scoring version and exact bank snapshot", async () => {
    const response = await (await post({ action: "start" })).json();
    const payload = inspect(response);
    expect(response.minimumAnswers).toBe(15);
    expect(response.question.cefrBand).toBe("A1");
    expect(payload).toMatchObject({ scoringVersion: 2, bankDigest: expect.stringMatching(/^[a-f0-9]{64}$/) });
    expect(payload.routingRevision).toBe("english-staircase-v1");
  });

  test("old unpersisted state tokens must restart without changing existing placement", async () => {
    const attempt = await startAndAnswer(0);
    attempt.attemptToken = Buffer.from(JSON.stringify({ userId: "english-student", asked: [] })).toString("base64url") + ".legacy-signature";
    expect((await finish(attempt)).status).toBe(409);
    expectNoResultSaved();
  });

  test("a stored routing revision cannot be paired with a different state format", async () => {
    const attempt = await startAndAnswer(0);
    fixture.attempts.get(attempt.attemptToken.split(":")[0])!.state.adaptiveState = buildInitialAdaptiveState("legacy");
    expect((await finish(attempt)).status).toBe(500);
    expectNoResultSaved();
  });

  test("an unsupported active version is closed without acquiring new scoring rules", async () => {
    const attempt = await startAndAnswer(0);
    fixture.attempts.get(attempt.attemptToken.split(":")[0])!.schemaVersion = 99;
    const response = await finish(attempt);
    expect(await response.json()).toMatchObject({ status: "inconclusive", reason: "attempt_unavailable" });
    expectNoResultSaved();
    expect((await (await post({ action: "start" })).json()).question.cefrBand).toBe("A1");
  });

  test("a corrupt frozen answer key cannot reinterpret accepted evidence", async () => {
    const attempt = await startAndAnswer(24);
    const payload = inspect(attempt);
    const first = payload.asked[0].id;
    const snapshot = fixture.banks.get(payload.bankSnapshotId)!;
    snapshot.content = snapshot.content.map((q: PlacementQuestion) => q.id === first ? { ...q, correctIndex: (q.correctIndex + 1) % 3 } : q);
    const response = await finish(attempt);
    expect(response.status).toBe(500);
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
    expect(inspect(continued).asked).toHaveLength(count + 1);
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
    const payload = inspect(continued);
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
    const payload = inspect(attempt);
    const selected = payload.asked.map(({ id }) => bank.find((q) => q.id === id)!);
    const expected = scorePlacementAnswers(payload.asked.map(({ answer }) => answer), selected, { version: 2, completionReason: "completed" });
    if (expired) vi.mocked(Date.now).mockReturnValue(attempt.expiresAt + 1);
    const response = await finish(attempt);
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual(expected);
    expect(fixture.mocks.studentProfile.update).toHaveBeenCalledTimes(1);
    expect(fixture.mocks.studentProfile.update).toHaveBeenCalledWith(expect.objectContaining({
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
    expect(fixture.mocks.studentProfile.update).toHaveBeenCalledWith(expect.objectContaining({ data: expect.objectContaining({
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
    const payload = inspect(attempt);
    const missing = payload.asked[1]!.id;
    const snapshot = fixture.banks.get(payload.bankSnapshotId)!;
    snapshot.content = snapshot.content.filter((q: PlacementQuestion) => q.id !== missing);
    const response = await finish(attempt);
    expect(response.status).toBe(500);
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

describe("durable English attempt lifecycle", () => {
  test("reload resumes accepted answers, the same question and the original deadline", async () => {
    const current = await startAndAnswer(3);
    vi.mocked(Date.now).mockReturnValue(Date.now() + 100_000);
    const resumed = await (await GET()).json();
    expect(resumed).toMatchObject({ ...current, serverNow: Date.now() });
    expect(fixture.attempts.size).toBe(1);
    expect(resumed.attemptToken).toMatch(/^[0-9a-f-]{36}:3$/);
    expect(resumed.attemptToken).not.toContain(".");
    expect(JSON.stringify(resumed)).not.toMatch(/correctIndex|adaptiveState|askedStemIds/);
  });

  test("competing starts share one attempt and do not extend the deadline", async () => {
    const [first, second] = await Promise.all([post({ action: "start" }), post({ action: "start" })]);
    const a = await first.json(), b = await second.json();
    expect(a).toEqual(b);
    expect(fixture.attempts.size).toBe(1);
  });

  test("an exact answer retry resynchronizes without consuming another question", async () => {
    const first = await startAndAnswer(0);
    const accepted = await answerCorrectly(first);
    const retried = await answerCorrectly(first);
    expect(retried).toEqual(accepted);
    expect(fixture.mocks.englishPlacementAttempt.update).toHaveBeenCalledTimes(1);
    expect(retried.progress.current).toBe(2);
  });

  test("a different stale answer is rejected without overwriting accepted evidence", async () => {
    const first = await startAndAnswer(0);
    await answerCorrectly(first);
    const wrong = (bank.find(q => q.id === first.question!.id)!.correctIndex + 1) % 3;
    const response = await post({ action: "answer", attemptToken: first.attemptToken, answer: wrong });
    expect(response.status).toBe(409);
    expect(await response.json()).toMatchObject({ error: "attempt_conflict" });
    expect(fixture.mocks.englishPlacementAttempt.update).toHaveBeenCalledTimes(1);
  });

  test("a lost response followed by a later exact retry returns current progress", async () => {
    const first = await startAndAnswer(0);
    const second = await answerCorrectly(first);
    const third = await answerCorrectly(second);
    expect(await answerCorrectly(first)).toEqual(third);
  });

  test("concurrent finish retries write the profile exactly once", async () => {
    const current = await startAndAnswer(24);
    const [a, b] = await Promise.all([finish(current), finish(current)]);
    const result = await a.json();
    expect(result).toEqual(await b.json());
    expect(result).toMatchObject({ level: "ADVANCED", subLevel: 3 });
    expect(fixture.mocks.studentProfile.update).toHaveBeenCalledTimes(1);
    vi.mocked(Date.now).mockReturnValue(Date.now() + 60_000);
    expect(await (await finish(current)).json()).toEqual(result);
    expect(fixture.mocks.studentProfile.update).toHaveBeenCalledTimes(1);
  });

  test("an expired read saves a qualifying timeout even if its finish response was lost", async () => {
    const current = await startAndAnswer(15);
    vi.mocked(Date.now).mockReturnValue(current.expiresAt);
    const timed = await (await GET()).json();
    expect(timed).toMatchObject({ assessment: { completionReason: "timeout", answered: 15, minimumAnswers: 15, timeoutPenaltyPoints: 10 } });
    expect(await (await finish(current)).json()).toEqual(timed);
    expect(fixture.mocks.studentProfile.update).toHaveBeenCalledTimes(1);
    expect((await GET()).status).toBe(403);
  });

  test("an expired below-minimum read is durable but permits a new attempt", async () => {
    const current = await startAndAnswer(14);
    vi.mocked(Date.now).mockReturnValue(current.expiresAt);
    const timed = await (await GET()).json();
    expect(timed).toMatchObject({ status: "inconclusive", answered: 14, required: 15 });
    expect(await (await finish(current)).json()).toEqual(timed);
    expect(await (await GET()).json()).toEqual({ status: "ready" });
    expect(fixture.attempts.size).toBe(1);
    const next = await (await post({ action: "start" })).json();
    expect(next.question.cefrBand).toBe("A1");
    expect(next.attemptToken).not.toBe(current.attemptToken);
    expect(fixture.mocks.studentProfile.update).not.toHaveBeenCalled();
  });

  test("an old finish cannot overwrite a later result or restart its cooldown", async () => {
    const current = await startAndAnswer(24);
    const original = await (await finish(current)).json();
    Object.assign(fixture.profile, { placedLevel: "BEGINNER", placedSubLevel: 1, placementCompletedAt: new Date(Date.now() + 1000) });
    expect(await (await finish(current)).json()).toEqual(original);
    expect(fixture.profile.placedLevel).toBe("BEGINNER");
    expect(fixture.mocks.studentProfile.update).toHaveBeenCalledTimes(1);
  });

  test("bank edits cannot reinterpret an active attempt or its final receipt", async () => {
    const current = await startAndAnswer(24);
    mocks.bank.mockResolvedValue(bank.map(q => ({ ...q, correctIndex: (q.correctIndex + 1) % 3 })));
    const result = await (await finish(current)).json();
    expect(result).toMatchObject({ level: "ADVANCED", subLevel: 3 });
    mocks.bank.mockRejectedValue(new Error("bank temporarily unavailable"));
    expect(await (await finish(current)).json()).toEqual(result);
  });

  test.each(["JAPANESE", "TEACHER", "HIDDEN"])("fresh account authorization rejects %s even with a stale English session", async boundary => {
    const current = await startAndAnswer(1);
    if (boundary === "JAPANESE") fixture.actor.learningLanguage = "JAPANESE";
    if (boundary === "TEACHER") fixture.actor.role = "TEACHER";
    if (boundary === "HIDDEN") fixture.actor.accountStatus = "HIDDEN";
    expect((await finish(current)).status).toBe(403);
    expect((await GET()).status).toBe(403);
    expect(fixture.mocks.studentProfile.update).not.toHaveBeenCalled();
  });

  test("another user cannot read or finish an owned attempt", async () => {
    const current = await startAndAnswer(1);
    mocks.auth.mockResolvedValue({ user: { id: "other-student", learningLanguage: "ENGLISH" } });
    fixture.actor.id = "other-student";
    expect((await finish(current)).status).toBe(404);
    expect(fixture.mocks.studentProfile.update).not.toHaveBeenCalled();
  });
});
