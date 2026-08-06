import { getTranslations } from "next-intl/server";
import type { FlashcardLevelPracticeRollup } from "@/lib/study/study-flashcard-stats";
import { Section } from "@/components/ui/section";
import { StatLedger } from "@/components/ui/stat-ledger";

export async function DashboardFlashcardStats({
  trackPractice,
}: {
  trackPractice: FlashcardLevelPracticeRollup;
}) {
  const t = await getTranslations("dashboard.highlights");

  const acc = trackPractice.avgAccuracyPercent;
  const avgSec =
    trackPractice.avgAnswerMs != null ? Math.round(trackPractice.avgAnswerMs / 1000) : null;

  if (trackPractice.totalAttempts === 0) {
    return null;
  }

  // Same ledger as the teacher dashboard, one step quieter — these are a
  // secondary rollup inside a section, not the page's focal figure. Previously
  // this was four filled boxes with the label above the value, which is the
  // stat-card pattern the ledger exists to replace.
  return (
    <Section title={t("flashcardStatsTitle")} description={t("flashcardStatsIntro")} size="sm">
      <StatLedger
        size="sm"
        stats={[
          { label: t("flashcardAccuracy"), value: acc != null ? `${acc}%` : "—" },
          {
            label: t("flashcardAvgTime"),
            value: avgSec != null ? t("flashcardSeconds", { sec: avgSec }) : "—",
          },
          { label: t("flashcardWeak"), value: trackPractice.weakCount },
          { label: t("flashcardMastered"), value: trackPractice.masteredCount },
        ]}
      />
    </Section>
  );
}
