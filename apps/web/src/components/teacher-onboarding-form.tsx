"use client";

import { useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { PaymentPolicyNotice } from "@/components/payment-policy-notice";
import {
  OnboardingChecklist,
  type OnboardingChecklistItem,
} from "@/components/onboarding-checklist";
import { useOnboardingSubmit } from "@/hooks/use-onboarding-submit";
import {
  buildTeacherOnboardingContinueHref,
  parseCompletedTeacherOnboardingSteps,
} from "@/lib/teacher-onboarding-progress";
import {
  isTeacherOnboardingOptionalStep,
  TEACHER_ONBOARDING_STEPS,
  type TeacherOnboardingStep,
} from "@/lib/teacher-onboarding-steps";
import { buttonClasses } from "@/components/ui/button";
import { actionLinkClass } from "@/components/ui/inline-link";

const STEP_HREF: Record<TeacherOnboardingStep, "/dashboard/profile" | "/dashboard/settings" | "/dashboard/schedule" | "/dashboard" | "/dashboard/schedule/completed" | "/learn/study"> =
  {
    profile: "/dashboard/profile",
    payments: "/dashboard/settings",
    integrations: "/dashboard/settings",
    availability: "/dashboard/schedule",
    students: "/dashboard",
    chat: "/dashboard",
    notes: "/dashboard/schedule/completed",
    materials: "/learn/study",
  };

/**
 * The teacher half of onboarding: the shared checklist, plus who ticks the box.
 *
 * Teacher completion is **self-reported** — the checkbox is the source of truth,
 * seeded from the `completed` query param and the skipped-steps list. The
 * student's identical-looking list derives completion from real signals (a bio
 * exists, a booking exists, a lesson was studied). Both plug the same boolean
 * into `OnboardingChecklist`, so the difference is one prop deep if that ever
 * needs to change.
 */
export function TeacherOnboardingForm({
  completedParam,
  skippedSteps = [],
}: {
  completedParam?: string | null;
  skippedSteps?: ReadonlyArray<string>;
}) {
  const t = useTranslations("onboarding");
  const locale = useLocale();
  const completed = parseCompletedTeacherOnboardingSteps(completedParam);
  const skipped = new Set(skippedSteps);
  const initial = (step: TeacherOnboardingStep) =>
    completed.includes(step) || skipped.has(step);
  const [checked, setChecked] = useState<Record<TeacherOnboardingStep, boolean>>(() => ({
    profile: initial("profile"),
    payments: initial("payments"),
    integrations: initial("integrations"),
    availability: initial("availability"),
    students: initial("students"),
    chat: initial("chat"),
    notes: initial("notes"),
    materials: initial("materials"),
  }));
  const { saving, error, submit } = useOnboardingSubmit();

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

  /* Finish and skip land in the same place: the step record is the checklist. */
  const finish = () => submit("/api/onboarding/teacher", { destination: "/dashboard" });

  const items: OnboardingChecklistItem[] = TEACHER_ONBOARDING_STEPS.map((step) => ({
    key: step,
    title: t(`teacherSteps.${step}.title`),
    body: t(`teacherSteps.${step}.body`),
    href: buildStepHref(step),
    completed: checked[step],
    onToggle: (next) => setChecked((prev) => ({ ...prev, [step]: next })),
    action:
      isTeacherOnboardingOptionalStep(step) && !checked[step] ? (
        <button
          type="button"
          className={actionLinkClass}
          onClick={() => {
            void skipStep(step);
          }}
        >
          {t("teacherSkipOptional")}
        </button>
      ) : undefined,
    note:
      step === "payments" ? (
        <PaymentPolicyNotice audience="teacher" className="mt-3" />
      ) : undefined,
  }));

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        if (!complete) return;
        void finish();
      }}
    >
      <OnboardingChecklist
        testIdPrefix="teacher-onboarding"
        items={items}
        percent={progressPct}
        /* Was "Step 3 of 8", which promised a sequence these steps do not have —
           they can be done in any order. This is the student's wording. */
        progressLabel={t("progressSummary", {
          current: completedCount,
          total: TEACHER_ONBOARDING_STEPS.length,
        })}
        completedLabel={t("completedLabel")}
        openLabel={t("teacherOpenStep")}
        hint={complete ? t("allDoneHint") : t("skipForNowHint")}
        error={error}
        actions={
          <>
            <button
              type="button"
              onClick={() => void finish()}
              disabled={saving}
              data-testid="teacher-onboarding-skip"
              className={buttonClasses({ variant: "secondary" })}
            >
              {t("skipForNow")}
            </button>
            <button type="submit" disabled={!complete || saving} className={buttonClasses()}>
              {saving ? "…" : t("teacherFinish")}
            </button>
          </>
        }
      />
    </form>
  );
}
