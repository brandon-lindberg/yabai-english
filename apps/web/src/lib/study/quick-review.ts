import { Prisma } from "@prisma/client";
import type { PrismaClient } from "@prisma/client";

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

/**
 * Returns up to five cards the learner has answered correctly at least once.
 * The set is chosen once per `dayKey` and stored so refreshes stay stable for the day.
 */
export async function getOrCreateQuickReviewCards(
  prisma: PrismaClient,
  userId: string,
): Promise<{ cards: QuickReviewCard[]; dayKey: string }> {
  const dayKey = utcCalendarDayKey();

  const existing = await prisma.studyQuickReviewDay.findUnique({
    where: { userId_dayKey: { userId, dayKey } },
  });
  if (existing) {
    const ids = existing.cardIds as unknown;
    const list = Array.isArray(ids) ? (ids as string[]) : [];
    if (list.length === 0) {
      return { cards: [], dayKey };
    }
    const cards = await prisma.studyCard.findMany({
      where: { id: { in: list } },
      select: { id: true, frontJa: true, backEn: true },
    });
    sortByIdOrder(cards, list);
    return { cards, dayKey };
  }

  const sampled = await prisma.$queryRaw<{ id: string }[]>`
    SELECT c."id"
    FROM "UserStudyCardState" s
    INNER JOIN "StudyCard" c ON c."id" = s."cardId"
    WHERE s."userId" = ${userId}
      AND s."correctCount" >= 1
    ORDER BY RANDOM()
    LIMIT ${QUICK_REVIEW_DAILY_MAX}
  `;

  const ids = sampled.map((r) => r.id);
  if (ids.length === 0) {
    return { cards: [], dayKey };
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
  sortByIdOrder(cards, ids);
  return { cards, dayKey };
}

function sortByIdOrder(cards: QuickReviewCard[], order: string[]) {
  const idx = new Map(order.map((id, i) => [id, i]));
  cards.sort((a, b) => (idx.get(a.id) ?? 0) - (idx.get(b.id) ?? 0));
}
