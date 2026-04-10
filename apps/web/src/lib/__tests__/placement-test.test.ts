import { describe, expect, test } from "vitest";
import {
  PLACEMENT_QUESTIONS,
  buildPlacementQuestionSet,
  evaluateWritingSample,
  getPlacementQuestionsForClient,
  scorePlacementAnswers,
} from "@/lib/placement-test";

describe("placement test quality", () => {
  test("has a professional-length question bank", () => {
    expect(PLACEMENT_QUESTIONS.length).toBeGreaterThanOrEqual(400);
  });

  test("builds randomized subset instead of full fixed test", () => {
    const set = buildPlacementQuestionSet();
    expect(set.length).toBe(24);
    const uniqueIds = new Set(set.map((q) => q.id));
    expect(uniqueIds.size).toBe(24);
  });

  test("keeps at least 100 questions per section", () => {
    const count = {
      grammar: PLACEMENT_QUESTIONS.filter((q) => q.section === "grammar").length,
      vocabulary: PLACEMENT_QUESTIONS.filter((q) => q.section === "vocabulary").length,
      reading: PLACEMENT_QUESTIONS.filter((q) => q.section === "reading").length,
      functional: PLACEMENT_QUESTIONS.filter((q) => q.section === "functional").length,
    };
    expect(count.grammar).toBeGreaterThanOrEqual(100);
    expect(count.vocabulary).toBeGreaterThanOrEqual(100);
    expect(count.reading).toBeGreaterThanOrEqual(100);
    expect(count.functional).toBeGreaterThanOrEqual(100);
  });

  test("exposes no correct answers to client", () => {
    const questions = getPlacementQuestionsForClient();
    expect(questions[0]).not.toHaveProperty("correctIndex");
  });
});

describe("placement scoring", () => {
  test("maps very low score to beginner", () => {
    const answers = Array(PLACEMENT_QUESTIONS.length).fill(0);
    const result = scorePlacementAnswers(answers);
    expect(result.level).toBe("BEGINNER");
  });

  test("maps high score to advanced", () => {
    const answers = PLACEMENT_QUESTIONS.map((q) => q.correctIndex);
    const result = scorePlacementAnswers(
      answers,
      "I would like to improve my English for work presentations and client meetings. Last month I had to explain a project delay to an overseas customer. I could describe the timeline, but I struggled to sound diplomatic when answering follow-up questions. I want to become more accurate with articles and prepositions, and I also want to write clearer summary emails after meetings.",
    );
    expect(result.level).toBe("ADVANCED");
  });

  test("writing sample returns actionable feedback", () => {
    const writing = evaluateWritingSample("I like English. I study every day.");
    expect(writing.feedbackCodes.length).toBeGreaterThan(0);
  });

  test("low reading blocks advanced placement even if other parts are strong", () => {
    const answers = PLACEMENT_QUESTIONS.map((q) =>
      q.section === "reading" ? 0 : q.correctIndex,
    );
    const result = scorePlacementAnswers(
      answers,
      "I can write formal emails and explain complex project issues to clients with clear reasons and examples.",
    );
    expect(result.level).not.toBe("ADVANCED");
  });

  test("flags manual review when writing is too short", () => {
    const answers = PLACEMENT_QUESTIONS.map((q) => q.correctIndex);
    const result = scorePlacementAnswers(answers, "I like English.");
    expect(result.needsManualReview).toBe(true);
    expect(result.manualReviewReasons).toContain("writingTooShortForConfidentPlacement");
  });
});
