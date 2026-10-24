"use client";
import { useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import { Button, buttonClasses } from "@/components/ui/button";
import { Link } from "@/i18n/navigation";
import { JapaneseStudySession } from "@/components/study/japanese-study-session";
import { formatQuickReviewDayDisplay } from "@/lib/study/quick-review-day";
import type { JapaneseQuickReviewStatus } from "@/lib/study/japanese-public";
import type { StudyRpgSnapshot } from "@/lib/study/rpg-xp";

/** Daily review uses the same question, feedback and retry controller as full practice. */
export function DashboardJapaneseQuickReview({ initialStatus, initialRpg }: {
  initialStatus: JapaneseQuickReviewStatus; initialRpg: StudyRpgSnapshot;
}) {
  const t = useTranslations("japaneseStudy");
  const locale = useLocale();
  const router = useRouter();
  const [started, setStarted] = useState(false);
  if (initialStatus.total === 0 && !started) return null;
  const complete = initialStatus.answered === initialStatus.total;
  return <section className="border-t border-border pt-5" aria-labelledby="japanese-daily-review-title">
    <div className="flex flex-wrap items-baseline justify-between gap-2">
      <h2 id="japanese-daily-review-title" className="text-lg font-semibold text-foreground">{t("quickTitle")}</h2>
      <p className="text-xs text-muted">{formatQuickReviewDayDisplay(initialStatus.dayKey, locale)}</p>
    </div>
    {started ? <div className="mt-5 max-w-lg"><JapaneseStudySession quickReview initialRpg={initialRpg} onReviewSaved={() => router.refresh()} /></div> : <>
      <p className="mt-2 max-w-prose text-sm leading-relaxed text-muted">{t(complete ? "dailyDone" : "quickIntro")}</p>
      <p className="mt-2 text-sm tabular-nums text-muted">{t("dailyProgress", { answered: initialStatus.answered, total: initialStatus.total })} · {t("dailyScore", { correct: initialStatus.correct, wrong: initialStatus.wrong })}</p>
      <div className="mt-4 flex flex-wrap gap-2">
        {complete ? null : <Button onClick={() => setStarted(true)}>{t(initialStatus.answered ? "quickResume" : "quickStart")}</Button>}
        <Link href="/learn/study" className={buttonClasses({ variant: "secondary" })}>{t("allPractice")}</Link>
      </div>
    </>}
  </section>;
}
