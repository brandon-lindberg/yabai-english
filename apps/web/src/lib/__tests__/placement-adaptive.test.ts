import { beforeAll, describe, expect, test } from "vitest";
import {
  applyAdaptiveAnswer,
  buildInitialAdaptiveState,
  chooseNextAdaptiveQuestion,
  computeNextTargetBand,
  placementQuestionChoicesDedupeKey,
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

  test("never repeats the same MCQ choice set in one attempt (live bank)", () => {
    let state = buildInitialAdaptiveState();
    const seenChoices = new Set<string>();

    while (state.askedQuestionIds.length < state.maxQuestions) {
      const next = chooseNextAdaptiveQuestion(state, PLACEMENT_QUESTIONS);
      expect(next).toBeTruthy();
      if (!next) break;
      const ck = placementQuestionChoicesDedupeKey(next);
      expect(seenChoices.has(ck)).toBe(false);
      seenChoices.add(ck);
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
    Pick<PlacementQuestion, "id" | "section" | "cefrBand" | "questionEn" | "weight">,
): PlacementQuestion {
  return {
    stemId: overrides.stemId ?? overrides.id,
    instructionEn: "Choose the best option.",
    instructionJa: "テスト用の指示",
    questionJa: "テスト用の質問",
    optionsEn: ["a", "b", "c"],
    optionsJa: ["a", "b", "c"],
    correctIndex: 0,
    ...overrides,
  };
}

describe("English prompt deduplication (synthetic pool)", () => {
  test("does not return a second grammar item with the same question line as an already-asked row", () => {
    const body = "Shared grammar stem text for dedupe test.";
    const pool: PlacementQuestion[] = [
      synthQuestion({
        id: "dup-grammar-a",
        stemId: "stem-dup-a",
        section: "grammar",
        cefrBand: "A2",
        weight: 1,
        questionEn: body,
        optionsEn: ["ga1", "ga2", "ga3"],
        optionsJa: ["が1", "が2", "が3"],
      }),
      synthQuestion({
        id: "dup-grammar-b",
        stemId: "stem-dup-b",
        section: "grammar",
        cefrBand: "A2",
        weight: 1,
        questionEn: body,
        optionsEn: ["gb1", "gb2", "gb3"],
        optionsJa: ["ぎ1", "ぎ2", "ぎ3"],
      }),
      synthQuestion({
        id: "uniq-grammar-c",
        stemId: "stem-uniq",
        section: "grammar",
        cefrBand: "A2",
        weight: 1,
        questionEn: "Distinct grammar copy for this pool.",
        optionsEn: ["gc1", "gc2", "gc3"],
        optionsJa: ["ぐ1", "ぐ2", "ぐ3"],
      }),
      synthQuestion({
        id: "vocab-1",
        stemId: "v1",
        section: "vocabulary",
        cefrBand: "A2",
        weight: 1,
        questionEn: "Vocabulary pick one.",
        optionsEn: ["v1", "v2", "v3"],
        optionsJa: ["ぶ1", "ぶ2", "ぶ3"],
      }),
      synthQuestion({
        id: "read-1",
        stemId: "r1",
        section: "reading",
        cefrBand: "A2",
        weight: 1,
        questionEn: "Reading pick one.",
        optionsEn: ["r1", "r2", "r3"],
        optionsJa: ["あ1", "あ2", "あ3"],
      }),
      synthQuestion({
        id: "func-1",
        stemId: "f1",
        section: "functional",
        cefrBand: "A2",
        weight: 1,
        questionEn: "Functional pick one.",
        optionsEn: ["f1", "f2", "f3"],
        optionsJa: ["ふ1", "ふ2", "ふ3"],
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

describe("MCQ choice deduplication (synthetic pool)", () => {
  test("does not return a second grammar row with the same option lines as an already-asked row", () => {
    const optsEn = ["Reuse opt A", "Reuse opt B", "Reuse opt C"];
    const optsJa = ["再利用A", "再利用B", "再利用C"];
    const pool: PlacementQuestion[] = [
      synthQuestion({
        id: "choice-grammar-1",
        stemId: "stem-c1",
        section: "grammar",
        cefrBand: "A2",
        weight: 1,
        questionEn: "Wording one for same choices.",
        optionsEn: optsEn,
        optionsJa: optsJa,
        correctIndex: 0,
      }),
      synthQuestion({
        id: "choice-grammar-2",
        stemId: "stem-c2",
        section: "grammar",
        cefrBand: "A2",
        weight: 1,
        questionEn: "Different wording but identical answers on screen.",
        optionsEn: [...optsEn],
        optionsJa: [...optsJa],
        correctIndex: 1,
      }),
      synthQuestion({
        id: "choice-grammar-3",
        stemId: "stem-c3",
        section: "grammar",
        cefrBand: "A2",
        weight: 1,
        questionEn: "Unique choices wording.",
        optionsEn: ["Only", "Other", "Strings"],
        optionsJa: ["だけ", "別", "列"],
        correctIndex: 0,
      }),
      synthQuestion({
        id: "vocab-choice",
        stemId: "vc1",
        section: "vocabulary",
        cefrBand: "A2",
        weight: 1,
        questionEn: "Vocab with unique opts.",
        optionsEn: ["v1", "v2", "v3"],
        optionsJa: ["ぶ1", "ぶ2", "ぶ3"],
      }),
      synthQuestion({
        id: "read-choice",
        stemId: "rc1",
        section: "reading",
        cefrBand: "A2",
        weight: 1,
        questionEn: "Reading unique opts.",
        optionsEn: ["r1", "r2", "r3"],
        optionsJa: ["あ1", "あ2", "あ3"],
      }),
      synthQuestion({
        id: "func-choice",
        stemId: "fc1",
        section: "functional",
        cefrBand: "A2",
        weight: 1,
        questionEn: "Functional unique opts.",
        optionsEn: ["f1", "f2", "f3"],
        optionsJa: ["ふ1", "ふ2", "ふ3"],
      }),
    ];

    const firstGrammar = pool[0]!;
    let state = applyAdaptiveAnswer(buildInitialAdaptiveState(), firstGrammar, true);
    for (let i = 0; i < 3; i++) {
      const next = chooseNextAdaptiveQuestion(state, pool);
      expect(next, `step ${i + 2}`).toBeTruthy();
      state = applyAdaptiveAnswer(state, next!, true);
    }

    const fifth = chooseNextAdaptiveQuestion(state, pool);
    expect(fifth?.section).toBe("grammar");
    expect(fifth?.id).toBe("choice-grammar-3");
    expect(fifth?.id).not.toBe("choice-grammar-2");
  });
});
