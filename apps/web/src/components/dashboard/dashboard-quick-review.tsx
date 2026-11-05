"use client";

import { useLocale, useTranslations } from "next-intl";
import { useCallback, useState } from "react";
import type { QuickReviewCard } from "@/lib/study/quick-review-day";
import { formatQuickReviewDayDisplay, QUICK_REVIEW_DAILY_MAX } from "@/lib/study/quick-review-day";
import { resolveQuickReviewBackText, resolveQuickReviewFrontText } from "@/lib/study/quick-review-display";
import { QuickReviewFlipCard } from "./quick-review-flip-card";

type Props = {
  initialCards: QuickReviewCard[];
  dayKey: string;
  initialLearnedToday: number;
  initialNotYetToday: number;
};

export function DashboardQuickReview({
  initialCards,
  dayKey,
  initialLearnedToday,
  initialNotYetToday,
}: Props) {
  const t = useTranslations("dashboard.quickReview");
  const locale = useLocale();
  const dateLabel = formatQuickReviewDayDisplay(dayKey, locale);
  const [cards, setCards] = useState(initialCards);
  const [learnedToday, setLearnedToday] = useState(initialLearnedToday);
  const [notYetToday, setNotYetToday] = useState(initialNotYetToday);
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const postOutcome = useCallback(
    async (cardId: string, outcome: "learned" | "not_yet") => {
      setError(null);
      setPendingId(cardId);
      try {
        const res = await fetch("/api/study/quick-review/action", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ dayKey, cardId, outcome }),
        });
        const data = (await res.json().catch(() => ({}))) as {
          error?: string;
          cards?: QuickReviewCard[];
          learnedToday?: number;
          notYetToday?: number;
        };
        if (!res.ok) {
          setError(data.error ?? `HTTP ${res.status}`);
          return;
        }
        if (Array.isArray(data.cards)) {
          setCards(data.cards);
        }
        if (typeof data.learnedToday === "number") setLearnedToday(data.learnedToday);
        if (typeof data.notYetToday === "number") setNotYetToday(data.notYetToday);
      } catch {
        setError("Network error");
      } finally {
        setPendingId(null);
      }
    },
    [dayKey],
  );

  /*
    Nothing to review and nothing reviewed: no section at all. This used to be a
    paragraph explaining why there was nothing to show, which is a section whose
    entire content is an apology for existing — and with the spine's `space-y-10`
    it also took a gap either side of itself.

    The state below is different and stays: having *cleared* today's cards is a
    result rather than an absence.
  */
  if (initialCards.length === 0 && cards.length === 0) {
    return null;
  }

  if (cards.length === 0) {
    return (
      <section className="border-t border-border pt-5">
        <h2 className="text-lg font-semibold text-foreground">{t("title")}</h2>
        <p className="mt-2 text-sm text-muted">{t("clearedForToday")}</p>
        <p className="mt-1 text-xs text-muted">
          {t("statsLine", { learned: learnedToday, notYet: notYetToday })}
        </p>
      </section>
    );
  }

  return (
    <section className="border-t border-border pt-5">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h2 className="text-lg font-semibold text-foreground">{t("title")}</h2>
        <p className="text-xs text-muted">
          {t("subtitle", { count: cards.length, max: QUICK_REVIEW_DAILY_MAX, date: dateLabel })}
        </p>
      </div>
      <p className="mt-2 text-xs text-muted">{t("deckHint")}</p>
      <p className="mt-1 text-xs text-muted">
        {t("statsLine", { learned: learnedToday, notYet: notYetToday })}
      </p>
      {error ? <p className="mt-2 text-xs text-[var(--app-danger)]">{error}</p> : null}

      <ul className="mt-5 grid grid-cols-2 gap-x-4 gap-y-8 sm:grid-cols-3 sm:gap-y-10 lg:grid-cols-5">
        {cards.map((c) => (
          <li key={c.id} className="flex min-h-0 flex-col items-stretch justify-start">
            <QuickReviewFlipCard
              front={<span className="line-clamp-6 whitespace-pre-line text-sm font-medium leading-snug text-foreground">{resolveQuickReviewFrontText(c.frontJa)}</span>}
              back={<span className="line-clamp-4 text-sm font-medium leading-snug text-foreground">{resolveQuickReviewBackText(c.frontJa, c.backEn)}</span>}
              disabled={pendingId === c.id}
              onLearned={() => void postOutcome(c.id, "learned")}
              onNotYet={() => void postOutcome(c.id, "not_yet")}
            />
          </li>
        ))}
      </ul>
    </section>
  );
}
