import "server-only";
import { Prisma, type LearningLanguage, type PrismaClient } from "@/generated/prisma/client";
import {
  countQuickReviewOutcomeStats,
  eligibleReplacementCandidates,
  learnedDismissedIds,
  parseQuickReviewInteractions,
  pickRandomId,
  replaceSlotCardId,
  type QuickReviewOutcome,
} from "./quick-review-actions";

import { isQuickReviewCardFrontEligible, utcCalendarDayKey, QUICK_REVIEW_DAILY_MAX, parseQuickReviewCardIds, type QuickReviewCard, type QuickReviewPanelData } from "./quick-review-day";
export { isQuickReviewCardFrontEligible, utcCalendarDayKey, formatQuickReviewDayDisplay, QUICK_REVIEW_DAILY_MAX, type QuickReviewCard, type QuickReviewPanelData } from "./quick-review-day";
import { weightedSampleWithoutReplacement } from "./quiz";

function quickReviewCardScope(learningLanguage: LearningLanguage) {
  return { kind: "ENGLISH_EXERCISE" as const, deck: { level: { track: { learningLanguage, publicationStatus: "PUBLISHED" as const } } } };
}

async function queryEligibleQuickReviewPoolIds(prisma: PrismaClient, userId: string, learningLanguage: LearningLanguage, limit?: number): Promise<string[]> {
  const cards = await prisma.studyCard.findMany({
    where: { ...quickReviewCardScope(learningLanguage),
      userStates: { some: { userId, correctCount: { gte: 1 } } },
      exerciseJson: { equals: Prisma.DbNull }, frontJa: { not: { contains: "___" } },
    },
    select: { id: true },
  });
  return (limit == null ? cards : weightedSampleWithoutReplacement(cards, () => 1, limit)).map(card => card.id);
}

/**
 * Returns up to five cards the learner has answered correctly at least once.
 * The initial set is chosen once per `dayKey` and stored; “Learned” can swap in new cards the same day.
 */
export async function getOrCreateQuickReviewCards(
  prisma: PrismaClient,
  userId: string,
  learningLanguage: LearningLanguage = "ENGLISH",
): Promise<QuickReviewPanelData> {
  const dayKey = utcCalendarDayKey();
  // Japanese needs its own structured prompt adapter before it can enter this panel.
  if (learningLanguage !== "ENGLISH") return { cards: [], dayKey, learnedToday: 0, notYetToday: 0 };

  const existing = await prisma.studyQuickReviewDay.findUnique({
    where: { userId_learningLanguage_dayKey: { userId, learningLanguage, dayKey } },
  });
  if (existing) {
    const list = parseQuickReviewCardIds(existing.cardIds);
    const interactions = parseQuickReviewInteractions(existing.interactions);
    const stats = countQuickReviewOutcomeStats(interactions);
    if (list.length === 0) {
      return { cards: [], dayKey, ...stats };
    }
    const cards = await prisma.studyCard.findMany({
      where: { id: { in: list }, ...quickReviewCardScope(learningLanguage) },
      select: { id: true, frontJa: true, backEn: true },
    });
    const filteredCards = cards.filter((c) => isQuickReviewCardFrontEligible(c.frontJa));
    sortByIdOrder(filteredCards, list);
    return { cards: filteredCards, dayKey, ...stats };
  }

  const ids = await queryEligibleQuickReviewPoolIds(prisma, userId, learningLanguage, QUICK_REVIEW_DAILY_MAX);
  if (ids.length === 0) {
    return { cards: [], dayKey, learnedToday: 0, notYetToday: 0 };
  }

  // Concurrent dashboard requests share the winner's stable daily selection.
  const day = await prisma.studyQuickReviewDay.upsert({
    where: { userId_learningLanguage_dayKey: { userId, learningLanguage, dayKey } },
    create: { userId, learningLanguage, dayKey, cardIds: ids as unknown as Prisma.InputJsonValue },
    update: {},
  });
  const savedIds = parseQuickReviewCardIds(day.cardIds);

  const cards = await prisma.studyCard.findMany({
    where: { id: { in: savedIds }, ...quickReviewCardScope(learningLanguage) },
    select: { id: true, frontJa: true, backEn: true },
  });
  const filteredCards = cards.filter((c) => isQuickReviewCardFrontEligible(c.frontJa));
  sortByIdOrder(filteredCards, savedIds);
  return { cards: filteredCards, dayKey, ...countQuickReviewOutcomeStats(parseQuickReviewInteractions(day.interactions)) };
}

export type ApplyQuickReviewResult =
  | { ok: true; cards: QuickReviewCard[]; learnedToday: number; notYetToday: number }
  | { ok: false; error: "day_mismatch" | "not_found" | "card_not_in_review" };

/**
 * Record Learned / Not yet for the current UTC quick-review row and rotate the slot when learned.
 */
export async function applyQuickReviewOutcome(
  prisma: PrismaClient,
  userId: string,
  input: { dayKey: string; cardId: string; outcome: QuickReviewOutcome },
  learningLanguage: LearningLanguage = "ENGLISH",
): Promise<ApplyQuickReviewResult> {
  if (learningLanguage !== "ENGLISH") return { ok: false, error: "not_found" };
  const today = utcCalendarDayKey();
  if (input.dayKey !== today) {
    return { ok: false, error: "day_mismatch" };
  }

  const row = await prisma.studyQuickReviewDay.findUnique({
    where: { userId_learningLanguage_dayKey: { userId, learningLanguage, dayKey: input.dayKey } },
  });
  if (!row) {
    return { ok: false, error: "not_found" };
  }

  const slotCards = await prisma.studyCard.findMany({
    where: { id: { in: parseQuickReviewCardIds(row.cardIds) }, ...quickReviewCardScope(learningLanguage) },
    select: { id: true, frontJa: true },
  });
  const allowedIds = new Set(slotCards.filter(c => isQuickReviewCardFrontEligible(c.frontJa)).map(c => c.id));
  const slotIds = parseQuickReviewCardIds(row.cardIds).filter(id => allowedIds.has(id));
  if (!slotIds.includes(input.cardId)) {
    return { ok: false, error: "card_not_in_review" };
  }

  const interactions = parseQuickReviewInteractions(row.interactions);
  interactions.push({
    cardId: input.cardId,
    outcome: input.outcome,
    at: new Date().toISOString(),
  });

  let nextSlotIds = [...slotIds];
  if (input.outcome === "learned") {
    const dismissed = learnedDismissedIds(interactions);
    const pool = await queryEligibleQuickReviewPoolIds(prisma, userId, learningLanguage);
    const candidates = eligibleReplacementCandidates(
      pool,
      nextSlotIds,
      dismissed,
      input.cardId,
    );
    const replacement = pickRandomId(candidates, Math.random);
    nextSlotIds = replaceSlotCardId(nextSlotIds, input.cardId, replacement);
  }

  await prisma.studyQuickReviewDay.update({
    where: { id: row.id },
    data: {
      cardIds: nextSlotIds as unknown as Prisma.InputJsonValue,
      interactions: interactions as unknown as Prisma.InputJsonValue,
    },
  });

  if (nextSlotIds.length === 0) {
    const stats = countQuickReviewOutcomeStats(interactions);
    return { ok: true, cards: [], ...stats };
  }

  const cards = await prisma.studyCard.findMany({
    where: { id: { in: nextSlotIds }, ...quickReviewCardScope(learningLanguage) },
    select: { id: true, frontJa: true, backEn: true },
  });
  const filteredCards = cards.filter((c) => isQuickReviewCardFrontEligible(c.frontJa));
  sortByIdOrder(filteredCards, nextSlotIds);
  const stats = countQuickReviewOutcomeStats(interactions);
  return { ok: true, cards: filteredCards, ...stats };
}

function sortByIdOrder(cards: QuickReviewCard[], order: string[]) {
  const idx = new Map(order.map((id, i) => [id, i]));
  cards.sort((a, b) => (idx.get(a.id) ?? 0) - (idx.get(b.id) ?? 0));
}
