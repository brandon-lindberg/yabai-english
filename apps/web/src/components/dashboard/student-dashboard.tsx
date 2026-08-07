import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { prisma } from "@/lib/prisma";
import { getStudentBookingsForDashboard } from "@/lib/dashboard/student-bookings";
import { getOrCreateQuickReviewCards } from "@/lib/study/quick-review";
import { getStudyTrackOverview } from "@/lib/study/get-overview";
import { getStudyResumeInfo } from "@/lib/dashboard/study-resume";
import { isPlacementRetakeAllowed } from "@/lib/placement-cooldown";
import {
  computeStudentOnboardingCompletion,
  buildStudentOnboardingChecklist,
  summarizeStudentOnboardingProgress,
} from "@/lib/student-onboarding-next-links";
import { DashboardSpine } from "@/components/dashboard/dashboard-spine";
import { DashboardProfileSummary } from "@/components/dashboard/dashboard-profile-summary";
import { DashboardFlashcardStats } from "@/components/dashboard/dashboard-flashcard-stats";
import { DashboardStudyHighlight } from "@/components/dashboard/dashboard-study-highlight";
import { DashboardQuickReview } from "@/components/dashboard/dashboard-quick-review";
import { buttonClasses } from "@/components/ui/button";

/**
 * A student's dashboard: the shared spine, then their own sections.
 *
 * Was a branch inside `dashboard/page.tsx` that made seven sequential database
 * round trips — six chained `await`s and then a `Promise.all` — on the app's
 * busiest page. They are independent, so they now run together.
 */
export async function StudentDashboard({
  userId,
  onboardingHref,
  onboardingStep,
}: {
  userId: string;
  onboardingHref: string | null;
  onboardingStep: string | null;
}) {
  const t = await getTranslations("dashboard");
  const tCommon = await getTranslations("common");
  const th = await getTranslations("dashboard.highlights");
  const tOnboarding = await getTranslations("onboarding");

  const [
    profile,
    user,
    bookings,
    quick,
    overview,
    resume,
    googleSettings,
    bookingCount,
    threadCount,
    studiedLevel,
  ] = await Promise.all([
    // `select`, not a bare `findUnique`: this returned every column of the
    // student profile to render four of them.
    prisma.studentProfile.findUnique({
      where: { userId },
      select: {
        placedLevel: true,
        placedSubLevel: true,
        placementCompletedAt: true,
        shortBio: true,
        skippedOnboardingSteps: true,
      },
    }),
    prisma.user.findUnique({
      where: { id: userId },
      select: {
        name: true,
        email: true,
        image: true,
        studentProfile: { select: { shortBio: true } },
      },
    }),
    getStudentBookingsForDashboard(prisma, userId),
    getOrCreateQuickReviewCards(prisma, userId),
    getStudyTrackOverview(prisma, userId, "english-flashcards"),
    getStudyResumeInfo(prisma, userId),
    prisma.googleIntegrationSettings.findUnique({
      where: { userId },
      select: { calendarConnected: true, driveConnected: true },
    }),
    prisma.booking.count({ where: { studentId: userId } }),
    prisma.chatThread.count({ where: { studentId: userId } }),
    prisma.userStudyLevelProgress.findFirst({
      where: { userId, lastStudiedAt: { not: null } },
      select: { id: true },
    }),
  ]);

  const canStartPlacement = isPlacementRetakeAllowed(profile?.placementCompletedAt ?? null);

  const completion = computeStudentOnboardingCompletion(
    {
      profileShortBio: profile?.shortBio ?? null,
      userName: user?.name ?? null,
      userImage: user?.image ?? null,
      googleCalendarConnected: googleSettings?.calendarConnected ?? false,
      googleDriveConnected: googleSettings?.driveConnected ?? false,
      hasAnyBooking: bookingCount > 0,
      hasAnyChatThread: threadCount > 0,
      placementCompletedAt: profile?.placementCompletedAt ?? null,
      hasStudiedAny: Boolean(studiedLevel),
    },
    { skippedSteps: profile?.skippedOnboardingSteps ?? [] },
  );
  const progress = summarizeStudentOnboardingProgress(
    buildStudentOnboardingChecklist({ locale: "en", canStartPlacement, completion }),
  );
  const showResumeOnboarding =
    !onboardingHref && profile?.placedLevel === "UNSET" && progress.percent < 100;

  const nextBooking = bookings.upcoming[0];
  const placedLevel =
    profile == null
      ? null
      : profile.placedLevel === "UNSET"
        ? t("placedUnset")
        : `${t(`levelLabel.${profile.placedLevel}`)} ${t("subLevelShort", {
            subLevel: profile.placedSubLevel ?? 1,
          })}`;

  return (
    <DashboardSpine
      onboardingHref={onboardingHref}
      onboardingStep={onboardingStep}
      title={th("pageTitle")}
      description={th("pageIntro")}
      next={
        nextBooking
          ? {
              id: nextBooking.id,
              startsAt: nextBooking.startsAt,
              endsAt: nextBooking.endsAt,
              counterpartName:
                nextBooking.teacher.user.name ?? nextBooking.teacher.user.email ?? "—",
              lessonNameJa: nextBooking.lessonProduct.nameJa,
              lessonNameEn: nextBooking.lessonProduct.nameEn,
              status: nextBooking.status,
              meetUrl: nextBooking.meetUrl,
            }
          : null
      }
      nextEmptyMessage={th("noNextLesson")}
      nextEmptyAction={
        <Link href="/book" className={buttonClasses({ size: "lg" })}>
          {th("bookCta")}
        </Link>
      }
      /*
        A student's standing facts, the same three questions the teacher ledger
        answers. These numbers existed but were scattered across the study
        highlight, the flashcard stats and the quick review — never in one place
        you could check.
      */
      stats={[
        { label: th("statUpcoming"), value: bookings.upcoming.length },
        { label: th("statCompleted"), value: bookings.completed.length },
        {
          label: th("statRank"),
          value: overview?.rpg ? overview.rpg.rank : "—",
        },
      ]}
      profileSummary={
        <DashboardProfileSummary
          name={user?.name ?? null}
          email={user?.email ?? null}
          image={user?.image ?? null}
          shortBio={user?.studentProfile?.shortBio ?? null}
          rpg={overview?.rpg ?? null}
        />
      }
    >
      {showResumeOnboarding ? (
        <div className="flex flex-col gap-3 border-y border-border py-4 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-sm text-foreground">{tOnboarding("resumeHint")}</p>
          <Link href="/onboarding/next" className={buttonClasses({ variant: "secondary" })}>
            {tOnboarding("resumeChecklistCta")}
          </Link>
        </div>
      ) : null}

      {/* Was an AppCard — the page's last one. Level and the actions that follow
          from it are a row of facts, not a tray. */}
      {profile ? (
        <div className="flex flex-col gap-4 border-y border-border py-4 sm:flex-row sm:flex-wrap sm:items-center">
          <p className="min-w-0 flex-1 text-sm text-muted">
            {t("placedLevel")}: <span className="font-semibold text-foreground">{placedLevel}</span>
          </p>
          <div className="flex flex-wrap gap-2">
            <Link href="/book" className={buttonClasses()}>
              {tCommon("bookLesson")}
            </Link>
            <Link href="/dashboard/settings" className={buttonClasses({ variant: "secondary" })}>
              {tCommon("settings")}
            </Link>
            {canStartPlacement ? (
              <Link
                href="/placement"
                className={buttonClasses({
                  variant: profile.placedLevel === "UNSET" ? "secondary" : "ghost",
                })}
              >
                {profile.placedLevel === "UNSET" ? t("placementCta") : t("retakePlacement")}
              </Link>
            ) : null}
          </div>
        </div>
      ) : null}

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

      {bookings.scheduleItems.length > 0 ? (
        <p className="text-center text-sm text-muted">
          <Link href="/dashboard/schedule" className="text-link">
            {th("seeFullSchedule")}
          </Link>
        </p>
      ) : null}
    </DashboardSpine>
  );
}
