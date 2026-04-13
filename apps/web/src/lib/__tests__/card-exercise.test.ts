import { describe, expect, it } from "vitest";
import {
  gradeStudyCardReview,
  inferReorderExerciseFromSlashLines,
  parseStudyCardExercise,
} from "../study/card-exercise";

describe("inferReorderExerciseFromSlashLines", () => {
  it("builds a permutation from slash tokens and back sentence", () => {
    const ex = inferReorderExerciseFromSlashLines(
      "Reorder into one correct sentence:\nwant / I / to / go / to / the / store",
      "I want to go to the store.",
      "test-card",
    );
    expect(ex).not.toBeNull();
    expect(ex!.kind).toBe("reorder");
    expect(ex!.tokens.length).toBe(7);
    expect(ex!.correctTokenIds.length).toBe(7);
  });
});

describe("gradeStudyCardReview", () => {
  it("grades mcq with answersMatch", () => {
    expect(
      gradeStudyCardReview("Hello world.", null, { mode: "mcq", chosenAnswer: "  hello world. " }),
    ).toBe(true);
  });

  it("grades reorder by token id sequence", () => {
    const ex = parseStudyCardExercise({
      kind: "reorder",
      tokens: [
        { id: "a", text: "want" },
        { id: "b", text: "I" },
      ],
      correctTokenIds: ["b", "a"],
    })!;
    expect(gradeStudyCardReview("ignored", ex, { mode: "reorder", reorderTokenIds: ["b", "a"] })).toBe(true);
    expect(gradeStudyCardReview("ignored", ex, { mode: "reorder", reorderTokenIds: ["a", "b"] })).toBe(false);
  });

  it("grades multi-step with per-step canonical", () => {
    const ex = parseStudyCardExercise({
      kind: "multi_step",
      steps: [
        { prompt: "p1", canonical: "Short answer." },
        { prompt: "p2", canonical: "Longer expanded answer." },
      ],
    })!;
    expect(
      gradeStudyCardReview("ignored", ex, {
        mode: "multi_step",
        multiStepAnswers: ["Short answer.", "Longer expanded answer."],
      }),
    ).toBe(true);
  });
});
