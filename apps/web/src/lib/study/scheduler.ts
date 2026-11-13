import { cardQuizWeight, nextDueAtAfterQuiz, weightedSampleWithoutReplacement } from "./quiz";
import { clampAnswerTimeMs, nextAverageAnswerMs, type StudyCardPerformanceSlice } from "./study-card-analytics";

export type StudyScheduleState = StudyCardPerformanceSlice & { dueAt: Date | null };

/** Language-neutral scheduling: callers supply an already authorized card pool. */
export function buildWeightedSessionQueue<T extends { id: string }>(
  cards: T[],
  stateByCard: ReadonlyMap<string, StudyScheduleState>,
  limit: number,
  now: Date,
  rng: () => number,
  options?: { allowRepeats?: boolean },
): T[] {
  if (cards.length === 0) return [];

  const weightFn = (c: T) => {
    const st = stateByCard.get(c.id);
    return cardQuizWeight(
      st
        ? {
            correctCount: st.correctCount,
            wrongCount: st.wrongCount,
            streakCorrect: st.streakCorrect,
            averageAnswerMs: st.averageAnswerMs,
            latencySampleCount: st.latencySampleCount,
          }
        : null,
    );
  };

  const due = cards.filter((c) => {
    const st = stateByCard.get(c.id);
    return st?.dueAt != null && st.dueAt <= now;
  });

  const primaryPool = due.length > 0 ? due : cards;
  const firstBatch = weightedSampleWithoutReplacement(primaryPool, weightFn, Math.min(limit, primaryPool.length), rng);

  const queue: T[] = [...firstBatch];

  if (options?.allowRepeats === false) {
    const chosen = new Set(queue.map(card => card.id));
    queue.push(...weightedSampleWithoutReplacement(cards.filter(card => !chosen.has(card.id)), weightFn, Math.max(0, limit - queue.length), rng));
    return queue;
  }

  while (queue.length < limit) {
    const extra = weightedSampleWithoutReplacement(cards, weightFn, 1, rng)[0];
    if (!extra) break;
    queue.push(extra);
    if (queue.length > limit * 3) break;
  }

  return queue.slice(0, limit);
}


/** Shared English/Japanese performance update; grading remains content-specific. */
export function nextStudyReviewState(previous: StudyCardPerformanceSlice | null, correct: boolean, now: Date, answerTimeMs?: number) {
  const correctCount = (previous?.correctCount ?? 0) + (correct ? 1 : 0);
  const wrongCount = (previous?.wrongCount ?? 0) + (correct ? 0 : 1);
  const streakCorrect = correct ? (previous?.streakCorrect ?? 0) + 1 : 0;
  const clamped = clampAnswerTimeMs(answerTimeMs);
  const latency = clamped == null ? {
    averageAnswerMs: previous?.averageAnswerMs ?? null,
    latencySampleCount: previous?.latencySampleCount ?? 0,
  } : nextAverageAnswerMs(previous?.averageAnswerMs ?? null, previous?.latencySampleCount ?? 0, clamped);
  return { correctCount, wrongCount, streakCorrect, ...latency, reps: correctCount + wrongCount,
    dueAt: nextDueAtAfterQuiz(correct, streakCorrect, now, { answerTimeMs: clamped }) };
}
