"use client";

import { useFormatter, useTranslations } from "next-intl";
import type { TeacherPlatformTier } from "@/generated/prisma/client";
import { DataList, DataRow } from "@/components/ui/data-row";
import { Section } from "@/components/ui/section";
import { StatLedger } from "@/components/ui/stat-ledger";
import { Status } from "@/components/ui/status";
import { TierExplainer } from "@/components/settings/tier-explainer";

type TierSource = "CALCULATED" | "OVERRIDE";

export type TeacherTierSettingsEvaluation = {
  id: string;
  kind: string;
  periodStart: string;
  periodEnd: string;
  averageLessons: number;
  recommendedTier: TeacherPlatformTier;
  status: string;
};

type Props = {
  calculatedTier: TeacherPlatformTier;
  effectiveTier: TeacherPlatformTier;
  source: TierSource;
  firstPaidLessonAt: string | null;
  nextQuarterlyReviewAt: string | null;
  nextAnnualReviewAt: string | null;
  overrideExpiresAt: string | null;
  evaluations: TeacherTierSettingsEvaluation[];
};

const TIER_LABEL: Record<TeacherPlatformTier, string> = {
  TIER_1: "Tier 1",
  TIER_2: "Tier 2",
  TIER_3: "Tier 3",
};

/**
 * The fee schedule per tier is already written, and translated, in the
 * marketplace economics notice. It is the same fact, so it is read from the
 * same keys rather than restated here in English — which is what this
 * component used to do, in a `TIER_META` table whose three `className` entries
 * were also identical to each other.
 */
const TIER_SCHEDULE_KEY: Record<TeacherPlatformTier, "tier1Schedule" | "tier2Schedule" | "tier3Schedule"> = {
  TIER_1: "tier1Schedule",
  TIER_2: "tier2Schedule",
  TIER_3: "tier3Schedule",
};

export function TeacherTierSettings({
  calculatedTier,
  effectiveTier,
  source,
  firstPaidLessonAt,
  nextQuarterlyReviewAt,
  nextAnnualReviewAt,
  overrideExpiresAt,
  evaluations,
}: Props) {
  const t = useTranslations("dashboard.settingsPage.tierSettings");
  const te = useTranslations("dashboard.settingsPage.marketplaceEconomics");
  const format = useFormatter();

  // Was `new Date(value).toLocaleDateString()` with no locale — the server and
  // the browser could disagree, and a Japanese reader got US formatting.
  const formatDate = (value: string | null) =>
    value ? format.dateTime(new Date(value), { dateStyle: "medium" }) : t("notStarted");

  return (
    <Section
      title={t("title")}
      description={t("intro")}
      size="lg"
      ruled={false}
      actions={<TierExplainer />}
    >
      {/* The tier is the answer this page exists to give, so it carries itself
          at figure scale. It used to sit under an uppercase "CURRENT TIER"
          eyebrow inside a tinted box. */}
      <div className="border-y border-border py-6">
        <p className="flex flex-wrap items-center gap-x-4 gap-y-2">
          <span className="text-[clamp(2rem,6vw,3rem)] font-black leading-none tracking-[-0.04em] text-foreground">
            {TIER_LABEL[effectiveTier]}
          </span>
          <Status tone={source === "OVERRIDE" ? "warn" : "settled"}>
            {source === "OVERRIDE" ? t("sourceOverride") : t("sourceCalculated")}
          </Status>
        </p>
        <p className="mt-3 text-sm text-muted">{t("currentTier")}</p>
        <p className="mt-3 max-w-[62ch] leading-relaxed text-foreground">
          {te(TIER_SCHEDULE_KEY[effectiveTier])}
        </p>
        {source === "OVERRIDE" ? (
          <p className="mt-2 text-sm text-muted">
            {overrideExpiresAt
              ? t("overrideExpiry", { date: formatDate(overrideExpiresAt) })
              : t("overrideNoExpiry")}
          </p>
        ) : null}
      </div>

      {/* Three equal bordered boxes with a label above a value is the stat-card
          template the ledger exists to replace. */}
      <StatLedger
        size="sm"
        className="mt-8"
        stats={[
          { label: t("calculatedTier"), value: TIER_LABEL[calculatedTier] },
          { label: t("clockStarted"), value: formatDate(firstPaidLessonAt) },
          { label: t("nextReview"), value: formatDate(nextQuarterlyReviewAt) },
        ]}
      />
      <p className="mt-2 text-sm text-muted">
        {t("annualReview", { date: formatDate(nextAnnualReviewAt) })}
      </p>

      <Section title={t("evaluationsTitle")} className="mt-10">
        {evaluations.length === 0 ? (
          <p className="border-y border-border py-6 text-sm text-muted">{t("evaluationsEmpty")}</p>
        ) : (
          <DataList>
            {evaluations.map((evaluation) => (
              <DataRow
                key={evaluation.id}
                actions={
                  <span className="text-right">
                    <span className="block text-sm font-semibold text-foreground">
                      {t("evaluationRecommends", {
                        tier: TIER_LABEL[evaluation.recommendedTier],
                      })}
                    </span>
                    <span className="mt-0.5 block text-sm text-muted">{evaluation.status}</span>
                  </span>
                }
              >
                <p className="font-semibold text-foreground">{evaluation.kind}</p>
                <p className="mt-0.5 text-sm tabular-nums text-muted">
                  {formatDate(evaluation.periodStart)} – {formatDate(evaluation.periodEnd)} ·{" "}
                  {t("evaluationAverage", { count: evaluation.averageLessons.toFixed(1) })}
                </p>
              </DataRow>
            ))}
          </DataList>
        )}
      </Section>
    </Section>
  );
}
