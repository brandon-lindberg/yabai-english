"use client";

import { useLocale, useTranslations } from "next-intl";
import { useState } from "react";
import type { QuickReviewCard } from "@/lib/study/quick-review";
import { formatQuickReviewDayDisplay, QUICK_REVIEW_DAILY_MAX } from "@/lib/study/quick-review";

type Props = {
  cards: QuickReviewCard[];
  dayKey: string;
};

function QuickReviewFlipCard({ card }: { card: QuickReviewCard }) {
  const t = useTranslations("dashboard.quickReview");
  const [flipped, setFlipped] = useState(false);

  return (
    <button
      type="button"
      onClick={() => setFlipped((f) => !f)}
      aria-pressed={flipped}
      className="group perspective-[960px] mx-auto w-full max-w-[11rem] outline-none focus-visible:ring-2 focus-visible:ring-foreground/30 focus-visible:ring-offset-2"
    >
      <div
        className={`relative aspect-[3/4] w-full transition-transform duration-500 [transform-style:preserve-3d] ${
          flipped ? "[transform:rotateY(180deg)]" : ""
        }`}
      >
        {/* Front (Japanese prompt) */}
        <span
          className="absolute inset-0 flex flex-col items-center justify-center gap-2 rounded-2xl border-2 border-border bg-background px-3 py-4 text-center shadow-md [backface-visibility:hidden]"
        >
          <span className="text-[0.65rem] font-medium uppercase tracking-wide text-muted">
            {t("cardFrontLabel")}
          </span>
          <span className="line-clamp-6 text-sm font-medium leading-snug text-foreground">{card.frontJa}</span>
        </span>
        {/* Back (English) */}
        <span
          className="absolute inset-0 flex flex-col items-center justify-center gap-2 rounded-2xl border-2 border-border bg-muted/25 px-3 py-4 text-center shadow-md [backface-visibility:hidden] [transform:rotateY(180deg)]"
        >
          <span className="text-[0.65rem] font-medium uppercase tracking-wide text-muted">
            {t("cardBackLabel")}
          </span>
          <span className="line-clamp-6 text-sm font-medium leading-snug text-foreground">{card.backEn}</span>
        </span>
      </div>
      <span className="mt-2 block text-center text-[0.7rem] text-muted">
        {flipped ? t("tapToFlipBack") : t("tapToFlip")}
      </span>
    </button>
  );
}

export function DashboardQuickReview({ cards, dayKey }: Props) {
  const t = useTranslations("dashboard.quickReview");
  const locale = useLocale();
  const dateLabel = formatQuickReviewDayDisplay(dayKey, locale);

  if (cards.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-border bg-surface/60 p-5 text-sm text-muted">
        {t("empty")}
      </div>
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

      <ul className="mt-5 grid grid-cols-2 gap-x-4 gap-y-8 sm:grid-cols-3 sm:gap-y-10 lg:grid-cols-5">
        {cards.map((c) => (
          <li key={c.id} className="flex min-h-0 flex-col items-stretch justify-start">
            <QuickReviewFlipCard card={c} />
          </li>
        ))}
      </ul>
    </section>
  );
}
