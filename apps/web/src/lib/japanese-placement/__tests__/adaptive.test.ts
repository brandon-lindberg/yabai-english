import { describe, expect, it } from "vitest";
import { bankDigest, inspectBankReadiness, JAPANESE_PLACEMENT_DOMAINS } from "../bank";
import { nextJapaneseQuestion, recordJapaneseResponse, startJapaneseAttempt, summarizeJapaneseAttempt } from "../attempt";
import { adaptiveBank, approveBank, draftBank } from "./fixtures";

const start = { id: "timed", learnerId: "learner", startedAt: "2026-10-22T01:00:00.000Z" };
const deadline = "2026-10-22T01:20:00.000Z";
const bands = ["N5", "N4", "N3", "N2", "N1"] as const;


function play(correct: boolean, count = 24) {
  const bank = adaptiveBank();
  let attempt = startJapaneseAttempt(bank, start);
  const asked: string[] = [];
  for (let index = 0; index < count; index++) {
    const question = nextJapaneseQuestion(bank, attempt)!;
    asked.push(question.id);
    const item = bank.items.find((entry) => entry.id === question.id)!;
    attempt = recordJapaneseResponse(bank, attempt, {
      ...(item.responseType === "sentence_assembly"
        ? { kind: "sentence_assembly", itemId: item.id, tileIds: correct ? item.acceptedOrders[0] : [...item.acceptedOrders[0]].reverse() }
        : { kind: "answer", itemId: item.id, choiceId: correct ? "a" : "b" }),
      submittedAt: "2026-10-22T01:01:00.000Z",
    });
  }
  return { bank, attempt, asked };
}

describe("timed adaptive Japanese placement", () => {
  it("pins a twenty-minute deadline through serialization and retries", () => {
    const bank = adaptiveBank();
    const attempt = startJapaneseAttempt(bank, start);
    expect(attempt).toMatchObject({ expiresAt: deadline, policyRevision: "japanese-posterior-v1" });
    const resumed = JSON.parse(JSON.stringify(attempt));
    expect(nextJapaneseQuestion(bank, resumed)).toEqual(nextJapaneseQuestion(bank, attempt));
    expect(resumed.expiresAt).toBe(deadline);
  });

  it("serves harder paths for correct answers and easier paths for incorrect answers", () => {
    const strong = play(true, 12);
    const weak = play(false, 12);
    const difficulty = (run: typeof strong) => run.asked.slice(6).map((id) => bands.indexOf(run.bank.items.find((item) => item.id === id)!.calibration!.band));
    expect(difficulty(strong).reduce((sum, n) => sum + n, 0)).toBeGreaterThan(difficulty(weak).reduce((sum, n) => sum + n, 0));
    expect(strong.asked).not.toEqual(weak.asked);
  });

  it("finishes at 24 unique questions with all six domain quotas met", () => {
    const { bank, attempt, asked } = play(true);
    expect(new Set(asked).size).toBe(24);
    expect(nextJapaneseQuestion(bank, attempt)).toBeNull();
    const result = summarizeJapaneseAttempt(bank, attempt);
    for (const domain of JAPANESE_PLACEMENT_DOMAINS) expect(result.domains.find((entry) => entry.domain === domain)).toMatchObject({ planned: 4, answered: 4 });
    expect(result).toMatchObject({ completionReason: "question_limit", levelEstimate: { status: "estimated", band: "N1", provisional: true } });
    const weak = play(false);
    expect(summarizeJapaneseAttempt(weak.bank, weak.attempt).levelEstimate).toMatchObject({ status: "estimated", band: "BELOW_N5" });
  });

  it("does not expose the model, difficulty, answers or posterior with a question", () => {
    const { bank, attempt } = play(true, 1);
    expect(JSON.stringify(nextJapaneseQuestion(bank, attempt))).not.toMatch(/probabilities|calibration|correctChoiceId|acceptedOrders|posterior|assessment/);
  });

  it("enforces the exact deadline, and finalizes partial evidence without counting late answers", () => {
    const { bank, attempt } = play(true, 6);
    const question = nextJapaneseQuestion(bank, attempt)!;
    expect(nextJapaneseQuestion(bank, attempt, deadline)).toBeNull();
    expect(() => recordJapaneseResponse(bank, attempt, { kind: "skip", itemId: question.id, reason: "not_sure", submittedAt: deadline })).toThrow(/expired/);
    const result = summarizeJapaneseAttempt(bank, attempt, deadline);
    expect(result).toMatchObject({ completedAt: deadline, completionReason: "time_limit", answered: 6, total: 24 });
    expect(result.levelEstimate.status).toBe("estimated");
    expect(() => summarizeJapaneseAttempt(bank, attempt, "2026-10-22T01:19:59.999Z")).toThrow(/incomplete/);
  });

  it("never invents a level from no answers, sparse coverage, or all skips", () => {
    const bank = adaptiveBank();
    const empty = startJapaneseAttempt(bank, start);
    expect(summarizeJapaneseAttempt(bank, empty, deadline).levelEstimate).toMatchObject({ status: "insufficient_evidence" });
    const { attempt } = play(true, 3);
    expect(summarizeJapaneseAttempt(bank, attempt, deadline).levelEstimate.status).toBe("insufficient_evidence");
    let skipped = empty;
    for (let index = 0; index < 24; index++) skipped = recordJapaneseResponse(bank, skipped, { kind: "skip", itemId: nextJapaneseQuestion(bank, skipped)!.id, reason: "not_sure", submittedAt: "2026-10-22T01:01:00.000Z" });
    expect(summarizeJapaneseAttempt(bank, skipped).levelEstimate.status).toBe("insufficient_evidence");
  });

  it("rejects a changed deadline, model or adaptive response history", () => {
    const { bank, attempt } = play(true, 2);
    expect(() => nextJapaneseQuestion(bank, { ...attempt, expiresAt: "2026-10-22T02:00:00.000Z" })).toThrow(/deadline/);
    expect(() => nextJapaneseQuestion(bank, { ...attempt, responses: [...attempt.responses].reverse() })).toThrow();
    const originalDigest = bankDigest(bank);
    bank.items[0].calibration!.probabilities[0] = 0.1;
    expect(bankDigest(bank)).not.toBe(originalDigest);
    expect(inspectBankReadiness(bank).ready).toBe(false);
  });
});


describe("Japanese calibration and evidence boundaries", () => {
  it.each([0, 1, 2, 3, 4, 5])("can distinguish synthetic ability band %s without English scoring", (ability) => {
    const bank = adaptiveBank();
    for (const item of bank.items) {
      const rank = bands.indexOf(item.calibration!.band) + 1;
      item.calibration!.probabilities = Array.from({ length: 6 }, (_, index) => index >= rank ? 0.99 : 0.01);
    }
    approveBank(bank);
    let attempt = startJapaneseAttempt(bank, start);
    for (let index = 0; index < 24; index++) {
      const questionId = nextJapaneseQuestion(bank, attempt)!.id;
      const item = bank.items.find((entry) => entry.id === questionId)!;
      const correct = bands.indexOf(item.calibration!.band) + 1 <= ability;
      attempt = recordJapaneseResponse(bank, attempt, {
        ...(item.responseType === "sentence_assembly"
          ? { kind: "sentence_assembly", itemId: item.id, tileIds: correct ? item.acceptedOrders[0] : [...item.acceptedOrders[0]].reverse() }
          : { kind: "answer", itemId: item.id, choiceId: correct ? "a" : "b" }),
        submittedAt: "2026-10-22T01:01:00.000Z",
      });
    }
    expect(summarizeJapaneseAttempt(bank, attempt).levelEstimate).toMatchObject({ status: "estimated", band: ["BELOW_N5", ...bands][ability] });
  });

  it("accepts the last millisecond before expiry and keeps an exact retry idempotent afterwards", () => {
    const bank = adaptiveBank();
    const empty = startJapaneseAttempt(bank, start);
    const answer = { kind: "skip", itemId: nextJapaneseQuestion(bank, empty)!.id, reason: "not_sure", submittedAt: "2026-10-22T01:19:59.999Z" };
    const attempt = recordJapaneseResponse(bank, empty, answer);
    expect(recordJapaneseResponse(bank, attempt, { ...answer, submittedAt: deadline })).toEqual(attempt);
    expect(summarizeJapaneseAttempt(bank, attempt, deadline).domains[0]).toMatchObject({ notSure: 1, incorrect: 0, unanswered: 3 });
  });

  it("requires reviewed calibration, sufficient pools and every declared band in each core domain", () => {
    const bank = adaptiveBank();
    bank.reviews.placement = null;
    expect(inspectBankReadiness(bank).issues).toContain("placement-review-required");
    bank.items[0].calibration = null;
    expect(inspectBankReadiness(bank).issues).toContain("assessment-calibration-required");
    const missing = adaptiveBank();
    missing.items = missing.items.filter((item) => item.domain !== "reading" || item.calibration!.band !== "N1");
    missing.sequence = missing.items.map((item) => item.id);
    expect(inspectBankReadiness(missing).issues).toContain("missing-anchor:reading:N1");
    const short = draftBank();
    short.assessment!.quotas.reading = 4;
    expect(inspectBankReadiness(short).issues).toContain("insufficient-pool:reading");
  });

  it("rejects likelihoods that can underflow or falsely distinguish advanced kana proficiency", () => {
    const bank = adaptiveBank();
    bank.items[0].calibration!.probabilities[0] = 1e-300;
    expect(() => bankDigest(bank)).toThrow();
    bank.items[0].calibration!.probabilities = [0.1, 0.5, 0.6, 0.7, 0.8, 0.9];
    expect(() => bankDigest(bank)).toThrow(/Kana/);
  });
});


it("does not turn a mixed skill profile into below-N5 solely because construction anchors were incorrect", () => {
  const bank = adaptiveBank();
  let attempt = startJapaneseAttempt(bank, start);
  for (let index = 0; index < 24; index++) {
    const question = nextJapaneseQuestion(bank, attempt)!;
    const item = bank.items.find((entry) => entry.id === question.id)!;
    attempt = recordJapaneseResponse(bank, attempt, {
      ...(item.responseType === "sentence_assembly"
        ? { kind: "sentence_assembly", itemId: item.id, tileIds: [...item.acceptedOrders[0]].reverse() }
        : { kind: "answer", itemId: item.id, choiceId: "a" }),
      submittedAt: "2026-10-22T01:01:00.000Z",
    });
  }
  const result = summarizeJapaneseAttempt(bank, attempt);
  expect(result.levelEstimate).toMatchObject({ status: "estimated" });
  if (result.levelEstimate.status === "estimated") expect(result.levelEstimate.band).not.toBe("BELOW_N5");
  expect(result.domains.find((domain) => domain.domain === "writing")).toMatchObject({ correct: 0, incorrect: 4 });
});
