"use client";
import { useEffect, useRef, useState, type PointerEvent } from "react";
import { useLocale, useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import { Button, buttonClasses } from "@/components/ui/button";
import { Link } from "@/i18n/navigation";
import { JapaneseStudySession } from "@/components/study/japanese-study-session";
import { JapaneseStudyFeedbackDetails } from "@/components/study/study-practice-parts";
import { formatQuickReviewDayDisplay } from "@/lib/study/quick-review-day";
import type { JapaneseQuickReviewRecap } from "@/lib/study/japanese-public";
import type { StudyRpgSnapshot } from "@/lib/study/rpg-xp";
import { QuickReviewFlipCard } from "./quick-review-flip-card";

function CompletedReview({ status, focus }: { status: JapaneseQuickReviewRecap; focus: boolean }) {
  const t = useTranslations("japaneseStudy");
  const dashboard = useTranslations("dashboard");
  const heading = useRef<HTMLHeadingElement>(null);
  const [active, setActive] = useState(0);
  const swipeStart = useRef<{ id: number; x: number; y: number } | null>(null);
  const suppressTap = useRef(false);
  const total = status.reviewedCards.length;
  const current = Math.min(active, Math.max(0, total - 1));
  useEffect(() => { if (focus) heading.current?.focus(); }, [focus]);

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

  return <div>
    <h3 ref={heading} tabIndex={-1} className="scroll-mt-24 text-base font-semibold text-foreground focus-visible:outline-none">{t("dailyDone")}</h3>
    <p className="mt-1 text-sm tabular-nums text-muted">{t("dailyScore", { correct: status.correct, wrong: status.wrong })} · {t("todayXp", { xp: status.xp })}</p>
    {total > 0 ? <>
      <p className="mt-3 text-xs text-muted">
        <span className={total > 1 ? "hidden lg:inline" : undefined}>{dashboard("quickReview.deckHint")}</span>
        {total > 1 ? <span className="lg:hidden">{t("dailySwipeHint")}</span> : null}
      </p>
      <ul role="list" aria-label={t("dailyDeckLabel")}
        className="mt-3 min-w-0 touch-pan-y touch-pinch-zoom px-1 py-1 lg:grid lg:auto-cols-[minmax(0,11rem)] lg:grid-flow-col lg:gap-3 lg:touch-auto"
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
        {status.reviewedCards.map(({ id, feedback }, index) => <li key={id} className={index === current ? "min-w-0" : "hidden min-w-0 lg:block"}>
          <QuickReviewFlipCard name={feedback.written}
            front={<span lang="ja" className="break-words text-2xl font-semibold leading-snug text-foreground [overflow-wrap:anywhere]">{feedback.written}</span>}
            back={<JapaneseStudyFeedbackDetails feedback={feedback} compact />}
          />
        </li>)}
      </ul>
      {total > 1 ? <div className="mx-auto mt-2 flex max-w-72 items-center justify-between gap-2 lg:hidden">
        <Button variant="ghost" aria-disabled={current === 0} className="aria-disabled:opacity-40" onClick={() => move(-1)}>{dashboard("previous")}</Button>
        <span aria-live="polite" className="text-center text-xs tabular-nums text-muted">{t("dailyCardPosition", { current: current + 1, total })}</span>
        <Button variant="ghost" aria-disabled={current === total - 1} className="aria-disabled:opacity-40" onClick={() => move(1)}>{dashboard("next")}</Button>
      </div> : null}
    </> : null}
  </div>;
}

/** Daily review uses the same question, feedback and retry controller as full practice. */
export function DashboardJapaneseQuickReview({ initialStatus, initialRpg }: {
  initialStatus: JapaneseQuickReviewRecap; initialRpg: StudyRpgSnapshot;
}) {
  const t = useTranslations("japaneseStudy");
  const locale = useLocale();
  const router = useRouter();
  const [started, setStarted] = useState(false);
  if (initialStatus.total === 0 && !started) return null;
  const complete = initialStatus.total > 0 && initialStatus.answered === initialStatus.total;
  const recap = complete ? <CompletedReview status={initialStatus} focus={started} />
    : <p role="status" className="text-sm text-muted">{t("loading")}</p>;
  return <section className="border-t border-border pt-5" aria-labelledby="japanese-daily-review-title">
    <div className="flex flex-wrap items-baseline justify-between gap-2">
      <h2 id="japanese-daily-review-title" className="text-lg font-semibold text-foreground">{t("quickTitle")}</h2>
      <p className="text-xs text-muted">{formatQuickReviewDayDisplay(initialStatus.dayKey, locale)}</p>
    </div>
    {started ? <div className="mt-5"><JapaneseStudySession quickReview quickReviewCompletion={recap} initialRpg={initialRpg} onReviewSaved={() => router.refresh()} /></div>
      : complete ? <div className="mt-4">{recap}</div> : <>
      <p className="mt-2 max-w-prose text-sm leading-relaxed text-muted">{t("quickIntro")}</p>
      <p className="mt-2 text-sm tabular-nums text-muted">{t("dailyProgress", { answered: initialStatus.answered, total: initialStatus.total })} · {t("dailyScore", { correct: initialStatus.correct, wrong: initialStatus.wrong })}</p>
      <div className="mt-4 flex flex-wrap gap-2">
        <Button onClick={() => setStarted(true)}>{t(initialStatus.answered ? "quickResume" : "quickStart")}</Button>
        <Link href="/learn/study" className={buttonClasses({ variant: "secondary" })}>{t("allPractice")}</Link>
      </div>
    </>}
  </section>;
}
