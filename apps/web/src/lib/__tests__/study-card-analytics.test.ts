import { describe, expect, it } from "vitest";
import {
  classifyPracticeBand,
  clampAnswerTimeMs,
  filterCardIdsByFocus,
  mcqDistractorCountForBand,
  mistakeRate,
  nextAverageAnswerMs,
  studyAccuracyPercent,
  studyAttemptCount,
} from "../study/study-card-analytics";

function slice(
  partial: Partial<{
    correctCount: number;
    wrongCount: number;
    streakCorrect: number;
    averageAnswerMs: number | null;
    latencySampleCount: number;
  }> = {},
) {
  return {
    correctCount: partial.correctCount ?? 0,
    wrongCount: partial.wrongCount ?? 0,
    streakCorrect: partial.streakCorrect ?? 0,
    averageAnswerMs: partial.averageAnswerMs ?? null,
    latencySampleCount: partial.latencySampleCount ?? 0,
  };
}

describe("studyAttemptCount", () => {
  it("sums correct and wrong", () => {
    expect(studyAttemptCount(3, 2)).toBe(5);
  });
});

describe("studyAccuracyPercent", () => {
  it("returns null when there are no attempts", () => {
    expect(studyAccuracyPercent(0, 0)).toBeNull();
  });

  it("is 100 when all correct", () => {
    expect(studyAccuracyPercent(4, 0)).toBe(100);
  });

  it("rounds to a whole percent", () => {
    expect(studyAccuracyPercent(1, 2)).toBe(33);
    expect(studyAccuracyPercent(2, 1)).toBe(67);
  });
});

describe("mistakeRate", () => {
  it("returns null with no attempts", () => {
    expect(mistakeRate(0, 0)).toBeNull();
  });

  it("is wrong divided by attempts", () => {
    expect(mistakeRate(7, 3)).toBeCloseTo(3 / 10, 6);
  });
});

describe("nextAverageAnswerMs", () => {
  it("sets first sample to the new time", () => {
    expect(nextAverageAnswerMs(null, 0, 5000)).toEqual({ averageAnswerMs: 5000, latencySampleCount: 1 });
  });

  it("updates running mean", () => {
    expect(nextAverageAnswerMs(4000, 3, 10000)).toEqual({ averageAnswerMs: 5500, latencySampleCount: 4 });
  });
});

describe("clampAnswerTimeMs", () => {
  it("returns null for undefined", () => {
    expect(clampAnswerTimeMs(undefined)).toBeNull();
  });

  it("clamps to a sane band", () => {
    expect(clampAnswerTimeMs(-1)).toBeNull();
    expect(clampAnswerTimeMs(500)).toBe(500);
    expect(clampAnswerTimeMs(400_000)).toBe(300_000);
  });
});

describe("classifyPracticeBand", () => {
  it("treats untouched cards as new", () => {
    expect(classifyPracticeBand(null)).toBe("new");
    expect(classifyPracticeBand(slice({ correctCount: 0, wrongCount: 0 }))).toBe("new");
  });

  it("marks mastered when accuracy, streak, and volume are strong", () => {
    expect(classifyPracticeBand(slice({ correctCount: 9, wrongCount: 1, streakCorrect: 6 }))).toBe("mastered");
  });

  it("marks weak when accuracy is low with enough data", () => {
    expect(classifyPracticeBand(slice({ correctCount: 2, wrongCount: 4, streakCorrect: 0 }))).toBe("weak");
  });

  it("marks weak when mistakes outnumber correct", () => {
    expect(classifyPracticeBand(slice({ correctCount: 2, wrongCount: 3, streakCorrect: 0 }))).toBe("weak");
  });

  it("uses learning between new and mastered", () => {
    expect(classifyPracticeBand(slice({ correctCount: 4, wrongCount: 1, streakCorrect: 2 }))).toBe("learning");
  });
});

describe("mcqDistractorCountForBand", () => {
  it("uses three distractors for most bands (four options)", () => {
    expect(mcqDistractorCountForBand("new")).toBe(3);
    expect(mcqDistractorCountForBand("weak")).toBe(3);
    expect(mcqDistractorCountForBand("learning")).toBe(3);
  });

  it("uses two distractors for mastered (slightly harder)", () => {
    expect(mcqDistractorCountForBand("mastered")).toBe(2);
  });
});

describe("filterCardIdsByFocus", () => {
  const cards = [{ id: "a" }, { id: "b" }, { id: "c" }];
  const state = new Map([
    ["a", slice({ correctCount: 9, wrongCount: 1, streakCorrect: 6 })],
    ["b", slice({ correctCount: 1, wrongCount: 4, streakCorrect: 0 })],
    ["c", slice({ correctCount: 0, wrongCount: 0, streakCorrect: 0 })],
  ]);

  it("returns all ids for mixed", () => {
    expect(filterCardIdsByFocus(cards, state, "mixed")).toEqual(["a", "b", "c"]);
  });

  it("returns only weak ids", () => {
    expect(filterCardIdsByFocus(cards, state, "weak")).toEqual(["b"]);
  });

  it("returns only mastered ids", () => {
    expect(filterCardIdsByFocus(cards, state, "mastered")).toEqual(["a"]);
  });
});
