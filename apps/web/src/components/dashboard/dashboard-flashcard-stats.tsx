import { getTranslations } from "next-intl/server";
import type { FlashcardLevelPracticeRollup } from "@/lib/study/study-flashcard-stats";

export async function DashboardFlashcardStats({ trackPractice }: { trackPractice: FlashcardLevelPracticeRollup }) {
  const t = await getTranslations("dashboard.highlights");

  const acc = trackPractice.avgAccuracyPercent;
  const avgSec =
    trackPractice.avgAnswerMs != null ? Math.round(trackPractice.avgAnswerMs / 1000) : null;
  const attempts = trackPractice.totalAttempts;

  if (attempts === 0) {
    return null;
  }

  return (
    <div className="rounded-2xl border border-border bg-surface p-5 shadow-sm">
      <h2 className="text-lg font-semibold text-foreground">{t("flashcardStatsTitle")}</h2>
      <p className="mt-1 text-xs text-muted">{t("flashcardStatsIntro")}</p>
      <dl className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <div className="rounded-xl bg-foreground/5 px-3 py-2">
          <dt className="text-xs text-muted">{t("flashcardAccuracy")}</dt>
          <dd className="font-semibold tabular-nums text-foreground">{acc != null ? `${acc}%` : "—"}</dd>
        </div>
        <div className="rounded-xl bg-foreground/5 px-3 py-2">
          <dt className="text-xs text-muted">{t("flashcardAvgTime")}</dt>
          <dd className="font-semibold tabular-nums text-foreground">
            {avgSec != null ? t("flashcardSeconds", { sec: avgSec }) : "—"}
          </dd>
        </div>
        <div className="rounded-xl bg-foreground/5 px-3 py-2">
          <dt className="text-xs text-muted">{t("flashcardWeak")}</dt>
          <dd className="font-semibold tabular-nums text-foreground">{trackPractice.weakCount}</dd>
        </div>
        <div className="rounded-xl bg-foreground/5 px-3 py-2">
          <dt className="text-xs text-muted">{t("flashcardMastered")}</dt>
          <dd className="font-semibold tabular-nums text-foreground">{trackPractice.masteredCount}</dd>
        </div>
      </dl>
    </div>
  );
}
