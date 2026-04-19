import type { PrismaClient } from "@/generated/prisma/client";
import { classifyPracticeBand, type StudyCardPerformanceSlice } from "./study-card-analytics";

export type FlashcardLevelPracticeRollup = {
  weakCount: number;
  masteredCount: number;
  newCount: number;
  learningCount: number;
  totalCorrect: number;
  totalAttempts: number;
  avgAccuracyPercent: number | null;
  avgAnswerMs: number | null;
  /** Internal for combining levels — Σ(answerTime × samples) per card. */
  latencyWeightedSum: number;
  latencySamples: number;
};

function emptyRollup(): FlashcardLevelPracticeRollup {
  return {
    weakCount: 0,
    masteredCount: 0,
    newCount: 0,
    learningCount: 0,
    totalCorrect: 0,
    totalAttempts: 0,
    avgAccuracyPercent: null,
    avgAnswerMs: null,
    latencyWeightedSum: 0,
    latencySamples: 0,
  };
}

export function rollupFlashcardPracticeForLevel(
  cardIds: readonly string[],
  stateByCardId: Map<string, StudyCardPerformanceSlice | undefined>,
): FlashcardLevelPracticeRollup {
  if (cardIds.length === 0) return emptyRollup();

  let weakCount = 0;
  let masteredCount = 0;
  let newCount = 0;
  let learningCount = 0;
  let totalCorrect = 0;
  let totalAttempts = 0;
  let latencyWeightedSum = 0;
  let latencySamples = 0;

  for (const id of cardIds) {
    const st = stateByCardId.get(id);
    const band = classifyPracticeBand(st);
    if (band === "weak") weakCount += 1;
    else if (band === "mastered") masteredCount += 1;
    else if (band === "new") newCount += 1;
    else learningCount += 1;

    if (st) {
      totalCorrect += st.correctCount;
      totalAttempts += st.correctCount + st.wrongCount;
      if (st.latencySampleCount > 0 && st.averageAnswerMs != null) {
        latencyWeightedSum += st.averageAnswerMs * st.latencySampleCount;
        latencySamples += st.latencySampleCount;
      }
    }
  }

  const avgAccuracyPercent =
    totalAttempts > 0 ? Math.min(100, Math.round((totalCorrect / totalAttempts) * 100)) : null;
  const avgAnswerMs =
    latencySamples > 0 ? Math.round(latencyWeightedSum / latencySamples) : null;

  return {
    weakCount,
    masteredCount,
    newCount,
    learningCount,
    totalCorrect,
    totalAttempts,
    avgAccuracyPercent,
    avgAnswerMs,
    latencyWeightedSum,
    latencySamples,
  };
}

/** Sum rollups across levels (e.g. dashboard “whole track” row). */
export function combineTrackPracticeRollups(
  parts: readonly FlashcardLevelPracticeRollup[],
): FlashcardLevelPracticeRollup {
  const out = emptyRollup();
  for (const r of parts) {
    out.weakCount += r.weakCount;
    out.masteredCount += r.masteredCount;
    out.newCount += r.newCount;
    out.learningCount += r.learningCount;
    out.totalCorrect += r.totalCorrect;
    out.totalAttempts += r.totalAttempts;
    out.latencyWeightedSum += r.latencyWeightedSum;
    out.latencySamples += r.latencySamples;
  }
  out.avgAccuracyPercent =
    out.totalAttempts > 0 ? Math.min(100, Math.round((out.totalCorrect / out.totalAttempts) * 100)) : null;
  out.avgAnswerMs =
    out.latencySamples > 0 ? Math.round(out.latencyWeightedSum / out.latencySamples) : null;
  return out;
}

function stateFromRow(row: {
  correctCount: number;
  wrongCount: number;
  streakCorrect: number;
  averageAnswerMs: number | null;
  latencySampleCount: number;
}): StudyCardPerformanceSlice {
  return {
    correctCount: row.correctCount,
    wrongCount: row.wrongCount,
    streakCorrect: row.streakCorrect,
    averageAnswerMs: row.averageAnswerMs,
    latencySampleCount: row.latencySampleCount,
  };
}

/** Per-level flashcard practice analytics for a track (one query). */
export async function getFlashcardPracticeRollupsByLevelId(
  prisma: PrismaClient,
  userId: string,
  levelIds: readonly string[],
): Promise<Map<string, FlashcardLevelPracticeRollup>> {
  const map = new Map<string, FlashcardLevelPracticeRollup>();
  for (const id of levelIds) {
    map.set(id, emptyRollup());
  }
  if (levelIds.length === 0) return map;

  const cards = await prisma.studyCard.findMany({
    where: { deck: { levelId: { in: [...levelIds] } } },
    select: { id: true, deck: { select: { levelId: true } } },
  });

  const states = await prisma.userStudyCardState.findMany({
    where: { userId, cardId: { in: cards.map((c) => c.id) } },
    select: {
      cardId: true,
      correctCount: true,
      wrongCount: true,
      streakCorrect: true,
      averageAnswerMs: true,
      latencySampleCount: true,
    },
  });
  const stateByCard = new Map(states.map((s) => [s.cardId, stateFromRow(s)]));

  const idsByLevel = new Map<string, string[]>();
  for (const c of cards) {
    const lid = c.deck.levelId;
    const arr = idsByLevel.get(lid) ?? [];
    arr.push(c.id);
    idsByLevel.set(lid, arr);
  }

  for (const levelId of levelIds) {
    const ids = idsByLevel.get(levelId) ?? [];
    map.set(levelId, rollupFlashcardPracticeForLevel(ids, stateByCard));
  }
  return map;
}
