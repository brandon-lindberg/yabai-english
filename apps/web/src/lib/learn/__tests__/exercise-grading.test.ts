import { describe, expect, test } from "vitest";
import {
  gradeExercise,
  isGradableExerciseType,
  toPublicExerciseContent,
} from "@/lib/learn/exercise-grading";

const content = {
  promptJa: "正しい語を選んでください。",
  promptEn: "Choose the correct word.",
  options: ["arrive", "arrives", "arriving", "arrived"],
  correctIndex: 1,
};

describe("toPublicExerciseContent", () => {
  test("strips the answer key before the content reaches the browser", () => {
    const publicContent = toPublicExerciseContent("MULTIPLE_CHOICE", content);

    expect(publicContent).toEqual({
      promptJa: content.promptJa,
      promptEn: content.promptEn,
      options: content.options,
    });
    expect(publicContent).not.toHaveProperty("correctIndex");
    // Belt and braces: the key must not survive serialisation into the page.
    expect(JSON.stringify(publicContent)).not.toContain("correctIndex");
  });

  test("returns null for a type the server cannot grade, so raw content is never shipped", () => {
    expect(toPublicExerciseContent("SPELLING", content)).toBeNull();
    expect(toPublicExerciseContent("ORDERING", content)).toBeNull();
  });

  test("returns null for malformed content rather than leaking it", () => {
    expect(toPublicExerciseContent("MULTIPLE_CHOICE", { options: [] })).toBeNull();
    expect(toPublicExerciseContent("MULTIPLE_CHOICE", null)).toBeNull();
  });
});

describe("gradeExercise", () => {
  test("awards the exercise's own points for a correct answer", () => {
    const result = gradeExercise({
      type: "MULTIPLE_CHOICE",
      content,
      points: 10,
      response: { choiceIndex: 1 },
    });

    expect(result).toEqual({ ok: true, correct: true, score: 10, correctIndex: 1 });
  });

  test("scores zero for a wrong answer", () => {
    const result = gradeExercise({
      type: "MULTIPLE_CHOICE",
      content,
      points: 10,
      response: { choiceIndex: 3 },
    });

    expect(result).toEqual({ ok: true, correct: false, score: 0, correctIndex: 1 });
  });

  test("ignores any score the caller tries to supply", () => {
    // The regression this whole module exists for: the client used to send its
    // own score and the route wrote it straight through.
    const result = gradeExercise({
      type: "MULTIPLE_CHOICE",
      content,
      points: 10,
      response: { choiceIndex: 3, score: 9999, correct: true },
    });

    expect(result).toMatchObject({ ok: true, correct: false, score: 0 });
  });

  test("treats an out-of-range choice as wrong, not as an error", () => {
    for (const choiceIndex of [4, 99, 1_000_000]) {
      expect(
        gradeExercise({ type: "MULTIPLE_CHOICE", content, points: 10, response: { choiceIndex } }),
      ).toMatchObject({ ok: true, correct: false, score: 0 });
    }
  });

  test("rejects a response with no choice", () => {
    expect(
      gradeExercise({ type: "MULTIPLE_CHOICE", content, points: 10, response: {} }),
    ).toEqual({ ok: false, reason: "malformed_response" });

    expect(
      gradeExercise({
        type: "MULTIPLE_CHOICE",
        content,
        points: 10,
        response: { choiceIndex: -1 },
      }),
    ).toEqual({ ok: false, reason: "malformed_response" });

    expect(
      gradeExercise({
        type: "MULTIPLE_CHOICE",
        content,
        points: 10,
        response: { choiceIndex: 1.5 },
      }),
    ).toEqual({ ok: false, reason: "malformed_response" });
  });

  test("refuses to grade a type it does not understand", () => {
    expect(
      gradeExercise({
        type: "MATCH_PAIRS",
        content,
        points: 10,
        response: { choiceIndex: 1 },
      }),
    ).toEqual({ ok: false, reason: "unsupported_type" });
  });

  test("refuses to grade malformed stored content", () => {
    expect(
      gradeExercise({
        type: "MULTIPLE_CHOICE",
        content: { options: ["a", "b"] },
        points: 10,
        response: { choiceIndex: 0 },
      }),
    ).toEqual({ ok: false, reason: "malformed_content" });
  });

  test("never returns a negative score, even for a negative point value", () => {
    const result = gradeExercise({
      type: "MULTIPLE_CHOICE",
      content,
      points: -50,
      response: { choiceIndex: 1 },
    });

    expect(result).toMatchObject({ ok: true, correct: true, score: 0 });
  });
});

describe("isGradableExerciseType", () => {
  test("only multiple choice has a runner and a defined content shape", () => {
    expect(isGradableExerciseType("MULTIPLE_CHOICE")).toBe(true);
    for (const type of [
      "FILL_BLANK",
      "MATCH_PAIRS",
      "READING_COMPREHENSION",
      "SPELLING",
      "ORDERING",
    ] as const) {
      expect(isGradableExerciseType(type)).toBe(false);
    }
  });
});
