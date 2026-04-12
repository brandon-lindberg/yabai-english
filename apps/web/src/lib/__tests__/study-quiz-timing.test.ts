import { describe, expect, it } from "vitest";
import { nextDueAtAfterQuiz } from "../study/quiz";

describe("nextDueAtAfterQuiz (latency-aware)", () => {
  const now = new Date("2026-01-15T12:00:00.000Z");

  it("matches legacy behaviour when no timing is passed", () => {
    const wrong = nextDueAtAfterQuiz(false, 0, now);
    const rightShort = nextDueAtAfterQuiz(true, 1, now);
    expect(wrong.getTime() - now.getTime()).toBe(45_000);
    expect(rightShort.getTime() - now.getTime()).toBe(8 * 60_000);
  });

  it("extends interval slightly for a fast correct answer", () => {
    const base = nextDueAtAfterQuiz(true, 1, now);
    const fast = nextDueAtAfterQuiz(true, 1, now, { answerTimeMs: 3000 });
    expect(fast.getTime()).toBeGreaterThan(base.getTime());
  });

  it("does not extend past the long-interval tier", () => {
    const slow = nextDueAtAfterQuiz(true, 5, now, { answerTimeMs: 60_000 });
    const base = nextDueAtAfterQuiz(true, 5, now);
    expect(slow.getTime()).toBeLessThanOrEqual(base.getTime());
  });
});
