import { beforeAll, describe, expect, test } from "vitest";
import { bankDigest, JAPANESE_STUDY_BANDS, type JapanesePlacementBank } from "../bank";
import { initialJapaneseEvidence, selectJapaneseItem, updateJapaneseEvidence, estimateJapaneseLevel } from "../adaptive";
import { loadReleasedJapaneseBank } from "../release";
import { startJapaneseAttempt, nextJapaneseQuestion, recordJapaneseResponse, summarizeJapaneseAttempt, type JapaneseResponse } from "../attempt";
import { japaneseResultSchema } from "../public";

const policy = "japanese-jlpt-staircase-v2" as const;
const start = { id: "staircase-attempt", learnerId: "student", startedAt: "2026-10-27T01:00:00.000Z" };
// Full-attempt simulations repeatedly validate and replay the released 470-item bank.
const fullAttemptTimeoutMs = 20_000;
let bank: JapanesePlacementBank;
beforeAll(async () => { bank = await loadReleasedJapaneseBank("data/japanese-placement", "public"); });
function answer(item: JapanesePlacementBank["items"][number], correct: boolean): JapaneseResponse {
  return { submittedAt: "2026-10-27T01:01:00.000Z", ...(item.responseType === "choice"
    ? { kind: "answer", itemId: item.id, choiceId: correct ? item.correctChoiceId : item.choices.find(c => c.id !== item.correctChoiceId)!.id }
    : { kind: "sentence_assembly", itemId: item.id, tileIds: correct ? item.acceptedOrders[0] : [...item.acceptedOrders[0]].reverse() }) };
}

describe("Japanese independently versioned N5-first staircase", () => {
  test("matches the owner's exact opening without kana advancing the ladder", () => {
    let attempt = startJapaneseAttempt(bank, start, policy);
    const path: string[] = [];
    const responses = [true, false, false, true, true, true, true];
    for (let i = 0; i < 8; i++) {
      const question = nextJapaneseQuestion(bank, attempt)!;
      const item = bank.items.find(q => q.id === question.id)!;
      expect(item.domain).not.toBe("kana");
      path.push(item.referenceBand!);
      if (i < responses.length) attempt = recordJapaneseResponse(bank, attempt, answer(item, responses[i]));
    }
    expect(path).toEqual(["N5", "N4", "N4", "N5", "N4", "N4", "N4", "N3"]);
    expect(attempt.policyRevision).toBe(policy);
    expect(nextJapaneseQuestion(bank, JSON.parse(JSON.stringify(attempt)))).toEqual(nextJapaneseQuestion(bank, attempt));
  });

  test.each([0, 1, 2, 3, 4, 5])("preserves the source-aligned band and all quotas for mechanics profile %i", ability => {
    const evidence = initialJapaneseEvidence(policy);
    const responses: JapaneseResponse[] = [];
    for (let i = 0; i < 24; i++) {
      const item = selectJapaneseItem(bank, evidence)!;
      const response = answer(item, JAPANESE_STUDY_BANDS.indexOf(item.referenceBand!) <= ability);
      responses.push(response);
      updateJapaneseEvidence(evidence, item, response);
    }
    expect(selectJapaneseItem(bank, evidence)).toBeNull();
    expect(evidence.counts).toEqual(bank.assessment!.quotas);
    expect(estimateJapaneseLevel(bank, evidence, responses)).toMatchObject({ status: "estimated", band: JAPANESE_STUDY_BANDS[ability] });
  });

  test("pins a new policy over the unchanged approved bank while legacy replay is preserved", () => {
    const digest = bankDigest(bank);
    const legacy = startJapaneseAttempt(bank, start);
    const current = startJapaneseAttempt(bank, { ...start, id: "current" }, policy);
    expect(legacy.policyRevision).toBe("japanese-jlpt-rubric-v1");
    expect(current).toMatchObject({ policyRevision: policy, bankDigest: digest, bankVersion: bank.version, schemaVersion: 5 });
    expect(nextJapaneseQuestion(bank, legacy)?.domain).toBe("kana");
    expect(nextJapaneseQuestion(bank, current)?.domain).toBe("grammar");
    expect(bankDigest(bank)).toBe(digest);
    expect(summarizeJapaneseAttempt(bank, legacy, legacy.expiresAt)).not.toHaveProperty("timeoutAdjustment");
  });

  test.each([12, 20, 23])("qualifying timeout at %i responses has a bounded native-band penalty", count => {
    let attempt = startJapaneseAttempt(bank, start, policy);
    for (let i = 0; i < count; i++) {
      const question = nextJapaneseQuestion(bank, attempt)!;
      const item = bank.items.find(q => q.id === question.id)!;
      attempt = recordJapaneseResponse(bank, attempt, answer(item, true));
    }
    const result = summarizeJapaneseAttempt(bank, attempt, attempt.expiresAt);
    expect(result.scoringRevision).toBe("japanese-reading-writing-staircase-v2");
    expect(result.levelEstimate.status).toBe("estimated");
    expect(result.timeoutAdjustment).toMatchObject({ unanswered: 24 - count, bandReduction: 1 });
    expect(japaneseResultSchema.parse(result).timeoutAdjustment).toEqual(result.timeoutAdjustment);
    expect(result.timeoutAdjustment!.penaltyBandFraction).toBeCloseTo(0.5 * (24 - count) / 12);
    if (result.levelEstimate.status === "estimated") {
      expect(JAPANESE_STUDY_BANDS.indexOf(result.timeoutAdjustment!.unadjustedBand) - JAPANESE_STUDY_BANDS.indexOf(result.levelEstimate.band!)).toBe(1);
    }
  }, fullAttemptTimeoutMs);

  test("insufficient evidence is not turned into a penalized measured band", () => {
    let attempt = startJapaneseAttempt(bank, start, policy);
    for (let i = 0; i < 11; i++) {
      const question = nextJapaneseQuestion(bank, attempt)!;
      const item = bank.items.find(q => q.id === question.id)!;
      attempt = recordJapaneseResponse(bank, attempt, answer(item, true));
    }
    const result = summarizeJapaneseAttempt(bank, attempt, attempt.expiresAt);
    expect(result.levelEstimate.status).toBe("insufficient_evidence");
    expect(result).not.toHaveProperty("timeoutAdjustment");
  });

  test("completed skips are not counted a second time as timeout-unanswered work", () => {
    let attempt = startJapaneseAttempt(bank, start, policy);
    for (let i = 0; i < 24; i++) {
      const question = nextJapaneseQuestion(bank, attempt)!;
      const item = bank.items.find(q => q.id === question.id)!;
      attempt = recordJapaneseResponse(bank, attempt, i === 10
        ? { kind: "skip", itemId: item.id, reason: "not_sure", submittedAt: "2026-10-27T01:01:00.000Z" }
        : answer(item, true));
    }
    const result = summarizeJapaneseAttempt(bank, attempt);
    expect(result.completionReason).toBe("question_limit");
    expect(result.answered).toBe(23);
    expect(result).not.toHaveProperty("timeoutAdjustment");
  }, fullAttemptTimeoutMs);

  test.each([[0, "BELOW_N5"], [1, "N5"]] as const)("timeout does not invent a lower basic proficiency for profile %i", (ability, bandLabel) => {
    let attempt = startJapaneseAttempt(bank, start, policy);
    for (let i = 0; i < 23; i++) {
      const question = nextJapaneseQuestion(bank, attempt)!;
      const item = bank.items.find(q => q.id === question.id)!;
      attempt = recordJapaneseResponse(bank, attempt, answer(item, JAPANESE_STUDY_BANDS.indexOf(item.referenceBand!) <= ability));
    }
    const result = summarizeJapaneseAttempt(bank, attempt, attempt.expiresAt);
    expect(result.levelEstimate).toMatchObject({ band: bandLabel });
    expect(result.timeoutAdjustment).toMatchObject({ unadjustedBand: bandLabel, bandReduction: 0 });
    expect(japaneseResultSchema.safeParse(result).success).toBe(true);
    expect(japaneseResultSchema.safeParse({ ...result, timeoutAdjustment: { ...result.timeoutAdjustment, bandReduction: 2 } }).success).toBe(false);
  }, fullAttemptTimeoutMs);
});
