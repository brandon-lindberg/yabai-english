import { getTranslations } from "next-intl/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { Link } from "@/i18n/navigation";
import { getStudentBookingsForDashboard } from "@/lib/dashboard/student-bookings";
import { getOrCreateQuickReviewCards } from "@/lib/study/quick-review";
import { getStudyTrackOverview } from "@/lib/study/get-overview";
import { getStudyResumeInfo } from "@/lib/dashboard/study-resume";
import { DashboardNextLesson } from "@/components/dashboard/dashboard-next-lesson";
import { DashboardProfileSummary } from "@/components/dashboard/dashboard-profile-summary";
import { DashboardFlashcardStats } from "@/components/dashboard/dashboard-flashcard-stats";
import { DashboardStudyHighlight } from "@/components/dashboard/dashboard-study-highlight";
import { DashboardQuickReview } from "@/components/dashboard/dashboard-quick-review";
import { isPlacementRetakeAllowed } from "@/lib/placement-cooldown";
import { getTeacherBookingsForDashboard } from "@/lib/dashboard/teacher-bookings";
import { TeacherUpcomingLessons } from "@/components/dashboard/teacher-upcoming-lessons";
import { PageHeader } from "@/components/ui/page-header";
import { AppCard } from "@/components/ui/app-card";
import { InlineAlert } from "@/components/ui/inline-alert";
import { isTeacherCalendarReady } from "@/lib/teacher-calendar-status";
import { normalizeOnboardingNextHref } from "@/lib/teacher-onboarding-progress";
import { OnboardingResumeBanner } from "@/components/onboarding-resume-banner";
import {
  computeStudentOnboardingCompletion,
  buildStudentOnboardingChecklist,
  summarizeStudentOnboardingProgress,
} from "@/lib/student-onboarding-next-links";
import { isTeacherCabinetRole } from "@/lib/dashboard/teacher-cabinet-role";
import { TEACHER_HOME_SCHEDULE_HREFS, withDashboardOnboarding } from "@/lib/teacher-dashboard-home-links";

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ onboardingNext?: string; onboardingStep?: string }>;
}) {
  const session = await auth();
  if (!session?.user?.id) return null;
  const { onboardingNext, onboardingStep } = await searchParams;
  const onboardingHref = normalizeOnboardingNextHref(onboardingNext ?? null);
  const t = await getTranslations("dashboard");
  const tCommon = await getTranslations("common");
  const th = await getTranslations("dashboard.highlights");

  if (session.user.role !== "STUDENT") {
    const [teacherProfile, googleSettings, accountUser] = await Promise.all([
      prisma.teacherProfile.findUnique({
        where: { userId: session.user.id },
        include: {
          user: true,
          availabilitySlots: { where: { active: true } },
        },
      }),
      prisma.googleIntegrationSettings.findUnique({
        where: { userId: session.user.id },
        select: { calendarConnected: true },
      }),
      prisma.user.findUnique({
        where: { id: session.user.id },
        select: { name: true, email: true, image: true },
      }),
    ]);
    const teacherBookings = teacherProfile
      ? await getTeacherBookingsForDashboard(prisma, teacherProfile.id)
      : { bookings: [], upcoming: [], completed: [], scheduleItems: [] };

    const calendarReady = isTeacherCalendarReady({
      calendarConnected: googleSettings?.calendarConnected,
      legacyRefreshTokenPresent: Boolean(teacherProfile?.googleCalendarRefreshToken),
    });

    return (
      <div className="space-y-8">
        <OnboardingResumeBanner href={onboardingHref} step={onboardingStep ?? null} />
        <PageHeader title={t("teacherHome.title")} description={t("teacherHome.body")} />
        <div className="grid gap-4 sm:grid-cols-3">
          <Link
            href={withDashboardOnboarding(TEACHER_HOME_SCHEDULE_HREFS.upcoming, onboardingHref)}
            aria-label={`${t("teacherHome.statUpcoming")}: ${teacherBookings.upcoming.length}`}
            className="group block rounded-2xl border border-border bg-surface p-4 shadow-sm outline-none transition hover:border-foreground/20 hover:bg-[var(--app-hover)] focus-visible:ring-2 focus-visible:ring-foreground/25"
          >
            <p className="text-xs font-medium uppercase tracking-wide text-muted">
              {t("teacherHome.statUpcoming")}
            </p>
            <p className="mt-2 text-2xl font-semibold tabular-nums text-foreground">
              {teacherBookings.upcoming.length}
            </p>
          </Link>
          <Link
            href={withDashboardOnboarding(TEACHER_HOME_SCHEDULE_HREFS.completed, onboardingHref)}
            aria-label={`${t("teacherHome.statCompleted")}: ${teacherBookings.completed.length}`}
            className="group block rounded-2xl border border-border bg-surface p-4 shadow-sm outline-none transition hover:border-foreground/20 hover:bg-[var(--app-hover)] focus-visible:ring-2 focus-visible:ring-foreground/25"
          >
            <p className="text-xs font-medium uppercase tracking-wide text-muted">
              {t("teacherHome.statCompleted")}
            </p>
            <p className="mt-2 text-2xl font-semibold tabular-nums text-foreground">
              {teacherBookings.completed.length}
            </p>
          </Link>
          <Link
            href={withDashboardOnboarding(TEACHER_HOME_SCHEDULE_HREFS.availability, onboardingHref)}
            aria-label={`${t("teacherHome.statSlots")}: ${teacherProfile?.availabilitySlots.length ?? 0}`}
            className="group block rounded-2xl border border-border bg-surface p-4 shadow-sm outline-none transition hover:border-foreground/20 hover:bg-[var(--app-hover)] focus-visible:ring-2 focus-visible:ring-foreground/25"
          >
            <p className="text-xs font-medium uppercase tracking-wide text-muted">
              {t("teacherHome.statSlots")}
            </p>
            <p className="mt-2 text-2xl font-semibold tabular-nums text-foreground">
              {teacherProfile?.availabilitySlots.length ?? 0}
            </p>
          </Link>
        </div>
        {isTeacherCabinetRole(session.user.role) && !calendarReady ? (
          <InlineAlert variant="info">
            <span className="text-foreground">{t("teacherHome.calendarSetupHint")} </span>
            <Link href="/dashboard/settings" className="font-semibold text-link hover:opacity-90">
              {tCommon("settings")}
            </Link>
          </InlineAlert>
        ) : null}

        <section className="space-y-4">
          <h2 className="text-lg font-semibold leading-snug text-foreground">
            {t("teacherHome.upcomingSection")}
          </h2>
          <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(17.5rem,22rem)] lg:items-start lg:gap-x-8">
            <ul className="min-w-0 list-none space-y-4 p-0">
              <TeacherUpcomingLessons upcoming={teacherBookings.upcoming} />
            </ul>
            <aside className="min-w-0 self-start lg:sticky lg:top-24">
              <DashboardProfileSummary
                name={
                  teacherProfile?.displayName ??
                  teacherProfile?.user.name ??
                  accountUser?.name ??
                  null
                }
                email={teacherProfile?.user.email ?? accountUser?.email ?? null}
                image={teacherProfile?.user.image ?? accountUser?.image ?? null}
                shortBio={teacherProfile?.bio ?? null}
                rpg={null}
                emptyBioLabel={th("teacherProfileCardEmpty")}
              />
            </aside>
          </div>
        </section>
      </div>
    );
  }

  const profile = await prisma.studentProfile.findUnique({
    where: { userId: session.user.id },
  });

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: {
      name: true,
      email: true,
      image: true,
      studentProfile: { select: { shortBio: true } },
    },
  });

  const { upcoming, scheduleItems } = await getStudentBookingsForDashboard(prisma, session.user.id);
  const quick = await getOrCreateQuickReviewCards(prisma, session.user.id);
  const overview = await getStudyTrackOverview(prisma, session.user.id, "english-flashcards");
  const resume = await getStudyResumeInfo(prisma, session.user.id);

  const canStartPlacement = isPlacementRetakeAllowed(profile?.placementCompletedAt ?? null);

  const tOnboarding = await getTranslations("onboarding");

  const [googleSettingsForChecklist, bookingCountForChecklist, threadCountForChecklist, studiedLevelForChecklist] =
    await Promise.all([
      prisma.googleIntegrationSettings.findUnique({
        where: { userId: session.user.id },
        select: { calendarConnected: true, driveConnected: true },
      }),
      prisma.booking.count({ where: { studentId: session.user.id } }),
      prisma.chatThread.count({ where: { studentId: session.user.id } }),
      prisma.userStudyLevelProgress.findFirst({
        where: { userId: session.user.id, lastStudiedAt: { not: null } },
        select: { id: true },
      }),
    ]);

  const studentCompletion = computeStudentOnboardingCompletion(
    {
      profileShortBio: profile?.shortBio ?? null,
      userName: user?.name ?? null,
      userImage: user?.image ?? null,
      googleCalendarConnected: googleSettingsForChecklist?.calendarConnected ?? false,
      googleDriveConnected: googleSettingsForChecklist?.driveConnected ?? false,
      hasAnyBooking: bookingCountForChecklist > 0,
      hasAnyChatThread: threadCountForChecklist > 0,
      placementCompletedAt: profile?.placementCompletedAt ?? null,
      hasStudiedAny: Boolean(studiedLevelForChecklist),
    },
    { skippedSteps: profile?.skippedOnboardingSteps ?? [] },
  );
  const studentChecklistForProgress = buildStudentOnboardingChecklist({
    locale: "en",
    canStartPlacement,
    completion: studentCompletion,
  });
  const studentProgress = summarizeStudentOnboardingProgress(studentChecklistForProgress);
  const showResumeOnboardingLink =
    !onboardingHref &&
    profile?.placedLevel === "UNSET" &&
    studentProgress.percent < 100;

  return (
    <div className="space-y-10">
      <OnboardingResumeBanner href={onboardingHref} step={onboardingStep ?? null} />
      {showResumeOnboardingLink ? (
        <div className="flex flex-col gap-3 rounded-xl border border-border bg-surface px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-sm text-foreground">
            {tOnboarding("resumeHint")}
          </p>
          <Link
            href="/onboarding/next"
            className="inline-flex rounded-full border border-border px-4 py-2 text-sm font-semibold text-foreground hover:bg-[var(--app-hover)]"
          >
            {tOnboarding("resumeChecklistCta")}
          </Link>
        </div>
      ) : null}
      <PageHeader title={th("pageTitle")} description={th("pageIntro")} />

      {profile ? (
        <AppCard className="flex flex-col gap-4 sm:flex-row sm:flex-wrap sm:items-center">
          <p className="min-w-0 flex-1 text-sm text-muted">
            {t("placedLevel")}:{" "}
            <span className="font-semibold text-foreground">
              {profile.placedLevel === "UNSET"
                ? t("placedUnset")
                : `${t(`levelLabel.${profile.placedLevel}`)} ${t("subLevelShort", {
                    subLevel: profile.placedSubLevel ?? 1,
                  })}`}
            </span>
          </p>
          <div className="flex flex-wrap gap-2">
            <Link
              href="/book"
              className="rounded-full bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground hover:opacity-90"
            >
              {tCommon("bookLesson")}
            </Link>
            <Link
              href="/dashboard/settings"
              className="rounded-full border border-border px-4 py-2 text-sm font-semibold text-foreground hover:bg-[var(--app-hover)]"
            >
              {tCommon("settings")}
            </Link>
            {canStartPlacement ? (
              profile.placedLevel === "UNSET" ? (
                <Link
                  href="/placement"
                  className="rounded-full border border-border bg-[var(--app-chip)] px-4 py-2 text-sm font-semibold text-foreground hover:opacity-90"
                >
                  {t("placementCta")}
                </Link>
              ) : (
                <Link
                  href="/placement"
                  className="rounded-full border border-border px-4 py-2 text-sm font-semibold text-muted hover:bg-[var(--app-hover)]"
                >
                  {t("retakePlacement")}
                </Link>
              )
            ) : null}
          </div>
        </AppCard>
      ) : null}

      <div className="grid gap-6 lg:grid-cols-2">
        <DashboardNextLesson upcoming={upcoming} />
        <DashboardProfileSummary
          name={user?.name ?? null}
          email={user?.email ?? null}
          image={user?.image ?? null}
          shortBio={user?.studentProfile?.shortBio ?? null}
          rpg={overview?.rpg ?? null}
        />
      </div>

      {overview ? <DashboardStudyHighlight overview={overview} resume={resume} /> : null}

      {overview ? <DashboardFlashcardStats trackPractice={overview.trackPractice} /> : null}

      <section>
        <DashboardQuickReview
          initialCards={quick.cards}
          dayKey={quick.dayKey}
          initialLearnedToday={quick.learnedToday}
          initialNotYetToday={quick.notYetToday}
        />
      </section>

      {scheduleItems.length > 0 ? (
        <p className="text-center text-sm text-muted">
          <Link href="/dashboard/schedule" className="text-link">
            {th("seeFullSchedule")}
          </Link>
        </p>
      ) : null}
    </div>
  );
}
