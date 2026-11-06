"use client";
import { useEffect, useId, useRef, useState, type ReactNode } from "react";
import { useLocale, useTranslations } from "next-intl";
import { LocalDateTime } from "@/components/local-datetime";
import { Button, buttonClasses } from "@/components/ui/button";
import type { JapanesePlacementResult as Result } from "@/lib/japanese-placement/public";

function useBandLabel() {
  const t = useTranslations("japanesePlacement");
  return (band: string) => band === "BELOW_N5" ? t("belowN5") : band;
}

function ScoreReport({ result }: { result: Result }) {
  const t = useTranslations("japanesePlacement");
  const locale = useLocale();
  const bandLabel = useBandLabel();
  const estimate = result.levelEstimate;
  return <>
    <dl className="grid border-t border-border sm:grid-cols-2 sm:gap-x-8">
      {result.domains.map((row) => {
        const unanswered = row.unanswered ?? Math.max(0, row.planned - row.answered - row.notSure);
        return <div key={row.domain} className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-0.5 border-b border-border py-2.5">
          <dt className="text-sm font-semibold text-foreground">{t(`domains.${row.domain}`)}</dt>
          <dd className="text-sm tabular-nums text-foreground">
            <span className="block font-medium">{t("correctOfAnswered", { correct: row.correct, answered: row.answered })}</span>
            <span className="block text-xs leading-relaxed text-muted">{t("unanswered", { skipped: row.notSure, unanswered })}</span>
          </dd>
        </div>;
      })}
    </dl>
    <div className="mt-3 max-w-prose space-y-1 text-xs leading-relaxed text-muted">
      {estimate.status === "estimated" ? <>
        {estimate.basis === "jlpt_aligned_rules" ? <p>{t("ruleBasis")}</p> : null}
        {estimate.modelRange && estimate.modelRange.lower !== estimate.modelRange.upper ? <p>{t("range", { lower: bandLabel(estimate.modelRange.lower), upper: bandLabel(estimate.modelRange.upper) })}</p> : null}
        <p>{t("resultNote")}</p>
      </> : null}
      <p>{t("completedAt")} · <LocalDateTime iso={result.completedAt} locale={locale} /></p>
    </div>
  </>;
}

export function JapanesePlacementResult({ result, teacher = false, review, retakeAction, retakeDate }: {
  result: Result;
  teacher?: boolean;
  review?: ReactNode;
  retakeAction?: ReactNode;
  retakeDate?: string | null;
}) {
  const t = useTranslations("japanesePlacement");
  const bandLabel = useBandLabel();
  const headingId = useId();
  const scoreHeadingId = `${headingId}-scores`;
  const [showScores, setShowScores] = useState(false);
  const scoreHeading = useRef<HTMLHeadingElement>(null);
  const scoreTrigger = useRef<HTMLButtonElement>(null);
  const focusAfterSwitch = useRef(false);
  useEffect(() => {
    if (!focusAfterSwitch.current) return;
    focusAfterSwitch.current = false;
    (showScores ? scoreHeading : scoreTrigger).current?.focus();
  }, [showScores]);

  function switchView(scores: boolean) {
    focusAfterSwitch.current = true;
    setShowScores(scores);
  }

  const estimate = result.levelEstimate;
  const estimated = estimate.status === "estimated";
  const title = estimated ? t(teacher ? "teacherResultTitle" : "resultTitle")
    : t(estimate.status === "unavailable" ? "legacyResult" : "insufficient");
  const adjustment = result.timeoutAdjustment;
  const timingNote = adjustment && estimated ? t(adjustment.bandReduction > 0 ? "timeoutAdjusted" : "timeoutFloor", {
    unanswered: adjustment.unanswered, before: bandLabel(adjustment.unadjustedBand), after: bandLabel(estimate.band),
  }) : result.completionReason === "time_limit" ? t("timeExpired") : null;
  const { correct, answered } = result.domains.reduce((total, row) => ({
    correct: total.correct + row.correct, answered: total.answered + row.answered,
  }), { correct: 0, answered: 0 });

  return <>
    <div hidden={showScores} className="border-y border-border">
      <div className={review ? "grid md:grid-cols-[minmax(0,2fr)_minmax(0,3fr)]" : undefined}>
        <section aria-labelledby={headingId} className="min-w-0 py-3 sm:py-6 md:pr-6">
          <h2 id={headingId} className={estimated ? "text-base font-semibold text-foreground" : "text-xl font-bold leading-tight text-foreground"}>{title}</h2>
          {estimated ? <>
            <p className={`mt-1 font-black leading-none tracking-[-0.04em] tabular-nums text-foreground ${estimate.band === "BELOW_N5" ? "text-5xl sm:text-6xl" : "text-7xl sm:text-8xl"}`}>{bandLabel(estimate.band)}</p>
            <p className="mt-2 text-sm leading-relaxed text-muted">{t("provisional")}</p>
          </> : estimate.status === "insufficient_evidence" ? <p className="mt-2 text-sm leading-relaxed text-muted">
            {t(estimate.reason === "unconfirmed_reading_or_construction" ? "unconfirmedBody" : "insufficientBody")}
          </p> : null}
          {timingNote ? <p className="mt-2 text-sm leading-relaxed text-muted">{timingNote}</p> : null}
          {!teacher ? <div className="mt-3">
            <button type="button" ref={scoreTrigger} className={buttonClasses({ variant: "secondary" })} onClick={() => switchView(true)}>{t("viewScores")}</button>
            {answered > 0 ? <p className="mt-2 text-sm tabular-nums text-muted">{t("correctOfAnswered", { correct, answered })}</p> : null}
            {retakeDate ? <p role="status" className="mt-1 text-sm leading-relaxed text-muted">{t("retakeFrom", { date: retakeDate })}</p> : null}
            {retakeAction ? <div className="mt-2">{retakeAction}</div> : null}
          </div> : null}
        </section>
        {review ? <div className="min-w-0 border-t border-border py-3 sm:py-6 md:border-l md:border-t-0 md:pl-6">{review}</div> : null}
      </div>
      {teacher ? <div className="pb-4">
        <h3 className="mb-2 text-base font-semibold text-foreground">{t("breakdown")}</h3>
        <ScoreReport result={result} />
      </div> : null}
    </div>
    {showScores ? <section aria-labelledby={scoreHeadingId} className="border-t border-border pt-4">
      <header className="mb-3 flex flex-wrap items-center justify-between gap-x-4 gap-y-2">
        <h2 id={scoreHeadingId} ref={scoreHeading} tabIndex={-1} className="scroll-mt-28 text-xl font-bold text-foreground">{t("breakdown")}</h2>
        <Button variant="secondary" onClick={() => switchView(false)}>{t("backToResult")}</Button>
      </header>
      <ScoreReport result={result} />
    </section> : null}
  </>;
}
