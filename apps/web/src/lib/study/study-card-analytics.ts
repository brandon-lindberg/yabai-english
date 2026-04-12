export type StudyPracticeBand = "new" | "learning" | "weak" | "mastered";

export type StudyCardPerformanceSlice = {
  correctCount: number;
  wrongCount: number;
  streakCorrect: number;
  averageAnswerMs: number | null;
  latencySampleCount: number;
};

const MASTERED_MIN_ATTEMPTS = 8;
const MASTERED_MIN_ACCURACY = 88;
const MASTERED_MIN_STREAK = 5;

const WEAK_MIN_ATTEMPTS = 2;
const WEAK_MAX_ACCURACY = 65;

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
  if (attempts === 0) return "new";

  const acc = studyAccuracyPercent(state.correctCount, state.wrongCount) ?? 0;

  const mastered =
    attempts >= MASTERED_MIN_ATTEMPTS &&
    acc >= MASTERED_MIN_ACCURACY &&
    state.streakCorrect >= MASTERED_MIN_STREAK;
  if (mastered) return "mastered";

  const weakByAccuracy = attempts >= WEAK_MIN_ATTEMPTS && acc <= WEAK_MAX_ACCURACY;
  const weakByMistakes = attempts >= WEAK_MIN_ATTEMPTS && state.wrongCount > state.correctCount;
  if (weakByAccuracy || weakByMistakes) return "weak";

  return "learning";
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
