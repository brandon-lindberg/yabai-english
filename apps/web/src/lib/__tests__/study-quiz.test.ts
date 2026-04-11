import { describe, expect, it } from "vitest";
import { answersMatch, buildFourOptions, cardQuizWeight, nextDueAtAfterQuiz, xpForMcq } from "../study/quiz";

describe("normalizeStudyAnswer / answersMatch", () => {
  it("matches case and spacing loosely", () => {
    expect(answersMatch("  Hello ", "hello")).toBe(true);
    expect(answersMatch("Good morning", "good  morning")).toBe(true);
    expect(answersMatch("Yes", "No")).toBe(false);
  });
});

describe("buildFourOptions", () => {
  it("includes correct and three distractors", () => {
    const rng = () => 0.42;
    const opts = buildFourOptions(
      "Water",
      ["Food", "Book", "Hello", "Water", "Food"],
      rng,
    );
    expect(opts).toHaveLength(4);
    expect(opts).toContain("Water");
    expect(new Set(opts).size).toBe(4);
  });
});

describe("cardQuizWeight", () => {
  it("weights struggling cards higher", () => {
    expect(cardQuizWeight(null)).toBeLessThan(cardQuizWeight({ correctCount: 0, wrongCount: 4, streakCorrect: 0 }));
    expect(cardQuizWeight({ correctCount: 10, wrongCount: 0, streakCorrect: 8 })).toBeLessThan(
      cardQuizWeight({ correctCount: 1, wrongCount: 3, streakCorrect: 0 }),
    );
  });
});

describe("nextDueAtAfterQuiz", () => {
  const t0 = new Date("2026-06-01T12:00:00.000Z");

  it("returns sooner due on wrong", () => {
    const d = nextDueAtAfterQuiz(false, 0, t0);
    expect(d.getTime() - t0.getTime()).toBeLessThan(120_000);
  });

  it("returns later due on strong streak", () => {
    const d = nextDueAtAfterQuiz(true, 5, t0);
    expect(d.getTime() - t0.getTime()).toBeGreaterThanOrEqual(86_400_000 - 1000);
  });
});

describe("xpForMcq", () => {
  it("rewards correct more than wrong", () => {
    expect(xpForMcq(true)).toBeGreaterThan(xpForMcq(false));
  });
});
