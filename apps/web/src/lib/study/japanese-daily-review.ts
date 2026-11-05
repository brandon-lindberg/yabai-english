import "server-only";
import { z } from "zod";
import type { Prisma, PrismaClient } from "@/generated/prisma/client";
import { QUICK_REVIEW_DAILY_MAX, parseQuickReviewCardIds, utcCalendarDayKey } from "./quick-review-day";
import type { getJapaneseStudyProgressionForTrack } from "./japanese-progression";
import { japaneseStudyResultSchema, type JapaneseQuickReviewRecap } from "./japanese-public";
import { attemptedQuickReviewState, quickReviewStateFields } from "./quick-review-selection";

type Overview = Awaited<ReturnType<typeof getJapaneseStudyProgressionForTrack>>;
type Db = Pick<PrismaClient, "userStudyCardState" | "studyQuickReviewDay">;
const receiptSchema = z.object({
  cardId: z.string().min(1), promptId: z.string().min(1),
  result: z.object({ correct: z.boolean(), xp: z.number().int().min(0), at: z.string().datetime() }).strict().optional(),
}).strict();
const receiptsSchema = z.array(receiptSchema).max(QUICK_REVIEW_DAILY_MAX).superRefine((rows, ctx) => {
  if (new Set(rows.map(row => row.cardId)).size !== rows.length || new Set(rows.map(row => row.promptId)).size !== rows.length) ctx.addIssue({ code: "custom", message: "Duplicate Japanese daily receipt" });
});
export const parseJapaneseDailyReceipts = (raw: unknown) => receiptsSchema.parse(raw);
export type JapaneseDailyReceipt = z.infer<typeof receiptSchema>;
const dayWhere = (userId: string, dayKey: string) => ({ userId_learningLanguage_dayKey: { userId, learningLanguage: "JAPANESE" as const, dayKey } });

export async function isCurrentJapaneseDailyPrompt(db: Db, userId: string, cardId: string, promptId: string, dayKey: string, now: Date) {
  if (dayKey !== utcCalendarDayKey(now)) return false;
  const row = await db.studyQuickReviewDay.findUnique({ where: dayWhere(userId, dayKey) });
  return !!row && parseQuickReviewCardIds(row.cardIds).includes(cardId) && parseJapaneseDailyReceipts(row.interactions).some(receipt => receipt.cardId === cardId && receipt.promptId === promptId);
}

/** Caller supplies the already authorized Japanese overview. No question issuance or writes. */
export async function readJapaneseDailyReview(db: Db, userId: string, overview: Overview, now: Date) {
  const dayKey = utcCalendarDayKey(now);
  const levelIds = overview.levels.filter(level => level.unlocked).map(level => level.id);
  const [pool, row] = await Promise.all([
    db.userStudyCardState.findMany({ select: quickReviewStateFields, where: { userId, ...attemptedQuickReviewState, card: {
      kind: { in: ["JAPANESE_VOCABULARY", "JAPANESE_KANJI"] }, deck: { levelId: { in: levelIds } },
    } } }),
    db.studyQuickReviewDay.findUnique({ where: dayWhere(userId, dayKey) }),
  ]);
  const eligible = new Set(pool.map(state => state.cardId));
  const ids = row ? [...new Set(parseQuickReviewCardIds(row.cardIds))].filter(id => eligible.has(id)).slice(0, QUICK_REVIEW_DAILY_MAX) : [];
  const receipts = row ? parseJapaneseDailyReceipts(row.interactions).filter(receipt => ids.includes(receipt.cardId)) : [];
  const results = receipts.flatMap(receipt => receipt.result ? [receipt.result] : []);
  return { pool, row, ids, receipts, status: {
    dayKey, total: row ? ids.length : Math.min(QUICK_REVIEW_DAILY_MAX, pool.length),
    answered: results.length, correct: results.filter(result => result.correct).length,
    wrong: results.filter(result => !result.correct).length, xp: results.reduce((sum, result) => sum + result.xp, 0),
  } };
}

/** Today's completed deck in its original order, using only this learner's graded prompts. */
export async function readJapaneseDailyReviewRecap(
  db: Pick<PrismaClient, "studyReviewPrompt">,
  userId: string,
  daily: Awaited<ReturnType<typeof readJapaneseDailyReview>>,
): Promise<JapaneseQuickReviewRecap> {
  const { ids, receipts, status } = daily;
  if (!status.total || status.answered !== status.total) return { ...status, reviewedCards: [] };

  const prompts = await db.studyReviewPrompt.findMany({
    where: { userId, answeredAt: { not: null }, id: { in: receipts.map(receipt => receipt.promptId) } },
    select: { id: true, cardId: true, resultJson: true },
  });
  const byId = new Map(prompts.map(prompt => [prompt.id, prompt]));
  const byCard = new Map(receipts.map(receipt => [receipt.cardId, receipt]));
  const reviewedCards = ids.flatMap(id => {
    const receipt = byCard.get(id);
    const prompt = receipt && byId.get(receipt.promptId);
    if (!prompt || prompt.cardId !== id) return [];
    const result = japaneseStudyResultSchema.safeParse(prompt.resultJson);
    return result.success && result.data.promptId === prompt.id ? [{ id, feedback: result.data.feedback }] : [];
  });
  return { ...status, reviewedCards };
}

/** Called inside the same learner lock/transaction as the automatic review. */
export async function recordJapaneseDailyAnswer(tx: Prisma.TransactionClient, input: {
  userId: string; cardId: string; promptId: string; correct: boolean; xp: number; now: Date;
}) {
  const row = await tx.studyQuickReviewDay.findUnique({ where: dayWhere(input.userId, utcCalendarDayKey(input.now)) });
  if (!row || !parseQuickReviewCardIds(row.cardIds).includes(input.cardId)) return;
  const receipts = parseJapaneseDailyReceipts(row.interactions);
  const receipt = receipts.find(receipt => receipt.cardId === input.cardId && receipt.promptId === input.promptId);
  if (!receipt || receipt.result) return;
  receipt.result = { correct: input.correct, xp: input.xp, at: input.now.toISOString() };
  await tx.studyQuickReviewDay.update({ where: { id: row.id }, data: { interactions: receipts as unknown as Prisma.InputJsonValue } });
}
