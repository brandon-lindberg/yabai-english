"use client";

import { useLocale, useTranslations } from "next-intl";
import { useCallback, useState } from "react";
import type { QuickReviewCard } from "@/lib/study/quick-review";
import { formatQuickReviewDayDisplay, QUICK_REVIEW_DAILY_MAX } from "@/lib/study/quick-review";

type Props = {
  initialCards: QuickReviewCard[];
  dayKey: string;
  initialLearnedToday: number;
  initialNotYetToday: number;
};

function QuickReviewFlipCard({
  card,
  disabled,
  onLearned,
  onNotYet,
}: {
  card: QuickReviewCard;
  disabled: boolean;
  onLearned: () => void;
  onNotYet: () => void;
}) {
  const t = useTranslations("dashboard.quickReview");
  const [flipped, setFlipped] = useState(false);

  return (
    <div className="mx-auto w-full max-w-[11rem] perspective-[960px] outline-none focus-within:ring-2 focus-within:ring-foreground/30 focus-within:ring-offset-2">
      <div
        className={`relative aspect-[3/5] min-h-[12rem] w-full transition-transform duration-500 [transform-style:preserve-3d] ${
          flipped ? "[transform:rotateY(180deg)]" : ""
        }`}
      >
        <button
          type="button"
          aria-pressed={flipped}
          aria-label={t("tapToFlip")}
          disabled={disabled}
          onClick={() => setFlipped(true)}
          className={`absolute inset-0 flex flex-col items-stretch rounded-2xl border-2 border-border bg-background px-2 py-3 text-center shadow-md [backface-visibility:hidden] disabled:opacity-50 ${
            flipped ? "pointer-events-none" : ""
          }`}
        >
          <span className="flex min-h-0 flex-1 items-center justify-center px-1">
            <span className="line-clamp-6 text-sm font-medium leading-snug text-foreground">{card.frontJa}</span>
          </span>
          <span className="shrink-0 pt-1 text-center text-[0.65rem] text-muted">{t("tapToFlip")}</span>
        </button>
        <div
          onClick={() => {
            if (!disabled) setFlipped(false);
          }}
          className={`absolute inset-0 flex cursor-pointer flex-col rounded-2xl border-2 border-border bg-muted/25 px-2 py-2 text-center shadow-md [backface-visibility:hidden] [transform:rotateY(180deg)] ${
            flipped ? "pointer-events-auto" : "pointer-events-none"
          }`}
        >
          <span className="shrink-0 py-1 text-[0.65rem] text-muted">{t("tapToFlipBack")}</span>
          <div className="flex min-h-0 flex-1 items-center justify-center px-1 py-1">
            <span className="line-clamp-4 text-sm font-medium leading-snug text-foreground">{card.backEn}</span>
          </div>
          <div className="flex shrink-0 flex-col gap-1 pb-1 pt-0.5" onClick={(e) => e.stopPropagation()}>
            <button
              type="button"
              disabled={disabled}
              onClick={onLearned}
              className="cursor-pointer rounded-lg bg-green-600/90 px-2 py-1.5 text-[0.7rem] font-semibold text-white hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-40"
            >
              {t("learned")}
            </button>
            <button
              type="button"
              disabled={disabled}
              onClick={onNotYet}
              className="cursor-pointer rounded-lg border border-border bg-surface px-2 py-1.5 text-[0.7rem] font-medium text-foreground hover:bg-[var(--app-hover)] disabled:cursor-not-allowed disabled:opacity-40"
            >
              {t("notYet")}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

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

  if (initialCards.length === 0 && cards.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-border bg-surface/60 p-5 text-sm text-muted">
        {t("empty")}
      </div>
    );
  }

  if (cards.length === 0) {
    return (
      <section className="rounded-2xl border border-border bg-surface p-5 shadow-sm">
        <h2 className="text-lg font-semibold text-foreground">{t("title")}</h2>
        <p className="mt-2 text-sm text-muted">{t("clearedForToday")}</p>
        <p className="mt-1 text-xs text-muted">
          {t("statsLine", { learned: learnedToday, notYet: notYetToday })}
        </p>
      </section>
    );
  }

  return (
    <section className="rounded-2xl border border-border bg-surface p-5 shadow-sm">
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
      {error ? <p className="mt-2 text-xs text-red-600">{error}</p> : null}

      <ul className="mt-5 grid grid-cols-2 gap-x-4 gap-y-8 sm:grid-cols-3 sm:gap-y-10 lg:grid-cols-5">
        {cards.map((c) => (
          <li key={c.id} className="flex min-h-0 flex-col items-stretch justify-start">
            <QuickReviewFlipCard
              card={c}
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
