import { beforeAll, describe, expect, test } from "vitest";
import {
  applyAdaptiveAnswer,
  buildInitialAdaptiveState,
  chooseNextAdaptiveQuestion,
  computeNextTargetBand,
  placementQuestionPromptDedupeKey,
  placementQuestionStemKey,
} from "@/lib/placement-adaptive";
import { loadPlacementQuestionBankForTests } from "@/lib/placement-bank/placement-bank-test-harness";
import type { PlacementQuestion } from "@/lib/placement-test";

let PLACEMENT_QUESTIONS: PlacementQuestion[] = [];

beforeAll(async () => {
  PLACEMENT_QUESTIONS = await loadPlacementQuestionBankForTests();
}, 120_000);

describe("placement adaptive engine", () => {
  test("starts with a valid first question", () => {
    const state = buildInitialAdaptiveState();
    const next = chooseNextAdaptiveQuestion(state, PLACEMENT_QUESTIONS);
    expect(next).toBeTruthy();
  });

  test("computeNextTargetBand clamps at scale ends", () => {
    expect(computeNextTargetBand(1, false)).toBe(1);
    expect(computeNextTargetBand(1, true)).toBe(2);
    expect(computeNextTargetBand(5, true)).toBe(5);
    expect(computeNextTargetBand(5, false)).toBe(4);
  });

  test("moves difficulty up after correct answer", () => {
    const state = buildInitialAdaptiveState();
    const first = chooseNextAdaptiveQuestion(state, PLACEMENT_QUESTIONS);
    expect(first).toBeTruthy();
    if (!first) return;
    const after = applyAdaptiveAnswer(state, first, true);
    expect(after.sectionState[first.section].targetBand).toBeGreaterThan(
      state.sectionState[first.section].targetBand,
    );
  });

  test("moves difficulty down after incorrect answer", () => {
    const state = buildInitialAdaptiveState();
    const first = chooseNextAdaptiveQuestion(state, PLACEMENT_QUESTIONS);
    expect(first).toBeTruthy();
    if (!first) return;
    const after = applyAdaptiveAnswer(state, first, false);
    expect(after.sectionState[first.section].targetBand).toBeLessThan(
      state.sectionState[first.section].targetBand,
    );
  });

  test("never repeats same stem in one attempt", () => {
    let state = buildInitialAdaptiveState();
    const askedStems = new Set<string>();

    while (state.askedQuestionIds.length < state.maxQuestions) {
      const next = chooseNextAdaptiveQuestion(state, PLACEMENT_QUESTIONS);
      expect(next).toBeTruthy();
      if (!next) break;
      const stem = placementQuestionStemKey(next);
      expect(askedStems.has(stem)).toBe(false);
      askedStems.add(stem);
      state = applyAdaptiveAnswer(state, next, true);
    }

    expect(state.askedQuestionIds.length).toBe(state.maxQuestions);
  });

  test("never repeats the same English prompt body in one attempt (live bank)", () => {
    let state = buildInitialAdaptiveState();
    const seenBodies = new Set<string>();

    while (state.askedQuestionIds.length < state.maxQuestions) {
      const next = chooseNextAdaptiveQuestion(state, PLACEMENT_QUESTIONS);
      expect(next).toBeTruthy();
      if (!next) break;
      const body = placementQuestionPromptDedupeKey(next);
      expect(seenBodies.has(body)).toBe(false);
      seenBodies.add(body);
      state = applyAdaptiveAnswer(state, next, true);
    }

    expect(state.askedQuestionIds.length).toBe(state.maxQuestions);
  });

  test("3 correct, 1 incorrect, 1 correct: 6th question is vocabulary at target band B1", () => {
    const bandScore = { A1: 1, A2: 2, B1: 3, B2: 4, C1: 5 } as const;
    let state = buildInitialAdaptiveState();
    const outcomes = [true, true, true, false, true] as const;
    const sections: string[] = [];

    for (let i = 0; i < 5; i++) {
      const next = chooseNextAdaptiveQuestion(state, PLACEMENT_QUESTIONS);
      expect(next, `expected a question at step ${i + 1}`).toBeTruthy();
      if (!next) return;
      sections.push(next.section);
      state = applyAdaptiveAnswer(state, next, outcomes[i]!);
    }

    expect(sections).toEqual(["grammar", "vocabulary", "reading", "functional", "grammar"]);

    expect(state.sectionState.grammar.targetBand).toBe(4);
    expect(state.sectionState.vocabulary.targetBand).toBe(3);
    expect(state.sectionState.reading.targetBand).toBe(3);
    expect(state.sectionState.functional.targetBand).toBe(1);

    const sixth = chooseNextAdaptiveQuestion(state, PLACEMENT_QUESTIONS);
    expect(sixth).toBeTruthy();
    if (!sixth) return;

    expect(sixth.section).toBe("vocabulary");
    expect(state.sectionState.vocabulary.targetBand).toBe(3);
    expect(bandScore[sixth.cefrBand]).toBe(state.sectionState.vocabulary.targetBand);
    expect(sixth.cefrBand).toBe("B1");
  });
});

function synthQuestion(
  overrides: Partial<PlacementQuestion> &
    Pick<PlacementQuestion, "id" | "section" | "cefrBand" | "promptEn" | "weight">,
): PlacementQuestion {
  return {
    stemId: overrides.stemId ?? overrides.id,
    promptJa: "テスト用",
    optionsEn: ["a", "b", "c"],
    optionsJa: ["a", "b", "c"],
    correctIndex: 0,
    ...overrides,
  };
}

describe("English prompt deduplication (synthetic pool)", () => {
  test("does not return a second grammar item whose body only differs by the item tag", () => {
    const body = "Shared grammar stem text for dedupe test.";
    const pool: PlacementQuestion[] = [
      synthQuestion({
        id: "dup-grammar-a",
        stemId: "stem-dup-a",
        section: "grammar",
        cefrBand: "A2",
        weight: 1,
        promptEn: `${body} — A2-grammar-001`,
      }),
      synthQuestion({
        id: "dup-grammar-b",
        stemId: "stem-dup-b",
        section: "grammar",
        cefrBand: "A2",
        weight: 1,
        promptEn: `${body} — A2-grammar-002`,
      }),
      synthQuestion({
        id: "uniq-grammar-c",
        stemId: "stem-uniq",
        section: "grammar",
        cefrBand: "A2",
        weight: 1,
        promptEn: "Distinct grammar copy for this pool. — A2-grammar-003",
      }),
      synthQuestion({
        id: "vocab-1",
        stemId: "v1",
        section: "vocabulary",
        cefrBand: "A2",
        weight: 1,
        promptEn: "Vocabulary pick one. — A2-vocabulary-001",
      }),
      synthQuestion({
        id: "read-1",
        stemId: "r1",
        section: "reading",
        cefrBand: "A2",
        weight: 1,
        promptEn: "Reading pick one. — A2-reading-001",
      }),
      synthQuestion({
        id: "func-1",
        stemId: "f1",
        section: "functional",
        cefrBand: "A2",
        weight: 1,
        promptEn: "Functional pick one. — A2-functional-001",
      }),
    ];

    const dupA = pool[0]!;
    let state = applyAdaptiveAnswer(buildInitialAdaptiveState(), dupA, true);
    for (let i = 0; i < 3; i++) {
      const next = chooseNextAdaptiveQuestion(state, pool);
      expect(next, `step ${i + 2}`).toBeTruthy();
      state = applyAdaptiveAnswer(state, next!, true);
    }

    const fifth = chooseNextAdaptiveQuestion(state, pool);
    expect(fifth?.section).toBe("grammar");
    expect(fifth?.id).toBe("uniq-grammar-c");
    expect(fifth?.id).not.toBe("dup-grammar-b");
  });
});
