import { expect, test } from "vitest";
import { japaneseResponseInputSchema } from "../attempt";

test("client responses exclude server-owned identity, time, scores and state", () => {
  const input = { kind: "answer", itemId: "kana-one", choiceId: "a" };
  expect(japaneseResponseInputSchema.parse(input)).toEqual(input);
  for (const extra of [
    { submittedAt: "2026-10-22T00:00:00.000Z" }, { learnerId: "other" }, { correct: true },
    { bankDigest: "a".repeat(64) }, { responses: [] },
  ]) expect(japaneseResponseInputSchema.safeParse({ ...input, ...extra }).success).toBe(false);
});
