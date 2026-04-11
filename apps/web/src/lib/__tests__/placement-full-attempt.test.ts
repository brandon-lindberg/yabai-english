import { describe, expect, test, vi, beforeEach, afterEach, beforeAll } from "vitest";

type RandomMode = "fixed0" | "rotate";

const rng = globalThis as unknown as {
  __placementRandomIntMode?: RandomMode;
  __placementRandomIntN?: number;
};

vi.mock("crypto", async (importOriginal) => {
  const actual = await importOriginal<typeof import("crypto")>();
  return {
    ...actual,
    randomInt: (min: number, max?: number) => {
      if (max === undefined) {
        return typeof min === "number" ? min : 0;
      }
      const mode = rng.__placementRandomIntMode ?? "fixed0";
      const span = max - min;
      if (span <= 0) return min;
      if (mode === "fixed0") return min;
      const n = rng.__placementRandomIntN ?? 0;
      rng.__placementRandomIntN = n + 1;
      return min + (n % span);
    },
  };
});

import {
  applyAdaptiveAnswer,
  buildInitialAdaptiveState,
  chooseNextAdaptiveQuestion,
  placementQuestionChoicesDedupeKey,
  placementQuestionPromptDedupeKey,
  placementQuestionStemKey,
} from "@/lib/placement-adaptive";
import { loadPlacementQuestionBankForTests } from "@/lib/placement-bank/placement-bank-test-harness";
import type { PlacementQuestion } from "@/lib/placement-test";

let pool: PlacementQuestion[] = [];

beforeAll(async () => {
  pool = await loadPlacementQuestionBankForTests();
}, 120_000);

/** Gloss from vocabulary `questionEn` (quoted headword / phrase). */
function vocabularyHeadwordGloss(questionEn: string): string | null {
  const m = questionEn.match(/^"((?:\\"|[^"])+)"$/);
  return m ? m[1]!.replace(/\\"/g, '"').toLowerCase() : null;
}

function assertNoNearDuplicatePrompts(asked: PlacementQuestion[]) {
  const n = asked.length;
  for (let i = 0; i < n; i++) {
    for (let j = i + 1; j < n; j++) {
      const a = asked[i]!;
      const b = asked[j]!;
      // Same surface template with different target words across bands is intentional.
      if (
        a.section === "vocabulary" &&
        b.section === "vocabulary" &&
        a.cefrBand !== b.cefrBand
      ) {
        continue;
      }
      if (a.section === "vocabulary" && b.section === "vocabulary") {
        const ga = vocabularyHeadwordGloss(a.questionEn);
        const gb = vocabularyHeadwordGloss(b.questionEn);
        if (
          ga &&
          gb &&
          ga === gb &&
          placementQuestionChoicesDedupeKey(a) === placementQuestionChoicesDedupeKey(b)
        ) {
          throw new Error(
            `Same vocabulary gloss and same choices in one attempt:\n---\n${a.id}: ${a.questionEn}\n---\n${b.id}: ${b.questionEn}`,
          );
        }
        continue;
      }
      // Functional items share instruction lines by design; dedupe is by `questionEn` + choice set.
      if (a.section === "functional" && b.section === "functional") {
        continue;
      }
      const bodyA = a.questionEn.trim();
      const bodyB = b.questionEn.trim();
      const dice = bigramDice(bodyA, bodyB);
      // 0.90+ catches cloned templates on the question line (instruction is often shared).
      if (dice >= 0.9 && bodyA.length > 35 && bodyB.length > 35) {
        throw new Error(
          `Similar English question lines (dice=${dice.toFixed(2)}):\n---\n${a.id}: ${bodyA}\n---\n${b.id}: ${bodyB}`,
        );
      }
    }
  }
}

function bigramDice(s1: string, s2: string): number {
  const norm = (s: string) => s.toLowerCase().replace(/\s+/g, " ").trim();
  const a = norm(s1);
  const b = norm(s2);
  if (a.length < 2 || b.length < 2) return 0;
  const grams = (s: string) => {
    const m = new Map<string, number>();
    for (let k = 0; k < s.length - 1; k++) {
      const g = s.slice(k, k + 2);
      m.set(g, (m.get(g) ?? 0) + 1);
    }
    return m;
  };
  const A = grams(a);
  const B = grams(b);
  let dot = 0;
  let na = 0;
  let nb = 0;
  for (const [, c] of A) na += c * c;
  for (const [, c] of B) nb += c * c;
  for (const [g, ca] of A) {
    const cb = B.get(g);
    if (cb) dot += ca * cb;
  }
  if (na === 0 || nb === 0) return 0;
  return dot / (Math.sqrt(na) * Math.sqrt(nb));
}

function simulateFullAttempt(
  bank: PlacementQuestion[],
  answerCorrect: (q: PlacementQuestion, stepIndex: number) => boolean,
): PlacementQuestion[] {
  let state = buildInitialAdaptiveState();
  const asked: PlacementQuestion[] = [];
  for (let step = 0; step < state.maxQuestions; step++) {
    const next = chooseNextAdaptiveQuestion(state, bank);
    expect(next, `no question at step ${step + 1}`).toBeTruthy();
    if (!next) break;
    asked.push(next);
    state = applyAdaptiveAnswer(state, next, answerCorrect(next, step));
  }
  expect(asked.length).toBe(state.maxQuestions);
  return asked;
}

function assertNoDuplicates(asked: PlacementQuestion[]) {
  const ids = asked.map((q) => q.id);
  const stems = asked.map((q) => placementQuestionStemKey(q));
  const promptBodies = asked.map((q) => placementQuestionPromptDedupeKey(q));
  const choiceSets = asked.map((q) => placementQuestionChoicesDedupeKey(q));

  expect(new Set(ids).size).toBe(asked.length);
  expect(new Set(stems).size).toBe(asked.length);
  expect(new Set(promptBodies).size).toBe(asked.length);
  expect(new Set(choiceSets).size).toBe(asked.length);
  assertNoNearDuplicatePrompts(asked);
}

describe("full placement attempt (24 adaptive)", () => {
  beforeEach(() => {
    rng.__placementRandomIntMode = "fixed0";
    rng.__placementRandomIntN = 0;
  });

  afterEach(() => {
    delete rng.__placementRandomIntMode;
    delete rng.__placementRandomIntN;
  });

  test("all correct: 0 duplicate ids, stems, prompt bodies, choice sets; no near-duplicate EN bodies", () => {
    const asked = simulateFullAttempt(pool, () => true);
    assertNoDuplicates(asked);
  });

  test("randomInt rotates among ties: still 0 duplicates", () => {
    rng.__placementRandomIntMode = "rotate";
    rng.__placementRandomIntN = 0;
    const asked = simulateFullAttempt(pool, () => true);
    assertNoDuplicates(asked);
  });

  test("mixed correct/incorrect: still 0 duplicates", () => {
    const asked = simulateFullAttempt(pool, (_q, i) => i % 3 !== 1);
    assertNoDuplicates(asked);
  });
});
