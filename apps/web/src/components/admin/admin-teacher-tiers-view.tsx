"use client";

import { useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import type { TeacherPlatformTier } from "@/generated/prisma/browser";
import { useBrowserTimezone } from "@/hooks/use-browser-timezone";
import { buttonClasses } from "@/components/ui/button";
import { Field, Input, Select } from "@/components/ui/field";

export type AdminTeacherTierRow = {
  teacherId: string;
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
  const [legacyTeacherId, setLegacyTeacherId] = useState(rows[0]?.teacherId ?? "");
  const [legacyStudentId, setLegacyStudentId] = useState("");
  const [legacyOfferingId, setLegacyOfferingId] = useState("");
  const [legacyRateYen, setLegacyRateYen] = useState("2500");

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

  async function saveLegacyRate() {
    setBusyId("legacy-rate");
    await fetch("/api/admin/teacher-student-rates", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        teacherId: legacyTeacherId,
        studentId: legacyStudentId,
        teacherLessonOfferingId: legacyOfferingId,
        rateYen: Number(legacyRateYen),
        active: true,
      }),
    });
    setBusyId(null);
  }

  return (
    <div className="space-y-3">
      <section className="border-t border-border pt-6">
        <h2 className="font-semibold text-foreground">{t("legacyTitle")}</h2>
        <p className="mt-1 text-sm text-muted">{t("legacyIntro")}</p>
        {/*
          NOTE: every string on this screen is hardcoded English — the component
          never calls `useTranslations`. Converting the controls does not change
          that; the screen still needs translating, tracked in AUDIT.md.
        */}
        <div className="mt-4 grid gap-4 sm:grid-cols-4">
          <Field label={t("fieldTeacher")}>
            {(field) => (
              <Select
                {...field}
                value={legacyTeacherId}
                onChange={(e) => setLegacyTeacherId(e.target.value)}
              >
                {rows.map((row) => (
                  <option key={row.teacherId} value={row.teacherId}>
                    {row.name}
                  </option>
                ))}
              </Select>
            )}
          </Field>
          <Field label={t("fieldStudentId")}>
            {(field) => (
              <Input
                {...field}
                value={legacyStudentId}
                onChange={(e) => setLegacyStudentId(e.target.value)}
              />
            )}
          </Field>
          <Field label={t("fieldOfferingId")}>
            {(field) => (
              <Input
                {...field}
                value={legacyOfferingId}
                onChange={(e) => setLegacyOfferingId(e.target.value)}
              />
            )}
          </Field>
          <Field label={t("fieldRateYen")}>
            {(field) => (
              <Input
                {...field}
                inputMode="numeric"
                value={legacyRateYen}
                onChange={(e) => setLegacyRateYen(e.target.value.replace(/\D/g, ""))}
              />
            )}
          </Field>
        </div>
        <button
          type="button"
          disabled={
            busyId === "legacy-rate" ||
            !legacyTeacherId ||
            !legacyStudentId ||
            !legacyOfferingId ||
            !legacyRateYen
          }
          onClick={() => void saveLegacyRate()}
          className={buttonClasses({ variant: "secondary", className: "mt-4" })}
        >
          {t("saveLegacyRate")}
        </button>
      </section>
      {rows.map((row) => (
        <section key={row.teacherId} className="border-t border-border pt-6">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <h2 className="font-semibold text-foreground">{row.name}</h2>
              <p className="text-sm text-muted">{row.email ?? t("noEmail")}</p>
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
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                disabled={busyId === row.teacherId}
                onClick={() => void evaluate(row.teacherId)}
                className="rounded-full border border-border px-3 py-1.5 text-xs font-semibold hover:bg-[var(--app-hover)] disabled:opacity-50"
              >
                {t("evaluateNow")}
              </button>
              {(["TIER_1", "TIER_2", "TIER_3"] as const).map((tier) => (
                <button
                  key={tier}
                  type="button"
                  disabled={busyId === row.teacherId}
                  onClick={() => void setOverride(row.teacherId, tier)}
                  className="rounded-full border border-border px-3 py-1.5 text-xs font-semibold hover:bg-[var(--app-hover)] disabled:opacity-50"
                >
                  {t("setTier", { tier: tierLabel(tier) })}
                </button>
              ))}
              {row.overrideTier ? (
                <button
                  type="button"
                  disabled={busyId === row.teacherId}
                  onClick={() => void removeOverride(row.teacherId)}
                  className="rounded-full border border-border px-3 py-1.5 text-xs font-semibold hover:bg-[var(--app-hover)] disabled:opacity-50"
                >
                  {t("removeOverride")}
                </button>
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
