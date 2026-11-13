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


/** Persisted slot identifiers, shared without sharing language-specific content. */
export function parseQuickReviewCardIds(raw: unknown): string[] {
  if (!Array.isArray(raw)) return [];
  return raw.filter((value): value is string => typeof value === "string" && value.length > 0);
}
