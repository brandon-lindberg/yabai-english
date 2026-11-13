"use client";

import { useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import type { TeacherPlatformTier } from "@/generated/prisma/browser";
import { useBrowserTimezone } from "@/hooks/use-browser-timezone";
import { Button } from "@/components/ui/button";
import { Link } from "@/i18n/navigation";
import { actionLinkClass } from "@/components/ui/inline-link";

export type AdminTeacherTierRow = {
  teacherId: string;
  userId: string;
  name: string;
  email: string | null;
  calculatedTier: TeacherPlatformTier;
  effectiveTier: TeacherPlatformTier;
  overrideTier: TeacherPlatformTier | null;
  overrideExpiresAt: string | null;
  nextQuarterlyReviewAt: string | null;
  pendingEvaluationId: string | null;
};

type Props = {
  rows: AdminTeacherTierRow[];
};


/**
 * Every string on this screen used to be hardcoded English — the component never
 * called `useTranslations`, alone among the app's screens. "Tier 1" was even
 * built by string-replacing the enum, which no other locale can follow.
 */
export function AdminTeacherTiersView({ rows }: Props) {
  const t = useTranslations("admin.teacherTiersPage");
  const locale = useLocale();
  const profile = useTranslations("admin.profileOverview");
  const tierLabel = (tier: TeacherPlatformTier) =>
    t("tierName", { number: tier.replace("TIER_", "") });
  /*
    These read as one sentence with the date inside it, and Japanese orders the
    pieces differently, so the date has to be a value the message interpolates
    rather than markup wrapped around it. That rules out passing a component:
    `t.rich`'s function form builds *tags*, and against a plain `{date}`
    placeholder it rendered nothing — both dates on this screen came out blank.
  */
  const timeZone = useBrowserTimezone();
  const formatDate = (iso: string | null, fallback: string) => {
    if (!iso) return fallback;
    if (!timeZone) return "…";
    return new Date(iso).toLocaleDateString(locale, { dateStyle: "medium", timeZone });
  };
  const [busyId, setBusyId] = useState<string | null>(null);
  async function evaluate(teacherId: string) {
    setBusyId(teacherId);
    await fetch("/api/admin/teacher-tiers/evaluate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ teacherId }),
    });
    window.location.reload();
  }

  async function setOverride(teacherId: string, tier: TeacherPlatformTier) {
    setBusyId(teacherId);
    await fetch(`/api/admin/teacher-tiers/${teacherId}/override`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ tier }),
    });
    window.location.reload();
  }

  async function removeOverride(teacherId: string) {
    setBusyId(teacherId);
    await fetch(`/api/admin/teacher-tiers/${teacherId}/override`, { method: "DELETE" });
    window.location.reload();
  }

  async function decideEvaluation(id: string, action: "approve-demotion" | "keep-tier") {
    setBusyId(id);
    await fetch(`/api/admin/teacher-tiers/evaluations/${id}/${action}`, { method: "POST" });
    window.location.reload();
  }

  return (
    <div className="space-y-3">
      {rows.map((row) => (
        <section key={row.teacherId} className="border-t border-border pt-6">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <h2 className="font-semibold text-foreground">{row.name}</h2>
              <p className="text-sm text-muted">{row.email ?? t("noEmail")}</p>
              <Link className={`${actionLinkClass} mt-2 text-sm`} href={`/admin/users/${row.userId}#pricing`}>{profile("pricing")}</Link>
              <p className="mt-2 text-sm text-muted">
                {t("tierSummary", {
                  calculated: tierLabel(row.calculatedTier),
                  effective: tierLabel(row.effectiveTier),
                })}
              </p>
              {row.overrideTier ? (
                <p className="mt-1 text-xs text-muted">
                  {t("overrideLine", {
                    tier: tierLabel(row.overrideTier),
                    until: formatDate(row.overrideExpiresAt, t("overrideUntilAdmin")),
                  })}
                </p>
              ) : null}
              {/* `toLocaleDateString()` with no arguments formatted in the
                  browser's locale rather than the app's, and in whichever zone
                  the runtime happened to be in. */}
              <p className="mt-1 text-xs text-muted">
                {t("nextReview", {
                  date: formatDate(row.nextQuarterlyReviewAt, t("notStarted")),
                })}
              </p>
            </div>
            {/*
              Four identical pills sat here — "Evaluate now" beside three "Set
              Tier N" — all the same weight, so nothing said which was the
              routine action and which three overrode the calculation. The
              override is now one labelled group, and the tier a teacher already
              has is no longer offered again.
            */}
            <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
              <Button
                variant="secondary"
                size="sm"
                disabled={busyId === row.teacherId}
                onClick={() => void evaluate(row.teacherId)}
              >
                {t("evaluateNow")}
              </Button>
              <div className="flex items-center gap-1">
                <span className="text-sm text-muted">{t("overrideTo")}</span>
                {(["TIER_1", "TIER_2", "TIER_3"] as const).map((tier) => (
                  <Button
                    key={tier}
                    variant="ghost"
                    size="sm"
                    disabled={busyId === row.teacherId || row.effectiveTier === tier}
                    onClick={() => void setOverride(row.teacherId, tier)}
                  >
                    {tierLabel(tier)}
                  </Button>
                ))}
              </div>
              {row.overrideTier ? (
                <Button
                  variant="secondary"
                  size="sm"
                  disabled={busyId === row.teacherId}
                  onClick={() => void removeOverride(row.teacherId)}
                >
                  {t("removeOverride")}
                </Button>
              ) : null}
            </div>
          </div>
          {row.pendingEvaluationId ? (
            <div className="mt-3 flex flex-wrap items-center gap-2 rounded-lg border border-[var(--app-warn-border)] bg-[var(--app-warn-bg)] p-3 text-sm text-[var(--app-warn-text)]">
              <span className="font-medium">{t("demotionPending")}</span>
              <button
                type="button"
                onClick={() => void decideEvaluation(row.pendingEvaluationId!, "approve-demotion")}
                className="rounded-full border border-current px-3 py-1 text-xs font-semibold"
              >
                {t("approveDemotion")}
              </button>
              <button
                type="button"
                onClick={() => void decideEvaluation(row.pendingEvaluationId!, "keep-tier")}
                className="rounded-full border border-current px-3 py-1 text-xs font-semibold"
              >
                {t("keepTier")}
              </button>
            </div>
          ) : null}
        </section>
      ))}
    </div>
  );
}
