import { expect, test, vi } from "vitest";
import type { PrismaClient } from "@/generated/prisma/client";
import { getFlashcardPracticeRollupsByLevelId, rollupFlashcardPracticeForLevel } from "@/lib/study/study-flashcard-stats";

test("progress counts a large catalog in the database and reads only this learner's states", async () => {
  const state = { cardId: "reviewed", correctCount: 1, wrongCount: 4, streakCorrect: 0, averageAnswerMs: 8000, latencySampleCount: 2 };
  const db = {
    studyCard: { findMany: vi.fn().mockRejectedValue(new Error("Do not load every catalog card for progress")) },
    studyDeck: { findMany: vi.fn().mockResolvedValue([
      { levelId: "N5", _count: { cards: 7000 } }, { levelId: "N5", _count: { cards: 3000 } },
      { levelId: "N4", _count: { cards: 291 } },
    ]) },
    userStudyCardState: { findMany: vi.fn(() => { throw new Error("Do not transfer learner history for summary statistics"); }) },
    $queryRaw: vi.fn().mockResolvedValue([{ levelId: "N5", weakCount: BigInt(1), masteredCount: BigInt(0), learningCount: BigInt(0), newCount: BigInt(0), statesTotal: BigInt(1), cardsTouched: BigInt(1), totalCorrect: BigInt(1), totalAttempts: BigInt(5), latencyWeightedSum: 16000, latencySamples: BigInt(2) }]),
  };
  const actual = await getFlashcardPracticeRollupsByLevelId(db as unknown as PrismaClient, "learner", ["N5", "N4", "empty"]);
  const expected = rollupFlashcardPracticeForLevel(["reviewed"], new Map([["reviewed", state]]));
  expect(actual.get("N5")).toEqual({ ...expected, newCount: 9999 });
  expect(actual.get("N4")).toMatchObject({ newCount: 291, totalAttempts: 0 });
  expect(actual.get("empty")).toEqual(rollupFlashcardPracticeForLevel([], new Map()));
  expect(db.studyCard.findMany).not.toHaveBeenCalled();
  expect(db.studyDeck.findMany).toHaveBeenCalledWith({ where: { levelId: { in: ["N5", "N4", "empty"] } }, select: { levelId: true, _count: { select: { cards: true } } } });
  expect(db.userStudyCardState.findMany).not.toHaveBeenCalled();
  expect(db.$queryRaw).toHaveBeenCalledTimes(1);
});

test("counted progress preserves new, learning, weak, mastered and weighted timing semantics", async () => {
  const states = [
    { cardId: "zero", correctCount: 0, wrongCount: 0, streakCorrect: 0, averageAnswerMs: null, latencySampleCount: 0 },
    { cardId: "learning", correctCount: 4, wrongCount: 1, streakCorrect: 2, averageAnswerMs: 2000, latencySampleCount: 5 },
    { cardId: "weak", correctCount: 1, wrongCount: 4, streakCorrect: 0, averageAnswerMs: 8000, latencySampleCount: 2 },
    { cardId: "mastered", correctCount: 9, wrongCount: 1, streakCorrect: 6, averageAnswerMs: 3000, latencySampleCount: 5 },
  ];
  const db = {
    studyCard: { findMany: vi.fn().mockRejectedValue(new Error("Unbounded catalog read")) },
    studyDeck: { findMany: vi.fn().mockResolvedValue([{ levelId: "level", _count: { cards: 5 } }]) },
    userStudyCardState: { findMany: vi.fn(() => { throw new Error("Do not transfer learner history"); }) },
    $queryRaw: vi.fn().mockResolvedValue([{ levelId: "level", statesTotal: BigInt(4), cardsTouched: BigInt(3), weakCount: BigInt(1), masteredCount: BigInt(1), learningCount: BigInt(1), newCount: BigInt(1), totalCorrect: BigInt(14), totalAttempts: BigInt(20), latencyWeightedSum: 41000, latencySamples: BigInt(12) }]),
  };
  const actual = await getFlashcardPracticeRollupsByLevelId(db as unknown as PrismaClient, "learner", ["level"]);
  expect(actual.get("level")).toEqual(rollupFlashcardPracticeForLevel(["unseen", ...states.map(row => row.cardId)], new Map(states.map(row => [row.cardId, row]))));
});
