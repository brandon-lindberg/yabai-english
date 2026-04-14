import { describe, expect, it } from "vitest";
import {
  gradeStudyCardReview,
  inferReorderExerciseFromBlankPrompt,
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

describe("inferReorderExerciseFromBlankPrompt", () => {
  it("builds reorder exercise for single blank prompts", () => {
    const ex = inferReorderExerciseFromBlankPrompt(
      "Fill in the blank: He ___ a bit nervous before presentations.",
      "He seems a bit nervous before presentations.",
      "test-blank",
    );
    expect(ex).not.toBeNull();
    expect(ex!.kind).toBe("reorder");
    expect(ex!.tokens.length).toBeGreaterThan(2);
    expect(ex!.correctTokenIds.length).toBe(ex!.tokens.length);
  });

  it("returns null when no blank token exists", () => {
    const ex = inferReorderExerciseFromBlankPrompt(
      "Translate: 彼は少し緊張している",
      "He seems a bit nervous.",
      "test-blank",
    );
    expect(ex).toBeNull();
  });
});

describe("gradeStudyCardReview", () => {
  it("grades mcq with answersMatch", () => {
    expect(
      gradeStudyCardReview(
        { frontJa: "", backEn: "Hello world." },
        null,
        { mode: "mcq", chosenAnswer: "  hello world. " },
      ),
    ).toBe(true);
  });

  it("grades blank-fill mcq against the fragment only", () => {
    const frontJa = "Ability: She ___ three languages fluently. (speak — can)";
    const backEn = "She can speak three languages fluently.";
    expect(
      gradeStudyCardReview({ frontJa, backEn }, null, { mode: "mcq", chosenAnswer: "can speak" }),
    ).toBe(true);
    expect(
      gradeStudyCardReview({ frontJa, backEn }, null, {
        mode: "mcq",
        chosenAnswer: "She can speak three languages fluently.",
      }),
    ).toBe(false);
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
    expect(
      gradeStudyCardReview({ frontJa: "", backEn: "ignored" }, ex, {
        mode: "reorder",
        reorderTokenIds: ["b", "a"],
      }),
    ).toBe(true);
    expect(
      gradeStudyCardReview({ frontJa: "", backEn: "ignored" }, ex, {
        mode: "reorder",
        reorderTokenIds: ["a", "b"],
      }),
    ).toBe(false);
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
      gradeStudyCardReview({ frontJa: "", backEn: "ignored" }, ex, {
        mode: "multi_step",
        multiStepAnswers: ["Short answer.", "Longer expanded answer."],
      }),
    ).toBe(true);
  });
});
