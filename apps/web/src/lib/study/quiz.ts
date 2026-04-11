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

/**
 * Four English choices: one correct + three distractors, shuffled.
 */
export function buildFourOptions(
  correctBackEn: string,
  distractorPool: string[],
  rng: () => number = Math.random,
): string[] {
  const correct = correctBackEn.trim();
  const correctNorm = normalizeStudyAnswer(correct);
  const seen = new Set<string>([correctNorm]);
  const distractors: string[] = [];

  for (const raw of distractorPool) {
    const t = raw.trim();
    if (!t) continue;
    const n = normalizeStudyAnswer(t);
    if (n === correctNorm || seen.has(n)) continue;
    seen.add(n);
    distractors.push(t);
    if (distractors.length >= 3) break;
  }

  let fb = 0;
  while (distractors.length < 3 && fb < FALLBACK_DISTRACTORS_EN.length) {
    const t = FALLBACK_DISTRACTORS_EN[fb++]!;
    const n = normalizeStudyAnswer(t);
    if (seen.has(n)) continue;
    seen.add(n);
    distractors.push(t);
  }

  const four = [correct, ...distractors.slice(0, 3)];
  shuffleInPlace(four, rng);
  return four;
}

export type CardQuizStateSlice = {
  correctCount: number;
  wrongCount: number;
  streakCorrect: number;
} | null;

/** Higher weight = more likely in session queue (struggling cards surface more). */
export function cardQuizWeight(state: CardQuizStateSlice): number {
  if (!state) return 12;
  const { correctCount, wrongCount, streakCorrect } = state;
  let w = 2;
  w += wrongCount * 8;
  w += Math.max(0, 6 - streakCorrect) * 2;
  if (correctCount + wrongCount === 0) w += 6;
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

/** After a quiz result, when this card can re-enter the weighted pool as "due". */
export function nextDueAtAfterQuiz(correct: boolean, streakAfter: number, now: Date): Date {
  if (!correct) {
    return new Date(now.getTime() + 45 * MS_SECOND);
  }
  if (streakAfter < 2) {
    return new Date(now.getTime() + 8 * MS_MINUTE);
  }
  if (streakAfter < 5) {
    return new Date(now.getTime() + 3 * MS_HOUR);
  }
  return new Date(now.getTime() + MS_DAY);
}

export function xpForMcq(correct: boolean): number {
  return correct ? 12 : 2;
}
