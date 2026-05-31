import type { TeacherPlatformTier } from "@/generated/prisma/client";

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

const TIER_META: Record<TeacherPlatformTier, { label: string; className: string; schedule: string }> = {
  TIER_1: {
    label: "Tier 1",
    className: "border-amber-200 bg-amber-50 text-amber-900",
    schedule: "Lessons 1-5: 20%, 6-10: 15%, 11+: 10%",
  },
  TIER_2: {
    label: "Tier 2",
    className: "border-sky-200 bg-sky-50 text-sky-900",
    schedule: "Lessons 1-10: 15%, 11+: 10%",
  },
  TIER_3: {
    label: "Tier 3",
    className: "border-emerald-200 bg-emerald-50 text-emerald-900",
    schedule: "Flat 10%",
  },
};

function formatDate(value: string | null) {
  if (!value) return "Not started";
  return new Date(value).toLocaleDateString();
}

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
  const meta = TIER_META[effectiveTier];
  return (
    <section className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold text-foreground">Platform tier</h2>
        <p className="mt-1 text-sm text-muted">
          Your tier controls the platform fee for future paid lessons.
        </p>
      </div>

      <section className={`rounded-xl border p-4 ${meta.className}`}>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide">Current tier</p>
            <h3 className="mt-1 text-2xl font-bold">{meta.label}</h3>
          </div>
          <div className="rounded-full border border-current px-3 py-1 text-xs font-semibold">
            {source === "OVERRIDE" ? "Admin override" : "Calculated"}
          </div>
        </div>
        <p className="mt-3 text-sm">{meta.schedule}</p>
        {source === "OVERRIDE" ? (
          <p className="mt-2 text-xs">
            Override expiry: {overrideExpiresAt ? formatDate(overrideExpiresAt) : "No expiry"}
          </p>
        ) : null}
      </section>

      <div className="grid gap-3 sm:grid-cols-3">
        <div className="rounded-xl border border-border bg-surface p-4">
          <p className="text-xs text-muted">Calculated tier</p>
          <p className="mt-1 font-semibold text-foreground">{TIER_META[calculatedTier].label}</p>
        </div>
        <div className="rounded-xl border border-border bg-surface p-4">
          <p className="text-xs text-muted">Tier clock started</p>
          <p className="mt-1 font-semibold text-foreground">{formatDate(firstPaidLessonAt)}</p>
        </div>
        <div className="rounded-xl border border-border bg-surface p-4">
          <p className="text-xs text-muted">Next review</p>
          <p className="mt-1 font-semibold text-foreground">
            {formatDate(nextQuarterlyReviewAt)}
          </p>
          <p className="mt-1 text-xs text-muted">Annual: {formatDate(nextAnnualReviewAt)}</p>
        </div>
      </div>

      <section className="rounded-xl border border-border bg-surface p-4">
        <h3 className="text-base font-semibold text-foreground">Recent evaluations</h3>
        {evaluations.length === 0 ? (
          <p className="mt-2 text-sm text-muted">
            No tier evaluations yet. The first review happens after three paid-lesson months.
          </p>
        ) : (
          <div className="mt-3 divide-y divide-border text-sm">
            {evaluations.map((evaluation) => (
              <div key={evaluation.id} className="grid gap-2 py-3 sm:grid-cols-4">
                <p className="font-medium text-foreground">{evaluation.kind}</p>
                <p className="text-muted">
                  {formatDate(evaluation.periodStart)} - {formatDate(evaluation.periodEnd)}
                </p>
                <p className="text-muted">Average {evaluation.averageLessons.toFixed(1)}</p>
                <p className="text-muted">
                  {TIER_META[evaluation.recommendedTier].label} / {evaluation.status}
                </p>
              </div>
            ))}
          </div>
        )}
      </section>
    </section>
  );
}
