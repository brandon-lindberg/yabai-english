"use client";

import { useLocale, useTranslations } from "next-intl";
import { useCallback, useState } from "react";
import type { QuickReviewCard } from "@/lib/study/quick-review";
import { formatQuickReviewDayDisplay, QUICK_REVIEW_DAILY_MAX } from "@/lib/study/quick-review";
import { resolveQuickReviewBackText, resolveQuickReviewFrontText } from "@/lib/study/quick-review-display";
import { Button } from "@/components/ui/button";

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
        {/*
          `inert` on the face that is turned away is what makes this card usable
          from a keyboard. Previously the hidden front stayed in the tab order
          while being invisible (backface-visibility), so focus could land on a
          control nobody could see, and the Learned / Not yet buttons on the back
          were reachable by Tab while the front was showing. `pointer-events-none`
          only ever solved the mouse half of that.
        */}
        <button
          type="button"
          aria-pressed={flipped}
          aria-label={t("tapToFlip")}
          disabled={disabled}
          inert={flipped}
          onClick={() => setFlipped(true)}
          className="absolute inset-0 flex flex-col items-stretch rounded-2xl border-2 border-border bg-background px-2 py-3 text-center [backface-visibility:hidden] disabled:opacity-50"
        >
          <span className="flex min-h-0 flex-1 items-center justify-center px-1">
            <span className="line-clamp-6 whitespace-pre-line text-sm font-medium leading-snug text-foreground">
              {resolveQuickReviewFrontText(card.frontJa)}
            </span>
          </span>
          <span className="shrink-0 pt-1 text-center text-[0.65rem] text-muted">{t("tapToFlip")}</span>
        </button>
        <div
          inert={!flipped}
          onClick={() => {
            if (!disabled) setFlipped(false);
          }}
          className="absolute inset-0 flex cursor-pointer flex-col rounded-2xl border-2 border-border bg-muted/25 px-2 py-2 text-center [backface-visibility:hidden] [transform:rotateY(180deg)]"
        >
          {/*
            A real control rather than a hint: the whole face stays clickable for
            the mouse, but keyboard users need something focusable to flip back
            with. Nested buttons are invalid, so this is a sibling of the
            Learned / Not yet actions rather than a wrapper around them.
          */}
          <button
            type="button"
            disabled={disabled}
            onClick={(e) => {
              e.stopPropagation();
              setFlipped(false);
            }}
            className="mx-auto shrink-0 rounded px-2 py-1 text-[0.65rem] text-muted hover:text-foreground disabled:cursor-not-allowed"
          >
            {t("tapToFlipBack")}
          </button>
          <div className="flex min-h-0 flex-1 items-center justify-center px-1 py-1">
            <span className="line-clamp-4 text-sm font-medium leading-snug text-foreground">
              {resolveQuickReviewBackText(card.frontJa, card.backEn)}
            </span>
          </div>
          <div className="flex shrink-0 flex-col gap-1 pb-1 pt-0.5" onClick={(e) => e.stopPropagation()}>
            <Button
              size="sm"
              fullWidth
              disabled={disabled}
              onClick={() => {
                setFlipped(false);
                onLearned();
              }}
            >
              {t("learned")}
            </Button>
            <Button
              variant="secondary"
              size="sm"
              fullWidth
              disabled={disabled}
              onClick={() => {
                setFlipped(false);
                onNotYet();
              }}
            >
              {t("notYet")}
            </Button>
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
      <div className="border-t border-border py-5 text-sm text-muted">
        {t("empty")}
      </div>
    );
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
