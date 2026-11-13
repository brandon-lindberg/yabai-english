"use client";
import { useRef, useState, type PointerEvent } from "react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { QuickReviewFlipCard } from "@/components/dashboard/quick-review-flip-card";
import type { JapaneseQuickReviewCard } from "@/lib/study/japanese-public";
import { JapaneseStudyFeedbackDetails } from "./study-practice-parts";

export function JapaneseReviewDeck({ cards, label, compact = false }: {
  cards: JapaneseQuickReviewCard[];
  label: string;
  compact?: boolean;
}) {
  const t = useTranslations("japaneseStudy");
  const dashboard = useTranslations("dashboard");
  const [active, setActive] = useState(0);
  const swipeStart = useRef<{ id: number; x: number; y: number } | null>(null);
  const suppressTap = useRef(false);
  const total = cards.length;
  const current = Math.min(active, Math.max(0, total - 1));
  const hideOnWide = compact ? "sm:hidden" : "lg:hidden";

  function move(delta: number) {
    setActive(Math.max(0, Math.min(total - 1, current + delta)));
  }

  function finishSwipe(event: PointerEvent<HTMLUListElement>) {
    const start = swipeStart.current;
    if (!start || start.id !== event.pointerId) return;
    swipeStart.current = null;
    const dx = event.clientX - start.x;
    const dy = event.clientY - start.y;
    if (Math.abs(dx) < 48 || Math.abs(dx) <= 1.25 * Math.abs(dy)) return;
    suppressTap.current = true;
    move(dx < 0 ? 1 : -1);
  }

  return total > 0 ? <>
    {compact ? total > 1 ? <p className={`mt-1 text-xs text-muted ${hideOnWide}`}>{t("dailySwipeHint")}</p> : null :
      <p className="mt-3 text-xs text-muted">
        <span className={total > 1 ? "hidden lg:inline" : undefined}>{dashboard("quickReview.deckHint")}</span>
        {total > 1 ? <span className={hideOnWide}>{t("dailySwipeHint")}</span> : null}
      </p>}
    <ul role="list" aria-label={label}
      className={`min-w-0 touch-pan-y touch-pinch-zoom px-1 py-1 ${compact ? "mt-1 grid sm:grid-cols-3 sm:gap-2 sm:touch-auto" : "mt-3 lg:grid lg:auto-cols-[minmax(0,11rem)] lg:grid-flow-col lg:gap-3 lg:touch-auto"}`}
      onPointerDown={event => {
        if (!event.isPrimary) return;
        suppressTap.current = false;
        swipeStart.current = total > 1 && (event.pointerType === "touch" || event.pointerType === "pen")
          ? { id: event.pointerId, x: event.clientX, y: event.clientY } : null;
      }}
      onPointerUp={finishSwipe}
      onPointerCancel={event => { if (event.isPrimary) swipeStart.current = null; }}
      onClickCapture={event => {
        // Some browsers send a click after a horizontal touch gesture.
        if (event.detail > 0 && suppressTap.current) {
          event.stopPropagation();
          suppressTap.current = false;
        }
      }}>
      {/* Hidden preview cards still size the carousel's shared row on phones. */}
      {cards.map(({ id, feedback }, index) => <li key={id} className={`min-w-0 ${compact ? "col-start-1 row-start-1 sm:col-auto sm:row-auto" : ""} ${index === current ? "" : compact ? "invisible sm:visible" : "hidden lg:block"}`}>
        <QuickReviewFlipCard name={feedback.written} compact={compact}
          front={<span lang="ja" className="break-words text-2xl font-semibold leading-snug text-foreground [overflow-wrap:anywhere]">{feedback.written}</span>}
          back={<JapaneseStudyFeedbackDetails feedback={feedback} layout={compact ? "preview" : "recap"} />}
        />
      </li>)}
    </ul>
    {total > 1 ? <div className={`mx-auto flex max-w-72 items-center justify-between gap-2 ${compact ? "mt-0.5" : "mt-2"} ${hideOnWide}`}>
      <Button variant="ghost" aria-disabled={current === 0} className="aria-disabled:opacity-40" onClick={() => move(-1)}>{dashboard("previous")}</Button>
      <span aria-live="polite" className="text-center text-xs tabular-nums text-muted">{t("dailyCardPosition", { current: current + 1, total })}</span>
      <Button variant="ghost" aria-disabled={current === total - 1} className="aria-disabled:opacity-40" onClick={() => move(1)}>{dashboard("next")}</Button>
    </div> : null}
  </> : null;
}
