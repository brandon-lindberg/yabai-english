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
      <h1 className="text-2xl font-bold text-foreground">{t("nextTitle")}</h1>
      <p className="mt-2 text-sm text-muted">{t("nextSubtitle")}</p>

      <section
        aria-label={t("progressSummary", {
          current: progress.completed,
          total: progress.total,
        })}
        className="mt-6 flex items-center gap-3"
        data-testid="student-onboarding-progress"
      >
        <div
          className="h-2 flex-1 overflow-hidden rounded-full bg-border"
          aria-hidden
        >
          <div
            data-testid="student-onboarding-progress-bar"
            className="h-full rounded-full bg-primary transition-[width] duration-300"
            style={{ width: `${progress.percent}%` }}
          />
        </div>
        <p className="text-xs font-medium text-muted" data-testid="student-onboarding-progress-label">
          {t("progressSummary", { current: progress.completed, total: progress.total })}
        </p>
      </section>

      <div className="mt-6 space-y-3">
        {studentChecklist.map((item) => {
          const title = t(`studentSteps.${item.key}.title`);
          const body = t(`studentSteps.${item.key}.body`);
          const StatusIcon = (
            <span
              aria-hidden="true"
              data-testid={`step-status-${item.key}`}
              data-completed={item.completed ? "true" : "false"}
              className={
                "mt-0.5 inline-flex h-6 w-6 flex-none items-center justify-center rounded-full border text-xs font-bold " +
                (item.completed
                  ? "border-green-600/50 bg-green-500/15 text-green-700 dark:text-green-400"
                  : "border-border bg-surface text-muted")
              }
            >
              {item.completed ? "\u2713" : ""}
            </span>
          );
          const Content = (
            <div className="flex items-start gap-3">
              {StatusIcon}
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <p className="text-base font-semibold text-foreground">{title}</p>
                  {item.completed ? (
                    <span className="inline-flex items-center rounded-full bg-green-500/15 px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wide text-green-700 dark:text-green-400">
                      {t("completedLabel")}
                    </span>
                  ) : null}
                </div>
                <p className="mt-1 text-sm text-muted">{body}</p>
              </div>
            </div>
          );

          if (item.disabled) {
            return (
              <div
                key={item.key}
                data-testid={`step-card-${item.key}`}
                data-completed={item.completed ? "true" : "false"}
                aria-label={item.completed ? `${title} (${t("completedLabel")})` : title}
                className={
                  "rounded-2xl border p-5 opacity-70 " +
                  (item.completed
                    ? "border-green-600/40 bg-green-500/5"
                    : "border-dashed border-border bg-surface")
                }
              >
                {Content}
              </div>
            );
          }

          return (
            <a
              key={item.key}
              href={item.href}
              data-testid={`step-card-${item.key}`}
              data-completed={item.completed ? "true" : "false"}
              aria-label={item.completed ? `${title} (${t("completedLabel")})` : title}
              className={
                "block rounded-2xl border p-5 text-foreground hover:bg-[var(--app-hover)] " +
                (item.completed
                  ? "border-green-600/40 bg-green-500/5"
                  : "border-border bg-surface")
              }
            >
              {Content}
            </a>
          );
        })}
      </div>

      <div className="mt-8 flex flex-col items-start gap-2 border-t border-border pt-6 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-xs text-muted">
          {progress.percent === 100 ? t("allDoneHint") : t("skipForNowHint")}
        </p>
        <div className="flex flex-wrap gap-2">
          {progress.percent === 100 ? (
            <a
              href={`/${locale}/dashboard`}
              data-testid="student-onboarding-finish"
              className="inline-flex rounded-full bg-primary px-5 py-2 text-sm font-semibold text-primary-foreground hover:opacity-90"
            >
              {t("finishOnboarding")}
            </a>
          ) : (
            <a
              href={`/${locale}/dashboard`}
              data-testid="student-onboarding-skip"
              className="inline-flex rounded-full border border-border px-4 py-2 text-sm font-semibold text-foreground hover:bg-[var(--app-hover)]"
            >
              {t("skipForNow")}
            </a>
          )}
        </div>
      </div>
    </main>
  );
}
