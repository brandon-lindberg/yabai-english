import "server-only";
import type { Prisma } from "@/generated/prisma/client";
import { nextStudyReviewState } from "./scheduler";
import { xpForMcq } from "./quiz";
import { lockLearnerTransaction } from "../learner-transaction-lock";

/** Serialize practice mutations for one learner, including queue issuance. */
export async function lockStudyLearner(tx: Prisma.TransactionClient, userId: string) {
  await lockLearnerTransaction(tx, "study", userId);
}

/** Shared persistence only; each language owns its prompt and grading rules. */
export async function saveStudyReviewProgress(tx: Prisma.TransactionClient, input: {
  userId: string; cardId: string; levelId: string; correct: boolean; now: Date; answerTimeMs?: number;
}) {
  const { userId, cardId, levelId, correct, now, answerTimeMs } = input;
  await lockStudyLearner(tx, userId);
  const previous = await tx.userStudyCardState.findUnique({ where: { userId_cardId: { userId, cardId } } });
  const state = nextStudyReviewState(previous, correct, now, answerTimeMs);
  await tx.userStudyCardState.upsert({
    where: { userId_cardId: { userId, cardId } },
    create: { userId, cardId, ...state }, update: state,
  });
  const xpGained = xpForMcq(correct);
  const progress = await tx.userStudyLevelProgress.upsert({
    where: { userId_levelId: { userId, levelId } },
    create: { userId, levelId, xp: xpGained, lastStudiedAt: now },
    update: { xp: { increment: xpGained }, lastStudiedAt: now },
  });
  return { state, xpGained, progress };
}
