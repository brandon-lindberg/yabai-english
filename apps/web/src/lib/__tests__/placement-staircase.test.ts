import { describe, expect, test } from "vitest";
import { buildInitialAdaptiveState, chooseNextAdaptiveQuestion, applyAdaptiveAnswer } from "@/lib/placement-adaptive";
import { loadPlacementBankSync } from "@/lib/placement-bank/load-placement-bank";

const bank = loadPlacementBankSync();
const outcomes = [true, false, false, true, true, true, true];

describe("English A1-first staircase", () => {
  test("does not substitute a harder starting question when the A1 pool is unavailable", () => {
    expect(chooseNextAdaptiveQuestion(buildInitialAdaptiveState(), bank.filter(q => q.cefrBand !== "A1"))).toBeNull();
  });
  test("matches the owner's exact staircase across balanced skills", () => {
    let state = buildInitialAdaptiveState();
    const path: string[] = [];
    for (let i = 0; i < 8; i++) {
      const q = chooseNextAdaptiveQuestion(state, bank)!;
      path.push(q.cefrBand);
      if (i < outcomes.length) state = applyAdaptiveAnswer(state, q, outcomes[i]);
    }
    expect(path).toEqual(["A1", "A2", "A2", "A1", "A2", "A2", "A2", "B1"]);
  });

  test("a single mistake holds the band and confirmation clears an old error", () => {
    let state = buildInitialAdaptiveState();
    const path: string[] = [];
    for (const correct of [true, false, true, true, true, false, false, true, true]) {
      const q = chooseNextAdaptiveQuestion(state, bank)!;
      path.push(q.cefrBand);
      state = applyAdaptiveAnswer(state, q, correct);
    }
    expect(path).toEqual(["A1", "A2", "A2", "A2", "A2", "B1", "B1", "A2", "A2"]);
    expect(chooseNextAdaptiveQuestion(state, bank)?.cefrBand).toBe("B1");
  });

  test.each([true, false])("stays within A1–C1, preserves the 24 unique questions and six-per-skill budget (correct=%s)", (correct) => {
    let state = buildInitialAdaptiveState();
    const ids = new Set<string>();
    for (let i = 0; i < 24; i++) {
      const q = chooseNextAdaptiveQuestion(state, bank)!;
      expect(q).toBeTruthy();
      expect(ids.has(q.id)).toBe(false);
      ids.add(q.id);
      state = applyAdaptiveAnswer(state, q, correct);
      expect(chooseNextAdaptiveQuestion(JSON.parse(JSON.stringify(state)), bank)?.cefrBand)
        .toBe(chooseNextAdaptiveQuestion(state, bank)?.cefrBand);
    }
    expect(chooseNextAdaptiveQuestion(state, bank)).toBeNull();
    expect(Object.values(state.sectionState).map(s => s.asked)).toEqual([6, 6, 6, 6]);
  });
});
