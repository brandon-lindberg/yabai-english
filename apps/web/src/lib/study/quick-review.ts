import { Prisma } from "@/generated/prisma/client";
import type { PrismaClient } from "@/generated/prisma/client";
import {
  countQuickReviewOutcomeStats,
  eligibleReplacementCandidates,
  learnedDismissedIds,
  parseQuickReviewInteractions,
  pickRandomId,
  replaceSlotCardId,
  type QuickReviewOutcome,
} from "./quick-review-actions";

/** Max flashcards shown in the dashboard “quick review” panel per UTC day. */
export const QUICK_REVIEW_DAILY_MAX = 5;

/** UTC `YYYY-MM-DD` — one review set per user per calendar day in UTC. */
export function utcCalendarDayKey(d = new Date()): string {
  return d.toISOString().slice(0, 10);
}

const DAY_KEY_RE = /^(\d{4})-(\d{2})-(\d{2})$/;

/**
 * Human-readable label for a quick-review `dayKey` (always the UTC calendar date of the bucket).
 * `locale` should be the next-intl locale (`en`, `ja`, …): English uses American formatting; Japanese uses ja-JP long style.
 */
export function formatQuickReviewDayDisplay(dayKey: string, locale: string): string {
  const match = DAY_KEY_RE.exec(dayKey);
  if (!match) return dayKey;
  const y = Number(match[1]);
  const mo = Number(match[2]);
  const d = Number(match[3]);
  const utcNoon = new Date(Date.UTC(y, mo - 1, d, 12, 0, 0));

  if (locale.startsWith("ja")) {
    return new Intl.DateTimeFormat("ja-JP", {
      year: "numeric",
      month: "long",
      day: "numeric",
      timeZone: "UTC",
    }).format(utcNoon);
  }

  return new Intl.DateTimeFormat("en-US", {
    dateStyle: "medium",
    timeZone: "UTC",
  }).format(utcNoon);
}

export type QuickReviewCard = { id: string; frontJa: string; backEn: string };

export type QuickReviewPanelData = {
  cards: QuickReviewCard[];
  dayKey: string;
  learnedToday: number;
  notYetToday: number;
};

export function isQuickReviewCardFrontEligible(frontJa: string): boolean {
  return !frontJa.includes("___");
}

function parseCardIdList(raw: unknown): string[] {
  if (!Array.isArray(raw)) return [];
  return raw.filter((x): x is string => typeof x === "string" && x.length > 0);
}

async function queryEligibleQuickReviewPoolIds(prisma: PrismaClient, userId: string): Promise<string[]> {
  const rows = await prisma.$queryRaw<{ id: string }[]>`
    SELECT c."id"
    FROM "UserStudyCardState" s
    INNER JOIN "StudyCard" c ON c."id" = s."cardId"
    WHERE s."userId" = ${userId}
      AND s."correctCount" >= 1
      AND c."exerciseJson" IS NULL
      AND c."frontJa" NOT LIKE ${"%___%"}
  `;
  return rows.map((r) => r.id);
}

/**
 * Returns up to five cards the learner has answered correctly at least once.
 * The initial set is chosen once per `dayKey` and stored; “Learned” can swap in new cards the same day.
 */
export async function getOrCreateQuickReviewCards(
  prisma: PrismaClient,
  userId: string,
): Promise<QuickReviewPanelData> {
  const dayKey = utcCalendarDayKey();

  const existing = await prisma.studyQuickReviewDay.findUnique({
    where: { userId_dayKey: { userId, dayKey } },
  });
  if (existing) {
    const list = parseCardIdList(existing.cardIds);
    const interactions = parseQuickReviewInteractions(existing.interactions);
    const stats = countQuickReviewOutcomeStats(interactions);
    if (list.length === 0) {
      return { cards: [], dayKey, ...stats };
    }
    const cards = await prisma.studyCard.findMany({
      where: { id: { in: list } },
      select: { id: true, frontJa: true, backEn: true },
    });
    const filteredCards = cards.filter((c) => isQuickReviewCardFrontEligible(c.frontJa));
    sortByIdOrder(filteredCards, list);
    return { cards: filteredCards, dayKey, ...stats };
  }

  const sampled = await prisma.$queryRaw<{ id: string }[]>`
    SELECT c."id"
    FROM "UserStudyCardState" s
    INNER JOIN "StudyCard" c ON c."id" = s."cardId"
    WHERE s."userId" = ${userId}
      AND s."correctCount" >= 1
      AND c."exerciseJson" IS NULL
      AND c."frontJa" NOT LIKE ${"%___%"}
    ORDER BY RANDOM()
    LIMIT ${QUICK_REVIEW_DAILY_MAX}
  `;

  const ids = sampled.map((r) => r.id);
  if (ids.length === 0) {
    return { cards: [], dayKey, learnedToday: 0, notYetToday: 0 };
  }

  await prisma.studyQuickReviewDay.create({
    data: {
      userId,
      dayKey,
      cardIds: ids as unknown as Prisma.InputJsonValue,
    },
  });

  const cards = await prisma.studyCard.findMany({
    where: { id: { in: ids } },
    select: { id: true, frontJa: true, backEn: true },
  });
  const filteredCards = cards.filter((c) => isQuickReviewCardFrontEligible(c.frontJa));
  sortByIdOrder(filteredCards, ids);
  return { cards: filteredCards, dayKey, learnedToday: 0, notYetToday: 0 };
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
): Promise<ApplyQuickReviewResult> {
  const today = utcCalendarDayKey();
  if (input.dayKey !== today) {
    return { ok: false, error: "day_mismatch" };
  }

  const row = await prisma.studyQuickReviewDay.findUnique({
    where: { userId_dayKey: { userId, dayKey: input.dayKey } },
  });
  if (!row) {
    return { ok: false, error: "not_found" };
  }

  const slotIds = parseCardIdList(row.cardIds);
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
    const pool = await queryEligibleQuickReviewPoolIds(prisma, userId);
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
    where: { id: { in: nextSlotIds } },
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
