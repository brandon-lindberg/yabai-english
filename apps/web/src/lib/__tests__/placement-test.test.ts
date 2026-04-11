import { beforeAll, describe, expect, test } from "vitest";
import { loadPlacementQuestionBankForTests } from "@/lib/placement-bank/placement-bank-test-harness";
import {
  EXPECTED_PLACEMENT_QUESTION_TOTAL,
  PLACEMENT_BANK_BANDS,
  PLACEMENT_BANK_SECTIONS,
  PLACEMENT_QUESTIONS_PER_BAND_SECTION,
  buildPlacementQuestionSet,
  getPlacementQuestionsForClient,
  scorePlacementAnswers,
  type PlacementQuestion,
} from "@/lib/placement-test";

function placementEnglishSurfaceKey(q: PlacementQuestion) {
  return `${q.instructionEn.trim()}\n${q.questionEn.trim()}`
    .toLowerCase()
    .replace(/\s+/g, " ");
}

let PLACEMENT_QUESTIONS: PlacementQuestion[] = [];

beforeAll(async () => {
  PLACEMENT_QUESTIONS = await loadPlacementQuestionBankForTests();
}, 120_000);

describe("placement test quality", () => {
  test("loads the full bank from the database", () => {
    expect(PLACEMENT_QUESTIONS.length).toBe(EXPECTED_PLACEMENT_QUESTION_TOTAL);
  });

  test("has exactly N questions per CEFR band × section", () => {
    for (const band of PLACEMENT_BANK_BANDS) {
      for (const section of PLACEMENT_BANK_SECTIONS) {
        const n = PLACEMENT_QUESTIONS.filter((q) => q.cefrBand === band && q.section === section).length;
        expect(n).toBe(PLACEMENT_QUESTIONS_PER_BAND_SECTION);
      }
    }
  });

  test("has 400 questions per CEFR band across all sections", () => {
    for (const band of PLACEMENT_BANK_BANDS) {
      const n = PLACEMENT_QUESTIONS.filter((q) => q.cefrBand === band).length;
      expect(n).toBe(PLACEMENT_BANK_SECTIONS.length * PLACEMENT_QUESTIONS_PER_BAND_SECTION);
    }
  });

  test("does not reuse the same English prompt under two different CEFR bands", () => {
    const promptToBands = new Map<string, Set<string>>();
    for (const q of PLACEMENT_QUESTIONS) {
      const key = placementEnglishSurfaceKey(q);
      if (!promptToBands.has(key)) promptToBands.set(key, new Set());
      promptToBands.get(key)!.add(q.cefrBand);
    }
    for (const bands of promptToBands.values()) {
      expect(bands.size).toBe(1);
    }
  });

  test("builds randomized subset instead of full fixed test", () => {
    const set = buildPlacementQuestionSet(PLACEMENT_QUESTIONS);
    expect(set.length).toBe(24);
    const uniqueIds = new Set(set.map((q) => q.id));
    expect(uniqueIds.size).toBe(24);
  });

  test("orders question set from easier to harder", () => {
    const order = { A1: 1, A2: 2, B1: 3, B2: 4, C1: 5 } as const;
    const set = buildPlacementQuestionSet(PLACEMENT_QUESTIONS);
    for (let i = 1; i < set.length; i++) {
      const prev = set[i - 1];
      const current = set[i];
      if (!prev || !current) continue;
      expect(order[current.cefrBand]).toBeGreaterThanOrEqual(order[prev.cefrBand]);
    }
  });

  test("avoids previously used question ids when possible", () => {
    const first = buildPlacementQuestionSet(PLACEMENT_QUESTIONS);
    const second = buildPlacementQuestionSet(PLACEMENT_QUESTIONS, first.map((q) => q.id));
    const overlap = second.filter((q) => first.some((f) => f.id === q.id)).length;
    expect(overlap).toBe(0);
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

  test("exposes no correct answers or stem keys to client", () => {
    const questions = getPlacementQuestionsForClient(PLACEMENT_QUESTIONS);
    expect(questions[0]).not.toHaveProperty("correctIndex");
    expect(questions[0]).not.toHaveProperty("stemId");
  });
});

describe("placement scoring", () => {
  test("maps very low score to beginner", () => {
    const answers = Array(PLACEMENT_QUESTIONS.length).fill(-1);
    const result = scorePlacementAnswers(answers, PLACEMENT_QUESTIONS);
    expect(result.level).toBe("BEGINNER");
    expect(result.subLevel).toBe(1);
  });

  test("maps high score to advanced", () => {
    const answers = PLACEMENT_QUESTIONS.map((q) => q.correctIndex);
    const result = scorePlacementAnswers(answers, PLACEMENT_QUESTIONS);
    expect(result.level).toBe("ADVANCED");
    expect(result.subLevel).toBeGreaterThanOrEqual(1);
    expect(result.subLevel).toBeLessThanOrEqual(3);
  });

  test("low reading blocks advanced placement even if other parts are strong", () => {
    const answers = PLACEMENT_QUESTIONS.map((q) =>
      q.section === "reading" ? 0 : q.correctIndex,
    );
    const result = scorePlacementAnswers(answers, PLACEMENT_QUESTIONS);
    expect(result.level).not.toBe("ADVANCED");
  });
});
