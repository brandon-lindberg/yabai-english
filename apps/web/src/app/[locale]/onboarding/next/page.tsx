import { getLocale, getTranslations } from "next-intl/server";
import { redirect } from "@/i18n/navigation";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/onboarding-gate";
import { getStudentPostOnboardingRoute } from "@/lib/onboarding-routing";
import { readStudentOnboardingState } from "@/lib/student-onboarding-state";
import {
  buildStudentOnboardingChecklist,
  summarizeStudentOnboardingProgress,
} from "@/lib/student-onboarding-next-links";
import { OnboardingChecklist } from "@/components/onboarding-checklist";
import { buttonClasses } from "@/components/ui/button";
import { PageHeader } from "@/components/ui/page-header";

export default async function OnboardingNextPage() {
  const locale = await getLocale();
  const t = await getTranslations("onboarding");
  const user = await requireAuth(locale);
  const isEnglish = user.learningLanguage === "ENGLISH";

  if (user.role === "TEACHER") {
    redirect({ href: "/onboarding/teacher", locale });
  }
  if (user.role !== "STUDENT") {
    redirect({ href: "/dashboard", locale });
  }

  const { profile, canStartPlacement, completion, materialsAvailable } =
    await readStudentOnboardingState(prisma, user.id, user.learningLanguage);

  if (!profile?.onboardingCompletedAt) {
    redirect({ href: "/onboarding", locale });
  }

  const placedLevel = profile?.placedLevel ?? "UNSET";

  if (isEnglish && placedLevel !== "UNSET") {
    redirect({ href: getStudentPostOnboardingRoute(placedLevel), locale });
  }

  const studentChecklist = buildStudentOnboardingChecklist({
    locale,
    canStartPlacement,
    completion,
    learningLanguage: user.learningLanguage,
    materialsAvailable,
  });
  const progress = summarizeStudentOnboardingProgress(studentChecklist);

  return (
    <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col px-4 py-10 sm:px-6">
      <PageHeader title={t("nextTitle")} description={t("nextSubtitle")} />

      <div className="mt-8">
        <OnboardingChecklist
          testIdPrefix="student-onboarding"
          /*
            A student's steps are derived rather than declared — the bio exists,
            a booking exists, a level was studied — so there is nothing to tick.
            No `onToggle` is what makes each row a plain link.
          */
          items={studentChecklist.map((item) => ({
            key: item.key,
            title: t(`studentSteps.${item.key}.title`),
            body: t(item.key === "materials" && !materialsAvailable
              ? "materialsUnavailable" : `studentSteps.${item.key}.body`),
            href: item.disabled ? null : item.href,
            completed: item.completed,
          }))}
          percent={progress.percent}
          progressLabel={t("progressSummary", {
            current: progress.completed,
            total: progress.total,
          })}
          completedLabel={t("completedLabel")}
          hint={progress.percent === 100 ? t("allDoneHint") : t("skipForNowHint")}
          actions={
            progress.percent === 100 ? (
              <a
                href={`/${locale}/dashboard`}
                data-testid="student-onboarding-finish"
                className={buttonClasses({ size: "lg" })}
              >
                {t("finishOnboarding")}
              </a>
            ) : (
              <a
                href={`/${locale}/dashboard`}
                data-testid="student-onboarding-skip"
                className={buttonClasses({ variant: "secondary" })}
              >
                {t("skipForNow")}
              </a>
            )
          }
        />
      </div>
    </main>
  );
}
