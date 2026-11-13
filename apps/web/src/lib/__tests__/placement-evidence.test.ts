import { describe, expect, test } from "vitest";
import { loadPlacementBankSync } from "@/lib/placement-bank/load-placement-bank";
import { scorePlacementAnswers, type PlacementQuestion } from "@/lib/placement-test";
import { applyAdaptiveAnswer, buildInitialAdaptiveState, chooseNextAdaptiveQuestion } from "@/lib/placement-adaptive";

const bank = loadPlacementBankSync();
const sections = ["grammar", "vocabulary", "reading", "functional"] as const;
function questionsAt(band: PlacementQuestion["cefrBand"], count: number) {
  return Array.from({ length: count }, (_, index) => bank.filter((q) =>
    q.cefrBand === band && q.section === sections[index % 4],
  )[Math.floor(index / 4)]!);
}
function score(questions: PlacementQuestion[], completionReason: "completed" | "timeout" = "timeout") {
  return scorePlacementAnswers(questions.map((q) => q.correctIndex), questions, { version: 2, completionReason });
}

describe("English placement evidence policy v2", () => {
  test.each([
    ["A1", "BEGINNER", 2], ["A2", "BEGINNER", 3], ["B1", "INTERMEDIATE", 2],
    ["B2", "ADVANCED", 1], ["C1", "ADVANCED", 3],
  ] as const)("perfect answers at %s cannot exceed the supported app level", (band, level, subLevel) => {
    const result = score(questionsAt(band, 24), "completed");
    expect(result).toMatchObject({ level, subLevel, assessment: { policyVersion: 2, confirmedCefrBand: band, timeoutPenaltyPoints: 0 } });
  });

  test("15 accepted responses can earn a timed placement, with the maximum bounded completion penalty", () => {
    const result = score(questionsAt("C1", 15));
    expect(result).toMatchObject({ level: "ADVANCED", subLevel: 2, assessment: {
      policyVersion: 2, completionReason: "timeout", answered: 15, total: 24, minimumAnswers: 15,
      unadjustedScore: 100, adjustedScore: 90, timeoutPenaltyPoints: 10,
      unadjustedLevel: "ADVANCED", unadjustedSubLevel: 3,
    } });
  });

  test("15 easy correct answers cannot recreate an advanced award", () => {
    const result = score(questionsAt("A2", 15));
    expect(result).toMatchObject({ level: "BEGINNER", subLevel: 2, assessment: { confirmedCefrBand: "A2", unadjustedLevel: "BEGINNER", unadjustedSubLevel: 3 } });
  });

  test.each([0, 2, 12, 14])("%i answers cannot award a measured level", (count) => {
    expect(() => score(questionsAt("C1", count))).toThrow(/insufficient/i);
  });

  test("15 answers without three per skill do not meet the coverage requirement", () => {
    const questions = questionsAt("C1", 16).filter((q, index) => q.section !== "functional" || index < 8);
    questions.push(bank.filter((q) => q.section === "grammar" && q.cefrBand === "C1")[4]!);
    expect(questions).toHaveLength(15);
    expect(() => score(questions)).toThrow(/insufficient/i);
  });

  test("one high-band success cannot establish an advanced band", () => {
    const questions = questionsAt("A1", 15);
    questions[0] = questionsAt("C1", 1)[0]!;
    expect(score(questions)).toMatchObject({ level: "BEGINNER", assessment: { confirmedCefrBand: "A1" } });
  });

  test("difficulty confirmation needs repeated success including grammar and reading", () => {
    const questions = questionsAt("C1", 24);
    const answers = questions.map((q) => q.section === "reading" ? (q.correctIndex + 1) % 3 : q.correctIndex);
    const result = scorePlacementAnswers(answers, questions, { version: 2, completionReason: "completed" });
    expect(result).toMatchObject({ level: "BEGINNER", subLevel: 1, assessment: { confirmedCefrBand: null } });
  });

  test("incorrect but valid answers count toward the minimum and can establish the lowest start", () => {
    const questions = questionsAt("A1", 15);
    const result = scorePlacementAnswers(questions.map((q) => (q.correctIndex + 1) % 3), questions, { version: 2, completionReason: "timeout" });
    expect(result).toMatchObject({ level: "BEGINNER", subLevel: 1, earned: 0, assessment: { answered: 15, adjustedScore: 0, timeoutPenaltyPoints: 10 } });
  });

  test("penalty grows with unfinished work, remains bounded and costs at most one app sub-level", () => {
    let previous = Infinity;
    for (let count = 15; count <= 24; count++) {
      const result = score(questionsAt("C1", count));
      const assessment = result.assessment!;
      expect(assessment.timeoutPenaltyPoints).toBeLessThanOrEqual(previous);
      expect(assessment.timeoutPenaltyPoints).toBeGreaterThanOrEqual(0);
      expect(assessment.timeoutPenaltyPoints).toBeLessThanOrEqual(10);
      expect(assessment.adjustedScore).toBeCloseTo(100 - assessment.timeoutPenaltyPoints);
      expect(result.subLevel).toBe(count === 24 ? 3 : 2);
      previous = assessment.timeoutPenaltyPoints;
    }
    expect(previous).toBe(0);
  });

  test("invalid, repeated and incomplete-as-completed evidence cannot reach scoring", () => {
    const questions = questionsAt("C1", 15);
    expect(() => score(questions, "completed")).toThrow(/incomplete/i);
    expect(() => score([...questions.slice(0, 14), questions[0]!])).toThrow(/invalid/i);
    expect(() => scorePlacementAnswers(Array(15).fill(-1), questions, { version: 2, completionReason: "timeout" })).toThrow(/invalid/i);
  });

  test("legacy scoring remains explicit and does not acquire a new interpretation", () => {
    const questions = questionsAt("A1", 24);
    const legacy = scorePlacementAnswers(questions.map((q) => q.correctIndex), questions);
    expect(legacy).toMatchObject({ level: "ADVANCED", subLevel: 3 });
    expect(legacy).not.toHaveProperty("assessment");
  });

  test.each([
    ["A1", "BEGINNER", 2], ["A2", "BEGINNER", 3], ["B1", "INTERMEDIATE", 2],
    ["B2", "ADVANCED", 1], ["C1", "ADVANCED", 3],
  ] as const)("a full adaptive %s mechanics profile retains its demonstrated band despite harder probe errors", (ability, level, subLevel) => {
    const bands = ["A1", "A2", "B1", "B2", "C1"];
    let state = buildInitialAdaptiveState();
    const questions: PlacementQuestion[] = [];
    const answers: number[] = [];
    for (let i = 0; i < 24; i++) {
      const question = chooseNextAdaptiveQuestion(state, bank)!;
      expect(question).toBeTruthy();
      const correct = bands.indexOf(question.cefrBand) <= bands.indexOf(ability);
      questions.push(question);
      answers.push(correct ? question.correctIndex : (question.correctIndex + 1) % 3);
      state = applyAdaptiveAnswer(state, question, correct);
    }
    expect(scorePlacementAnswers(answers, questions, { version: 2, completionReason: "completed" }))
      .toMatchObject({ level, subLevel, assessment: { confirmedCefrBand: ability } });
  });
});
