import { describe, expect, it } from "vitest";
import { bankDigest, inspectBankReadiness, JAPANESE_STUDY_BANDS, parseJapaneseBank } from "../bank";
import { nextJapaneseQuestion, recordJapaneseResponse, startJapaneseAttempt, summarizeJapaneseAttempt, supportsJapaneseRuntime } from "../attempt";
import { japaneseResultSchema } from "../public";
import { approveBank, groupedAdaptiveBank } from "./fixtures";

const start = { id: "rubric-attempt", learnerId: "student", startedAt: "2026-10-23T01:00:00.000Z" };
const submittedAt = "2026-10-23T01:01:00.000Z";
function rubricBank() {
  const old = groupedAdaptiveBank();
  return approveBank(parseJapaneseBank({ ...old, schemaVersion: 5, id: "synthetic-rubric",
    assessment: { ...old.assessment, revision: "japanese-jlpt-rubric-v1", minimumAnswers: 12, minimumDomains: 4,
      referenceSources: ["https://www.jlpt.jp/e/about/levelsummary.html", "https://www.jlpt.jp/e/guideline/testsections.html"] },
    items: old.items.map((item) => ({ ...item, calibration: null, placementRole: ["reading", "writing"].includes(item.domain) ? "anchor" : "support",
      ...(["reading", "writing"].includes(item.domain) ? { placementRationale: "Synthetic task-alignment fixture only" } : {}) })),
  }));
}

function play(ability: number, count = 24) {
  const bank = rubricBank();
  let attempt = startJapaneseAttempt(bank, start);
  for (let index = 0; index < count; index++) {
    const question = nextJapaneseQuestion(bank, attempt)!;
    const item = bank.items.find((item) => item.id === question.id)!;
    const correct = JAPANESE_STUDY_BANDS.indexOf(item.referenceBand!) <= ability;
    attempt = recordJapaneseResponse(bank, attempt, { submittedAt, ...(item.responseType === "choice"
      ? { kind: "answer", itemId: item.id, choiceId: correct ? item.correctChoiceId : item.choices.find((choice) => choice.id !== item.correctChoiceId)!.id }
      : { kind: "sentence_assembly", itemId: item.id, tileIds: correct ? item.acceptedOrders[0] : [...item.acceptedOrders[0]].reverse() }) });
  }
  return { bank, attempt };
}

describe("versioned Japanese JLPT-aligned placement rubric", () => {
  it("serves an approved v5 policy with null likelihoods, while v3/v4 retain the likelihood requirement", () => {
    const bank = rubricBank();
    expect(inspectBankReadiness(bank)).toEqual({ ready: true, issues: [] });
    const attempt = startJapaneseAttempt(bank, start);
    expect(attempt).toMatchObject({ schemaVersion: 5, policyRevision: "japanese-jlpt-rubric-v1", expiresAt: "2026-10-23T01:20:00.000Z" });
    expect(supportsJapaneseRuntime(5, "japanese-reading-writing-rubric-v1")).toBe(true);
    expect(supportsJapaneseRuntime(4, "japanese-reading-writing-rubric-v1")).toBe(false);
    const legacy = groupedAdaptiveBank(); legacy.items[0].calibration = null;
    expect(inspectBankReadiness(legacy).issues).toContain("assessment-calibration-required");
    expect(bank.items.every((item) => item.calibration === null)).toBe(true);
  });

  it.each([0, 1, 2, 3, 4, 5])("awards the supported study band for a consistent mechanics profile %s without probabilities", (ability) => {
    const { bank, attempt } = play(ability);
    const result = summarizeJapaneseAttempt(bank, attempt);
    expect(result).toMatchObject({ total: 24, answered: 24, scoringRevision: "japanese-reading-writing-rubric-v1",
      levelEstimate: { status: "estimated", basis: "jlpt_aligned_rules", provisional: true, band: JAPANESE_STUDY_BANDS[ability] } });
    expect(result.levelEstimate).not.toHaveProperty("modelRange");
    expect(japaneseResultSchema.safeParse(result).success).toBe(true);
    expect(nextJapaneseQuestion(bank, JSON.parse(JSON.stringify(attempt)))).toBeNull();
    const reading = attempt.responses.map((response) => bank.items.find((item) => item.id === response.itemId)!).filter((item) => item.domain === "reading");
    expect(new Set(reading.map((item) => item.passageId)).size).toBe(reading.length);
  });

  it("routes correct answers upward and wrong answers down, resumes deterministically and hides rule metadata", () => {
    const strong = play(5, 12), weak = play(0, 12);
    const ranks = (run: typeof strong) => run.attempt.responses.slice(6).map((response) => JAPANESE_STUDY_BANDS.indexOf(run.bank.items.find((item) => item.id === response.itemId)!.referenceBand!));
    expect(ranks(strong).reduce((a, b) => a + b)).toBeGreaterThan(ranks(weak).reduce((a, b) => a + b));
    const question = nextJapaneseQuestion(strong.bank, strong.attempt);
    expect(question).toEqual(nextJapaneseQuestion(strong.bank, JSON.parse(JSON.stringify(strong.attempt))));
    expect(JSON.stringify(question)).not.toMatch(/placementRole|referenceBand|correctChoiceId|acceptedOrders|probabilities/);
  });

  it("does not turn skips, sparse coverage or unconfirmed construction into an invented band", () => {
    const bank = rubricBank(); let attempt = startJapaneseAttempt(bank, start);
    expect(summarizeJapaneseAttempt(bank, attempt, attempt.expiresAt).levelEstimate.status).toBe("insufficient_evidence");
    for (let i = 0; i < 24; i++) attempt = recordJapaneseResponse(bank, attempt, { kind: "skip", itemId: nextJapaneseQuestion(bank, attempt)!.id, reason: "not_sure", submittedAt });
    expect(summarizeJapaneseAttempt(bank, attempt).levelEstimate.status).toBe("insufficient_evidence");
    const partial = play(5, 6);
    expect(summarizeJapaneseAttempt(partial.bank, partial.attempt, partial.attempt.expiresAt).levelEstimate.status).toBe("insufficient_evidence");
  });

  it("requires multiple independent reading successes and construction evidence for an advanced band", () => {
    const bank = rubricBank(); let attempt = startJapaneseAttempt(bank, start);
    for (let i = 0; i < 24; i++) {
      const question = nextJapaneseQuestion(bank, attempt)!;
      const item = bank.items.find((item) => item.id === question.id)!;
      attempt = recordJapaneseResponse(bank, attempt, { submittedAt, ...(item.responseType === "sentence_assembly"
        ? { kind: "sentence_assembly", itemId: item.id, tileIds: [...item.acceptedOrders[0]].reverse() }
        : { kind: "answer", itemId: item.id, choiceId: item.correctChoiceId }) });
    }
    expect(summarizeJapaneseAttempt(bank, attempt).levelEstimate).toMatchObject({ status: "insufficient_evidence", reason: "unconfirmed_reading_or_construction" });
  });

  it("keeps the absolute deadline, immutable versions and content/rights/policy checks", () => {
    const { bank, attempt } = play(5, 12);
    expect(nextJapaneseQuestion(bank, attempt, attempt.expiresAt)).toBeNull();
    expect(() => recordJapaneseResponse(bank, attempt, { kind: "skip", itemId: nextJapaneseQuestion(bank, attempt)!.id, reason: "not_sure", submittedAt: attempt.expiresAt })).toThrow(/expired/);
    const result = summarizeJapaneseAttempt(bank, attempt, attempt.expiresAt);
    expect(result.completionReason).toBe("time_limit");
    expect(() => nextJapaneseQuestion(bank, { ...attempt, policyRevision: "japanese-posterior-passages-v2" })).toThrow();
    bank.reviews.placement = null;
    expect(inspectBankReadiness(bank).issues).toContain("placement-review-required");
    approveBank(bank); const digest = bankDigest(bank);
    bank.items.find((item) => item.domain === "reading")!.placementRole = "support";
    expect(bankDigest(bank)).not.toBe(digest);
    expect(inspectBankReadiness(bank).issues).toContain("placement-review-stale");
  });

  it("rejects fabricated likelihoods, unlabelled roles, weak construction anchors and missing anchor capacity", () => {
    const value = rubricBank(); value.items[0].calibration = groupedAdaptiveBank().items[0].calibration;
    expect(() => parseJapaneseBank(value)).toThrow(/likelihood/i);
    const missing = rubricBank(); delete missing.items[0].placementRole;
    expect(() => parseJapaneseBank(missing)).toThrow(/role/i);
    const weak = rubricBank(); const item = weak.items.find((item) => item.domain === "writing")!;
    if (item.responseType !== "sentence_assembly") throw new Error("Expected assembly");
    item.tiles = item.tiles.slice(0, 2); item.acceptedOrders = [item.tiles.map((tile) => tile.id)];
    expect(() => parseJapaneseBank(weak)).toThrow(/anchor/i);
    const empty = rubricBank();
    for (const item of empty.items.filter((item) => item.domain === "reading" && item.referenceBand === "N1")) item.placementRole = "support";
    expect(inspectBankReadiness(empty).issues).toContain("insufficient-anchors:reading:N1");
  });
});
