import { matchesPracticeCondition, STUDY_PRACTICE_FALLBACK, STUDY_PRACTICE_RULES } from "./practice-band-policy";
export type StudyPracticeBand = "new" | "learning" | "weak" | "mastered";

export type StudyCardPerformanceSlice = {
  correctCount: number;
  wrongCount: number;
  streakCorrect: number;
  averageAnswerMs: number | null;
  latencySampleCount: number;
};

export function studyAttemptCount(correctCount: number, wrongCount: number): number {
  return correctCount + wrongCount;
}

/** Whole percent 0–100, or null if no attempts. */
export function studyAccuracyPercent(correctCount: number, wrongCount: number): number | null {
  const n = studyAttemptCount(correctCount, wrongCount);
  if (n === 0) return null;
  return Math.min(100, Math.round((correctCount / n) * 100));
}

/** Wrong answers / attempts; null if no attempts. */
export function mistakeRate(correctCount: number, wrongCount: number): number | null {
  const n = studyAttemptCount(correctCount, wrongCount);
  if (n === 0) return null;
  return wrongCount / n;
}

export function clampAnswerTimeMs(raw: number | undefined | null): number | null {
  if (raw == null || !Number.isFinite(raw)) return null;
  if (raw < 250) return null;
  return Math.min(300_000, Math.floor(raw));
}

export function nextAverageAnswerMs(
  prevAvg: number | null,
  prevSamples: number,
  newMs: number,
): { averageAnswerMs: number; latencySampleCount: number } {
  const n = prevSamples + 1;
  const base = prevSamples === 0 || prevAvg == null ? 0 : prevAvg * prevSamples;
  const averageAnswerMs = Math.round((base + newMs) / n);
  return { averageAnswerMs, latencySampleCount: n };
}

export function classifyPracticeBand(state: StudyCardPerformanceSlice | null | undefined): StudyPracticeBand {
  if (!state) return "new";
  const attempts = studyAttemptCount(state.correctCount, state.wrongCount);
  const acc = studyAccuracyPercent(state.correctCount, state.wrongCount) ?? 0;
  const metrics = { ...state, attempts, accuracy: acc };
  return STUDY_PRACTICE_RULES.find(rule => matchesPracticeCondition(rule.when, metrics))?.band ?? STUDY_PRACTICE_FALLBACK;
}

/** Distractors to pair with the correct answer (total options = 1 + count). */
export function mcqDistractorCountForBand(band: StudyPracticeBand): 2 | 3 {
  return band === "mastered" ? 2 : 3;
}

export function filterCardIdsByFocus(
  cards: readonly { id: string }[],
  stateByCardId: Map<string, StudyCardPerformanceSlice | undefined>,
  focus: "weak" | "mastered" | "mixed",
): string[] {
  if (focus === "mixed") return cards.map((c) => c.id);
  return cards
    .filter((c) => {
      const band = classifyPracticeBand(stateByCardId.get(c.id));
      return focus === "weak" ? band === "weak" : band === "mastered";
    })
    .map((c) => c.id);
}
