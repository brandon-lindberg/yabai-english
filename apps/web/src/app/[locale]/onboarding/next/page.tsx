import { getLocale, getTranslations } from "next-intl/server";
import { redirect } from "@/i18n/navigation";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/onboarding-gate";
import { getStudentPostOnboardingRoute } from "@/lib/onboarding-routing";
import { isPlacementRetakeAllowed } from "@/lib/placement-cooldown";
import {
  buildStudentOnboardingChecklist,
  computeStudentOnboardingCompletion,
  summarizeStudentOnboardingProgress,
} from "@/lib/student-onboarding-next-links";
import { OnboardingChecklist } from "@/components/onboarding-checklist";
import { buttonClasses } from "@/components/ui/button";
import { PageHeader } from "@/components/ui/page-header";

export default async function OnboardingNextPage() {
  const locale = await getLocale();
  const t = await getTranslations("onboarding");
  const user = await requireAuth(locale);

  if (user.role === "TEACHER") {
    redirect({ href: "/onboarding/teacher", locale });
  }
  if (user.role !== "STUDENT") {
    redirect({ href: "/dashboard", locale });
  }

  const [profile, userRecord, googleSettings, bookingCount, threadCount, studiedLevel] =
    await Promise.all([
      prisma.studentProfile.findUnique({
        where: { userId: user.id },
        select: {
          onboardingCompletedAt: true,
          placedLevel: true,
          placementCompletedAt: true,
          shortBio: true,
          skippedOnboardingSteps: true,
        },
      }),
      prisma.user.findUnique({
        where: { id: user.id },
        select: { name: true, image: true },
      }),
      prisma.googleIntegrationSettings.findUnique({
        where: { userId: user.id },
        select: { calendarConnected: true, driveConnected: true },
      }),
      prisma.booking.count({ where: { studentId: user.id } }),
      prisma.chatThread.count({ where: { studentId: user.id } }),
      prisma.userStudyLevelProgress.findFirst({
        where: { userId: user.id, lastStudiedAt: { not: null } },
        select: { id: true },
      }),
    ]);

  if (!profile?.onboardingCompletedAt) {
    redirect({ href: "/onboarding", locale });
  }

  const placedLevel = profile?.placedLevel ?? "UNSET";

  if (placedLevel !== "UNSET") {
    redirect({ href: getStudentPostOnboardingRoute(placedLevel), locale });
  }

  const canStartPlacement = isPlacementRetakeAllowed(profile?.placementCompletedAt ?? null);
  const completion = computeStudentOnboardingCompletion(
    {
      profileShortBio: profile?.shortBio ?? null,
      userName: userRecord?.name ?? null,
      userImage: userRecord?.image ?? null,
      googleCalendarConnected: googleSettings?.calendarConnected ?? false,
      googleDriveConnected: googleSettings?.driveConnected ?? false,
      hasAnyBooking: bookingCount > 0,
      hasAnyChatThread: threadCount > 0,
      placementCompletedAt: profile?.placementCompletedAt ?? null,
      hasStudiedAny: Boolean(studiedLevel),
    },
    { skippedSteps: profile?.skippedOnboardingSteps ?? [] },
  );
  const studentChecklist = buildStudentOnboardingChecklist({
    locale,
    canStartPlacement,
    completion,
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
            body: t(`studentSteps.${item.key}.body`),
            // Placement inside its retake cooldown: shown, but not openable.
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
