import { describe, expect, it } from "vitest";
import {
  answersMatch,
  buildFourOptions,
  cardQuizWeight,
  extractFillBlankAnswer,
  mcqCanonicalAnswer,
  nextDueAtAfterQuiz,
  xpForMcq,
} from "../study/quiz";

describe("normalizeStudyAnswer / answersMatch", () => {
  it("matches case and spacing loosely", () => {
    expect(answersMatch("  Hello ", "hello")).toBe(true);
    expect(answersMatch("Good morning", "good  morning")).toBe(true);
    expect(answersMatch("Yes", "No")).toBe(false);
  });
});

describe("extractFillBlankAnswer / mcqCanonicalAnswer", () => {
  it("extracts the phrase between labeled blank context and trailing hint", () => {
    const frontJa = "Ability: She ___ three languages fluently. (speak — can)";
    const backEn = "She can speak three languages fluently.";
    expect(extractFillBlankAnswer(frontJa, backEn)).toBe("can speak");
    expect(mcqCanonicalAnswer(frontJa, backEn)).toBe("can speak");
  });

  it("returns null when there is no blank", () => {
    expect(extractFillBlankAnswer("Hello", "Hello there.")).toBeNull();
    expect(mcqCanonicalAnswer("Hello", "Hello there.")).toBe("Hello there.");
  });

  it("returns null when the blank cannot be aligned to the English back", () => {
    expect(extractFillBlankAnswer("She ___ home.", "They went home.")).toBeNull();
  });

  it("handles a prompt line with only the blank and trailing question text", () => {
    expect(
      extractFillBlankAnswer(
        "They live in Sapporo. Ask how long:\n___ have you lived in Sapporo?",
        "How long have you lived in Sapporo?",
      ),
    ).toBe("How long");
  });

  it("strips only the leading speaker label before the blank", () => {
    expect(
      extractFillBlankAnswer(
        "A: Your sister is really creative.\nB: I agree — she ___ really creative.",
        "I agree — she is really creative.",
      ),
    ).toBe("is");
  });

  it("extracts multi-word fragments for \"I don't think …\" blanks", () => {
    expect(
      extractFillBlankAnswer(
        "I don't think + positive verb (expect a negative meaning).\nI ___ he will come.",
        "I don't think he will come.",
      ),
    ).toBe("don't think");
  });

  it("extracts the first word when the blank is at the start of a frequency phrase", () => {
    expect(
      extractFillBlankAnswer(
        'Short answer to "How often…?" (gym, swimming, etc.)\n___ or four times a month.',
        "Three or four times a month.",
      ),
    ).toBe("Three");
  });
});

describe("buildFourOptions", () => {
  it("includes correct and three distractors", () => {
    const rng = () => 0.42;
    const opts = buildFourOptions("Water", ["Food", "Book", "Hello", "Water", "Food"], {
      rng,
      distractorCount: 3,
    });
    expect(opts).toHaveLength(4);
    expect(opts).toContain("Water");
    expect(new Set(opts).size).toBe(4);
  });

  it("supports three-option sets for mastered-style decks", () => {
    const opts = buildFourOptions("Water", ["Food", "Book", "Hello"], {
      rng: () => 0.1,
      distractorCount: 2,
    });
    expect(opts).toHaveLength(3);
    expect(opts).toContain("Water");
  });

  it("does not always use the same three distractors from pool order (anti-pattern-memorization)", () => {
    const correct = "unique-correct-answer";
    const pool = Array.from({ length: 16 }, (_, i) => `distractor-${i}`);
    const firstThreeInPoolOrder = ["distractor-0", "distractor-1", "distractor-2"].sort().join("|");

    let sawDifferentWrongSet = false;
    for (let run = 0; run < 80; run++) {
      let s = (501 * run + 17) >>> 0;
      const rng = () => {
        s = (Math.imul(s, 1664525) + 1013904223) >>> 0;
        return s / 0x100000000;
      };
      const opts = buildFourOptions(correct, pool, { rng, distractorCount: 3 });
      const wrongSorted = opts
        .filter((x) => x !== correct)
        .sort()
        .join("|");
      if (wrongSorted !== firstThreeInPoolOrder) {
        sawDifferentWrongSet = true;
        break;
      }
    }
    expect(sawDifferentWrongSet).toBe(true);
  });

  it("samples many distinct distractor triples over repeated builds with varied RNG", () => {
    const correct = "target-phrase";
    const pool = Array.from({ length: 24 }, (_, i) => `option-${i}`);
    const wrongSets = new Set<string>();
    for (let run = 0; run < 50; run++) {
      let s = (run * 1103515245 + 12345) >>> 0;
      const rng = () => {
        s = (Math.imul(s, 48271) + 7) >>> 0;
        return s / 0x100000000;
      };
      const opts = buildFourOptions(correct, pool, { rng, distractorCount: 3 });
      const wrong = opts
        .filter((x) => x !== correct)
        .sort()
        .join("|");
      wrongSets.add(wrong);
    }
    expect(wrongSets.size).toBeGreaterThan(12);
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
