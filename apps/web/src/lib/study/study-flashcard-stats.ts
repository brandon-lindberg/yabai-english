import { Prisma, type PrismaClient } from "@/generated/prisma/client";
import { classifyPracticeBand, type StudyCardPerformanceSlice } from "./study-card-analytics";
import { practiceBandSql } from "./practice-band-sql";

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

  return finishRollup({
    weakCount,
    masteredCount,
    newCount,
    learningCount,
    totalCorrect,
    totalAttempts,
    avgAccuracyPercent: null,
    avgAnswerMs: null,
    latencyWeightedSum,
    latencySamples,
  });
}

function finishRollup(rollup: FlashcardLevelPracticeRollup) {
  rollup.avgAccuracyPercent = rollup.totalAttempts > 0 ? Math.min(100, Math.round(rollup.totalCorrect / rollup.totalAttempts * 100)) : null;
  rollup.avgAnswerMs = rollup.latencySamples > 0 ? Math.round(rollup.latencyWeightedSum / rollup.latencySamples) : null;
  return rollup;
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
  return finishRollup(out);
}

type SummaryRow = { levelId: string; statesTotal: bigint; cardsTouched: bigint } & Record<"weakCount" | "masteredCount" | "learningCount" | "newCount" | "totalCorrect" | "totalAttempts" | "latencyWeightedSum" | "latencySamples", bigint | number>;
type SummaryDb = Pick<PrismaClient, "studyDeck" | "$queryRaw">;

/** Transfer one aggregate per level, never a learner's whole card history. */
export async function getFlashcardStatisticsByLevelId(
  prisma: SummaryDb,
  userId: string,
  levelIds: readonly string[],
){
  const map = new Map<string, { practice: FlashcardLevelPracticeRollup; cardsTouched: number; cardsTotal: number }>();
  for (const id of levelIds) {
    map.set(id, { practice: emptyRollup(), cardsTouched: 0, cardsTotal: 0 });
  }
  if (levelIds.length === 0) return map;

  const scope = { levelId: { in: [...levelIds] } };
  const [decks, states] = await Promise.all([
    prisma.studyDeck.findMany({ where: scope, select: { levelId: true, _count: { select: { cards: true } } } }),
    prisma.$queryRaw<SummaryRow[]>(Prisma.sql`
      SELECT d."levelId", COUNT(*) AS "statesTotal",
        COUNT(*) FILTER (WHERE s."correctCount" >= 1) AS "cardsTouched",
        COUNT(*) FILTER (WHERE ${practiceBandSql} = 'weak') AS "weakCount",
        COUNT(*) FILTER (WHERE ${practiceBandSql} = 'mastered') AS "masteredCount",
        COUNT(*) FILTER (WHERE ${practiceBandSql} = 'learning') AS "learningCount",
        COUNT(*) FILTER (WHERE ${practiceBandSql} = 'new') AS "newCount",
        SUM(s."correctCount"::bigint) AS "totalCorrect", SUM(s."correctCount"::bigint + s."wrongCount") AS "totalAttempts",
        COALESCE(SUM(s."averageAnswerMs"::bigint * s."latencySampleCount") FILTER (WHERE s."latencySampleCount" > 0 AND s."averageAnswerMs" IS NOT NULL), 0) AS "latencyWeightedSum",
        COALESCE(SUM(s."latencySampleCount"::bigint) FILTER (WHERE s."latencySampleCount" > 0 AND s."averageAnswerMs" IS NOT NULL), 0) AS "latencySamples"
      FROM "UserStudyCardState" s JOIN "StudyCard" c ON c.id = s."cardId" JOIN "StudyDeck" d ON d.id = c."deckId"
      WHERE s."userId" = ${userId} AND d."levelId" IN (${Prisma.join([...levelIds])}) GROUP BY d."levelId"`),
  ]);
  const totals = new Map<string, number>();
  for (const deck of decks) totals.set(deck.levelId, (totals.get(deck.levelId) ?? 0) + deck._count.cards);
  for (const levelId of levelIds) {
    const row = states.find(row => row.levelId === levelId), rollup = emptyRollup();
    if (row) for (const key of ["weakCount", "masteredCount", "learningCount", "newCount", "totalCorrect", "totalAttempts", "latencyWeightedSum", "latencySamples"] as const) rollup[key] = Number(row[key]);
    const cardsTotal = totals.get(levelId) ?? 0;
    rollup.newCount += Math.max(0, cardsTotal - Number(row?.statesTotal ?? 0));
    finishRollup(rollup);
    map.set(levelId, { practice: rollup, cardsTotal, cardsTouched: Number(row?.cardsTouched ?? 0) });
  }
  return map;
}

export async function getFlashcardPracticeRollupsByLevelId(prisma: SummaryDb, userId: string, levelIds: readonly string[]) {
  const summaries = await getFlashcardStatisticsByLevelId(prisma, userId, levelIds);
  return new Map([...summaries].map(([id, row]) => [id, row.practice]));
}

/** Recalculate only the changed card's contribution after the locked write. */
export function replaceFlashcardPracticeState(before: FlashcardLevelPracticeRollup, previous: StudyCardPerformanceSlice | null, next: StudyCardPerformanceSlice) {
  const contribution = (state: StudyCardPerformanceSlice | null) => rollupFlashcardPracticeForLevel(["card"], new Map(state ? [["card", state]] : []));
  const old = contribution(previous), current = contribution(next), after = { ...before };
  for (const key of ["weakCount", "masteredCount", "learningCount", "newCount", "totalCorrect", "totalAttempts", "latencyWeightedSum", "latencySamples"] as const) after[key] += current[key] - old[key];
  return finishRollup(after);
}
