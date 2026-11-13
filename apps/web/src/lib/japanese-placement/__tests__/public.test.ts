import { expect, test } from "vitest";
import { japaneseQuestionSchema, japaneseResultSchema } from "../public";
import { nextJapaneseQuestion, recordJapaneseResponse, startJapaneseAttempt, summarizeJapaneseAttempt } from "../attempt";
import { approvedBank } from "./fixtures";

test("the engine satisfies the client projection without exposing private bank material", () => {
  const bank = approvedBank();
  let attempt = startJapaneseAttempt(bank, { id: "public", learnerId: "learner", startedAt: "2026-10-22T00:00:00.000Z" });
  for (;;) {
    const question = nextJapaneseQuestion(bank, attempt);
    if (!question) break;
    expect(japaneseQuestionSchema.parse(question)).toEqual(question);
    expect(() => japaneseQuestionSchema.parse({ ...question, acceptedOrders: [] })).toThrow();
    attempt = recordJapaneseResponse(bank, attempt, { kind: "skip", itemId: question.id, reason: "not_sure", submittedAt: "2026-10-22T00:01:00.000Z" });
  }
  expect(japaneseResultSchema.parse(summarizeJapaneseAttempt(bank, attempt))).toMatchObject({ levelEstimate: { status: "insufficient_evidence" } });
});

test("distinguishes rubric estimates from historical model ranges in the public contract", () => {
  const bank = approvedBank();
  const attempt = startJapaneseAttempt(bank, { id: "public-rules", learnerId: "learner", startedAt: "2026-10-23T00:00:00.000Z" });
  const result = summarizeJapaneseAttempt(bank, attempt, attempt.expiresAt);
  const estimate = { status: "estimated", scope: "reading_writing", band: "N3", provisional: true };
  expect(japaneseResultSchema.safeParse({ ...result, levelEstimate: { ...estimate, basis: "jlpt_aligned_rules" } }).success).toBe(true);
  expect(japaneseResultSchema.safeParse({ ...result, levelEstimate: { ...estimate, modelRange: { lower: "N4", upper: "N2" } } }).success).toBe(true);
  expect(japaneseResultSchema.safeParse({ ...result, levelEstimate: estimate }).success).toBe(false);
  expect(japaneseResultSchema.safeParse({ ...result, levelEstimate: { ...estimate, basis: "jlpt_aligned_rules", modelRange: { lower: "N4", upper: "N2" } } }).success).toBe(false);
});
