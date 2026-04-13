import { classifyPracticeBand, type StudyCardPerformanceSlice } from "./study-card-analytics";

const MS_SECOND = 1000;
const MS_MINUTE = 60_000;
const MS_HOUR = 3_600_000;
const MS_DAY = 86_400_000;

/** Fallback distractors when the level has few unique English answers. */
const FALLBACK_DISTRACTORS_EN = [
  "It depends on the situation.",
  "She opened the window slowly.",
  "They will arrive tomorrow morning.",
  "The answer is not listed here.",
] as const;

export function normalizeStudyAnswer(s: string): string {
  return s.trim().replace(/\s+/g, " ").toLowerCase();
}

export function answersMatch(chosen: string, canonical: string): boolean {
  return normalizeStudyAnswer(chosen) === normalizeStudyAnswer(canonical);
}

function shuffleInPlace<T>(arr: T[], rng: () => number): void {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [arr[i], arr[j]] = [arr[j]!, arr[i]!];
  }
}

export type BuildMcqOptions = {
  rng?: () => number;
  /** Number of wrong choices besides the correct answer (2 → 3-option MCQ, 3 → 4-option). */
  distractorCount?: 2 | 3;
};

/**
 * English MCQ choices: one correct + `distractorCount` distractors (default 3 → four buttons).
 * Distractors are drawn from a **shuffled** candidate pool so the same wrong trio does not repeat
 * every session for the same card (reduces process-of-elimination cheating).
 */
export function buildFourOptions(
  correctBackEn: string,
  distractorPool: string[],
  opts?: BuildMcqOptions,
): string[] {
  const rng = opts?.rng ?? Math.random;
  const distractorCount = opts?.distractorCount ?? 3;
  const correct = correctBackEn.trim();
  const correctNorm = normalizeStudyAnswer(correct);

  const seenNorms = new Set<string>([correctNorm]);
  const candidates: string[] = [];

  for (const raw of distractorPool) {
    const t = raw.trim();
    if (!t) continue;
    const n = normalizeStudyAnswer(t);
    if (n === correctNorm || seenNorms.has(n)) continue;
    seenNorms.add(n);
    candidates.push(t);
  }

  shuffleInPlace(candidates, rng);
  const distractors = candidates.slice(0, distractorCount);

  if (distractors.length < distractorCount) {
    const fallbacks = [...FALLBACK_DISTRACTORS_EN];
    shuffleInPlace(fallbacks, rng);
    for (const raw of fallbacks) {
      if (distractors.length >= distractorCount) break;
      const t = raw.trim();
      const n = normalizeStudyAnswer(t);
      if (seenNorms.has(n)) continue;
      seenNorms.add(n);
      distractors.push(t);
    }
  }

  const four = [correct, ...distractors.slice(0, distractorCount)];
  shuffleInPlace(four, rng);
  return four;
}

export type CardQuizStateSlice = {
  correctCount: number;
  wrongCount: number;
  streakCorrect: number;
  averageAnswerMs?: number | null;
  latencySampleCount?: number;
} | null;

function sliceForBand(state: NonNullable<CardQuizStateSlice>): StudyCardPerformanceSlice {
  return {
    correctCount: state.correctCount,
    wrongCount: state.wrongCount,
    streakCorrect: state.streakCorrect,
    averageAnswerMs: state.averageAnswerMs ?? null,
    latencySampleCount: state.latencySampleCount ?? 0,
  };
}

/** Higher weight = more likely in session queue (struggling cards surface more). */
export function cardQuizWeight(state: CardQuizStateSlice): number {
  if (!state) return 12;
  const { wrongCount, streakCorrect } = state;
  let w = 2;
  w += wrongCount * 8;
  w += Math.max(0, 6 - streakCorrect) * 2;
  const band = classifyPracticeBand(sliceForBand(state));
  if (band === "new") w += 6;
  if (band === "weak") w += 14;
  if (band === "mastered") w = Math.max(1, w - 5);
  return w;
}

export function weightedSampleWithoutReplacement<T>(
  items: T[],
  getWeight: (item: T, index: number) => number,
  k: number,
  rng: () => number = Math.random,
): T[] {
  const n = items.length;
  const target = Math.min(k, n);
  const picks: T[] = [];
  const used = new Set<number>();

  while (picks.length < target) {
    let sum = 0;
    for (let i = 0; i < n; i++) {
      if (used.has(i)) continue;
      sum += Math.max(0.001, getWeight(items[i]!, i));
    }
    if (sum <= 0) break;
    let r = rng() * sum;
    let pickedIdx = -1;
    for (let i = 0; i < n; i++) {
      if (used.has(i)) continue;
      const w = Math.max(0.001, getWeight(items[i]!, i));
      r -= w;
      if (r <= 0) {
        pickedIdx = i;
        break;
      }
    }
    if (pickedIdx < 0) {
      for (let i = 0; i < n; i++) {
        if (!used.has(i)) {
          pickedIdx = i;
          break;
        }
      }
    }
    if (pickedIdx < 0) break;
    used.add(pickedIdx);
    picks.push(items[pickedIdx]!);
  }
  return picks;
}

export type NextDueQuizOpts = {
  /** Client-measured time from prompt shown to answer submitted (ms). */
  answerTimeMs?: number | null;
};

/** After a quiz result, when this card can re-enter the weighted pool as "due". */
export function nextDueAtAfterQuiz(
  correct: boolean,
  streakAfter: number,
  now: Date,
  opts?: NextDueQuizOpts,
): Date {
  const t = opts?.answerTimeMs;
  if (!correct) {
    return new Date(now.getTime() + 45 * MS_SECOND);
  }
  if (streakAfter < 2) {
    let ms = 8 * MS_MINUTE;
    if (t != null && t < 5000) {
      ms += Math.min(90 * MS_SECOND, (5000 - t) * 10);
    }
    return new Date(now.getTime() + ms);
  }
  if (streakAfter < 5) {
    let ms = 3 * MS_HOUR;
    if (t != null && t < 8000) {
      ms += 5 * MS_MINUTE;
    }
    return new Date(now.getTime() + ms);
  }
  let ms = MS_DAY;
  if (t != null && t > 55_000) {
    ms = Math.max(30 * MS_MINUTE, ms - 15 * MS_MINUTE);
  }
  return new Date(now.getTime() + ms);
}

export function xpForMcq(correct: boolean): number {
  return correct ? 12 : 2;
}
