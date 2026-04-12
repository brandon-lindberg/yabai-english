import { describe, expect, it } from "vitest";
import { combineTrackPracticeRollups, rollupFlashcardPracticeForLevel } from "../study/study-flashcard-stats";

describe("rollupFlashcardPracticeForLevel", () => {
  it("counts bands and aggregates attempts", () => {
    const cardIds = ["n1", "w1", "m1", "l1"];
    const state = new Map([
      ["w1", { correctCount: 1, wrongCount: 4, streakCorrect: 0, averageAnswerMs: 8000, latencySampleCount: 2 }],
      ["m1", { correctCount: 9, wrongCount: 1, streakCorrect: 6, averageAnswerMs: 3000, latencySampleCount: 5 }],
      ["l1", { correctCount: 4, wrongCount: 1, streakCorrect: 2, averageAnswerMs: null, latencySampleCount: 0 }],
    ]);
    const r = rollupFlashcardPracticeForLevel(cardIds, state);
    expect(r.newCount).toBe(1);
    expect(r.weakCount).toBe(1);
    expect(r.masteredCount).toBe(1);
    expect(r.learningCount).toBe(1);
    expect(r.totalAttempts).toBe(20);
    expect(r.totalCorrect).toBe(14);
    expect(r.avgAccuracyPercent).toBe(70);
    expect(r.avgAnswerMs).toBe(Math.round(31000 / 7));
  });

  it("handles empty level", () => {
    const r = rollupFlashcardPracticeForLevel([], new Map());
    expect(r.totalAttempts).toBe(0);
    expect(r.totalCorrect).toBe(0);
    expect(r.avgAccuracyPercent).toBeNull();
    expect(r.avgAnswerMs).toBeNull();
  });
});

describe("combineTrackPracticeRollups", () => {
  it("sums counts across levels", () => {
    const a = rollupFlashcardPracticeForLevel(
      ["c1"],
      new Map([["c1", { correctCount: 1, wrongCount: 0, streakCorrect: 1, averageAnswerMs: 1000, latencySampleCount: 1 }]]),
    );
    const b = rollupFlashcardPracticeForLevel(
      ["c2"],
      new Map([["c2", { correctCount: 0, wrongCount: 3, streakCorrect: 0, averageAnswerMs: null, latencySampleCount: 0 }]]),
    );
    const c = combineTrackPracticeRollups([a, b]);
    expect(c.weakCount).toBe(a.weakCount + b.weakCount);
    expect(c.totalAttempts).toBe(a.totalAttempts + b.totalAttempts);
  });
});
