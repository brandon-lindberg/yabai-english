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
    const [teacherProfile, googleSettings] = await Promise.all([
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
          <article className="rounded-2xl border border-border bg-surface p-4 shadow-sm">
            <p className="text-xs font-medium uppercase tracking-wide text-muted">
              {t("teacherHome.statUpcoming")}
            </p>
            <p className="mt-2 text-2xl font-semibold text-foreground">{teacherBookings.upcoming.length}</p>
          </article>
          <article className="rounded-2xl border border-border bg-surface p-4 shadow-sm">
            <p className="text-xs font-medium uppercase tracking-wide text-muted">
              {t("teacherHome.statCompleted")}
            </p>
            <p className="mt-2 text-2xl font-semibold text-foreground">{teacherBookings.completed.length}</p>
          </article>
          <article className="rounded-2xl border border-border bg-surface p-4 shadow-sm">
            <p className="text-xs font-medium uppercase tracking-wide text-muted">
              {t("teacherHome.statSlots")}
            </p>
            <p className="mt-2 text-2xl font-semibold text-foreground">
              {teacherProfile?.availabilitySlots.length ?? 0}
            </p>
          </article>
        </div>
        <div className="flex flex-wrap gap-3">
          <Link
            href={
              onboardingHref
                ? `/dashboard/profile?onboardingNext=${encodeURIComponent(onboardingHref)}`
                : "/dashboard/profile"
            }
            className="inline-flex rounded-full border border-border px-4 py-2 text-sm font-semibold text-foreground hover:bg-[var(--app-hover)]"
          >
            {t("teacherHome.editProfile")}
          </Link>
          <Link
            href={
              onboardingHref
                ? `/dashboard/integrations?onboardingNext=${encodeURIComponent(onboardingHref)}`
                : "/dashboard/integrations"
            }
            className="inline-flex rounded-full border border-border px-4 py-2 text-sm font-semibold text-foreground hover:bg-[var(--app-hover)]"
          >
            {t("teacherHome.googleIntegrations")}
          </Link>
          <Link
            href={
              onboardingHref
                ? `/dashboard/schedule?onboardingNext=${encodeURIComponent(onboardingHref)}`
                : "/dashboard/schedule"
            }
            className="inline-flex rounded-full bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground hover:opacity-90"
          >
            {t("teacherHome.openSchedule")}
          </Link>
        </div>
        {session.user.role === "TEACHER" && !calendarReady ? (
          <InlineAlert variant="info">
            <span className="text-foreground">{t("teacherHome.calendarSetupHint")} </span>
            <Link href="/dashboard/integrations" className="font-semibold text-link hover:opacity-90">
              {tCommon("integrations")}
            </Link>
          </InlineAlert>
        ) : null}

        <section>
          <h2 className="mb-3 text-lg font-semibold text-foreground">{t("teacherHome.upcomingSection")}</h2>
          <ul className="space-y-4">
            <TeacherUpcomingLessons upcoming={teacherBookings.upcoming} />
          </ul>
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
  const showResumeOnboardingLink =
    !onboardingHref && profile?.placedLevel === "UNSET";

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
              href="/dashboard/integrations"
              className="rounded-full border border-border px-4 py-2 text-sm font-semibold text-foreground hover:bg-[var(--app-hover)]"
            >
              {tCommon("integrations")}
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
