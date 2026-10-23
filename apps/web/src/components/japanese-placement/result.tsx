"use client";
import type { ReactNode } from "react";
import { useLocale, useTranslations } from "next-intl";
import { LocalDateTime } from "@/components/local-datetime";
import { Outcome } from "@/components/ui/outcome";
import type { JapanesePlacementResult as Result } from "@/lib/japanese-placement/public";

export function JapanesePlacementResult({ result, teacher = false, actions }: { result: Result; teacher?: boolean; actions?: ReactNode }) {
  const t = useTranslations("japanesePlacement");
  const locale = useLocale();
  const estimate = result.levelEstimate;
  const bandLabel = (band: string) => band === "BELOW_N5" ? t("belowN5") : band;
  const estimated = estimate.status === "estimated";
  const insufficientBody = estimate.status === "insufficient_evidence" && estimate.reason === "unconfirmed_reading_or_construction" ? t("unconfirmedBody") : t("insufficientBody");
  return <section aria-label={teacher ? t("teacherResultTitle") : t("resultTitle")}>
    <Outcome title={estimated ? teacher ? t("teacherResultTitle") : t("resultTitle") : estimate.status === "unavailable" ? t("legacyResult") : t("insufficient")}
      figure={estimated ? bandLabel(estimate.band) : null} figureLabel={estimated ? t("provisional") : null}
      description={estimated ? t("resultNote") : estimate.status === "insufficient_evidence" ? insufficientBody : t("resultNote")} actions={actions}>
      {result.completionReason === "time_limit" ? <p className="mb-5 text-sm text-muted">{t("timeExpired")}</p> : null}
      {estimate.status === "estimated" && estimate.basis === "jlpt_aligned_rules" ? <p className="mb-5 text-sm text-muted">{t("ruleBasis")}</p> : null}
      {estimate.status === "estimated" && estimate.modelRange && estimate.modelRange.lower !== estimate.modelRange.upper ? <p className="mb-5 text-sm text-muted">{t("range", { lower: bandLabel(estimate.modelRange.lower), upper: bandLabel(estimate.modelRange.upper) })}</p> : null}
      <h2 className="text-base font-semibold text-foreground">{t("breakdown")}</h2>
      <dl className="mt-2">
        {result.domains.map((row) => <div key={row.domain} className="flex flex-wrap items-baseline justify-between gap-x-5 gap-y-1 border-b border-border py-3">
          <dt className="text-sm font-medium text-foreground">{t(`domains.${row.domain}`)}</dt>
          <dd className="text-right text-sm tabular-nums">
            <span className="block font-semibold text-foreground">{t("correctOfAnswered", { correct: row.correct, answered: row.answered })}</span>
            <span className="block text-xs leading-relaxed text-muted">{t("unanswered", { skipped: row.notSure, unanswered: row.unanswered ?? Math.max(0, row.planned - row.answered - row.notSure) })}</span>
          </dd>
        </div>)}
      </dl>
      <p className="mt-5 text-xs leading-relaxed text-muted">{t("completedAt")}: <LocalDateTime iso={result.completedAt} locale={locale} /></p>
    </Outcome>
  </section>;
}
