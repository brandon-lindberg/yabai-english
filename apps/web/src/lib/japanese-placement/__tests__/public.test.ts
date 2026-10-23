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
