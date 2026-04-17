"use client";

import { useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { useRouter } from "@/i18n/navigation";
import { AppCard } from "@/components/ui/app-card";
import {
  buildTeacherOnboardingContinueHref,
  parseCompletedTeacherOnboardingSteps,
} from "@/lib/teacher-onboarding-progress";
import {
  isTeacherOnboardingOptionalStep,
  TEACHER_ONBOARDING_STEPS,
  type TeacherOnboardingStep,
} from "@/lib/teacher-onboarding-steps";

const STEP_HREF: Record<TeacherOnboardingStep, "/dashboard/profile" | "/dashboard/integrations" | "/dashboard/schedule" | "/dashboard" | "/dashboard/schedule/completed" | "/learn/study"> =
  {
    profile: "/dashboard/profile",
    integrations: "/dashboard/integrations",
    availability: "/dashboard/schedule",
    students: "/dashboard",
    chat: "/dashboard",
    notes: "/dashboard/schedule/completed",
    materials: "/learn/study",
  };

export function TeacherOnboardingForm({
  completedParam,
  skippedSteps = [],
}: {
  completedParam?: string | null;
  skippedSteps?: ReadonlyArray<string>;
}) {
  const t = useTranslations("onboarding");
  const locale = useLocale();
  const router = useRouter();
  const completed = parseCompletedTeacherOnboardingSteps(completedParam);
  const skipped = new Set(skippedSteps);
  const initial = (step: TeacherOnboardingStep) =>
    completed.includes(step) || skipped.has(step);
  const [checked, setChecked] = useState<Record<TeacherOnboardingStep, boolean>>(() => ({
    profile: initial("profile"),
    integrations: initial("integrations"),
    availability: initial("availability"),
    students: initial("students"),
    chat: initial("chat"),
    notes: initial("notes"),
    materials: initial("materials"),
  }));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const complete = TEACHER_ONBOARDING_STEPS.every((k) => checked[k]);
  const completedCount = TEACHER_ONBOARDING_STEPS.filter((k) => checked[k]).length;
  const progressPct = Math.round((completedCount / TEACHER_ONBOARDING_STEPS.length) * 100);

  function buildStepHref(step: TeacherOnboardingStep): string {
    const base = buildTeacherOnboardingContinueHref(
      `/${locale}${STEP_HREF[step]}`,
      completed as TeacherOnboardingStep[],
      step as TeacherOnboardingStep,
    );
    const separator = base.includes("?") ? "&" : "?";
    return `${base}${separator}onboardingStep=${encodeURIComponent(step)}`;
  }

  async function skipStep(step: TeacherOnboardingStep) {
    setChecked((prev) => ({ ...prev, [step]: true }));
    try {
      await fetch("/api/onboarding/skip-step", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ step }),
      });
    } catch {
      // swallow - UI state already reflects skipped
    }
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!complete) return;
    setSaving(true);
    setError(null);
    try {
      const res = await fetch("/api/onboarding/teacher", { method: "POST" });
      if (!res.ok) {
        setError(t("saveError"));
        return;
      }
      router.push("/dashboard");
    } catch {
      setError(t("saveError"));
    } finally {
      setSaving(false);
    }
  }

  async function onSkip() {
    setSaving(true);
    setError(null);
    try {
      const res = await fetch("/api/onboarding/teacher", { method: "POST" });
      if (!res.ok) {
        setError(t("saveError"));
        return;
      }
      router.push("/dashboard");
    } catch {
      setError(t("saveError"));
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <p className="text-xs font-medium text-muted">
          {t("wizardProgress", {
            current: completedCount,
            total: TEACHER_ONBOARDING_STEPS.length,
          })}
        </p>
        <div
          className="h-1.5 max-w-[12rem] flex-1 overflow-hidden rounded-full bg-border"
          aria-hidden
        >
          <div
            className="h-full rounded-full bg-primary transition-[width] duration-300"
            style={{ width: `${progressPct}%` }}
          />
        </div>
      </div>
      <AppCard>
        <ul className="space-y-3">
          {TEACHER_ONBOARDING_STEPS.map((step) => (
            <li key={step} className="rounded-xl border border-border bg-background p-3">
              <label className="flex items-start gap-2">
                <input
                  type="checkbox"
                  checked={checked[step]}
                  onChange={(e) =>
                    setChecked((prev) => ({ ...prev, [step]: e.target.checked }))
                  }
                  className="mt-1"
                />
                <span className="text-sm text-foreground">
                  <span className="font-semibold">{t(`teacherSteps.${step}.title`)}</span>
                  <span className="mt-1 block text-muted">
                    {t(`teacherSteps.${step}.body`)}{" "}
                    <a
                      href={buildStepHref(step)}
                      className="font-medium text-link"
                    >
                      {t("teacherOpenStep")}
                    </a>
                    {isTeacherOnboardingOptionalStep(step) && !checked[step] ? (
                      <>
                        {" "}
                        ·{" "}
                        <button
                          type="button"
                          className="font-medium text-link underline-offset-4 hover:underline"
                          onClick={() => {
                            void skipStep(step);
                          }}
                        >
                          {t("teacherSkipOptional")}
                        </button>
                      </>
                    ) : null}
                  </span>
                </span>
              </label>
            </li>
          ))}
        </ul>
      </AppCard>
      {error ? (
        <p className="text-sm" style={{ color: "var(--app-danger)" }}>
          {error}
        </p>
      ) : null}
      <div className="flex flex-col items-start gap-3 border-t border-border pt-4 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-xs text-muted">{t("skipForNowHint")}</p>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={onSkip}
            disabled={saving}
            data-testid="teacher-onboarding-skip"
            className="rounded-full border border-border px-5 py-2 text-sm font-semibold text-foreground hover:bg-[var(--app-hover)] disabled:opacity-50"
          >
            {t("skipForNow")}
          </button>
          <button
            type="submit"
            disabled={!complete || saving}
            className="rounded-full bg-primary px-5 py-2 text-sm font-semibold text-primary-foreground hover:opacity-90 disabled:opacity-50"
          >
            {saving ? "…" : t("teacherFinish")}
          </button>
        </div>
      </div>
    </form>
  );
}
