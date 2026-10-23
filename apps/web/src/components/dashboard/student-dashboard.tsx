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
import { DashboardFlashcardStats } from "@/components/dashboard/dashboard-flashcard-stats";
import { DashboardStudyHighlight } from "@/components/dashboard/dashboard-study-highlight";
import { DashboardQuickReview } from "@/components/dashboard/dashboard-quick-review";
import { buttonClasses } from "@/components/ui/button";
import { resolveBookingDisplayStatus } from "@/lib/booking-status";
import type { LearningLanguage } from "@/generated/prisma/enums";
import { LEARNING_JOURNEYS } from "@/lib/learning-journey";
import { lessonProductNames } from "@/lib/lesson-product-catalog";

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
  learningLanguage = "ENGLISH",
}: {
  userId: string;
  onboardingHref: string | null;
  onboardingStep: string | null;
  learningLanguage?: LearningLanguage;
}) {
  const jp = await getTranslations("japanesePlacement");
  const isEnglish = learningLanguage === "ENGLISH";
  const j = await getTranslations("learningJourney");
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
    isEnglish ? getOrCreateQuickReviewCards(prisma, userId) : null,
    isEnglish ? getStudyTrackOverview(prisma, userId, "english-flashcards") : null,
    isEnglish ? getStudyResumeInfo(prisma, userId) : null,
    prisma.googleIntegrationSettings.findUnique({
      where: { userId },
      select: { calendarConnected: true, driveConnected: true },
    }),
    prisma.booking.count({ where: { studentId: userId } }),
    prisma.chatThread.count({ where: { studentId: userId } }),
    isEnglish ? prisma.userStudyLevelProgress.findFirst({
      where: { userId, lastStudiedAt: { not: null } },
      select: { id: true },
    }) : null,
  ]);

  const canStartPlacement = isEnglish && isPlacementRetakeAllowed(profile?.placementCompletedAt ?? null);

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
    buildStudentOnboardingChecklist({ locale: "en", canStartPlacement, completion, learningLanguage }),
  );
  const showResumeOnboarding =
    !onboardingHref && (!isEnglish || profile?.placedLevel === "UNSET") && progress.percent < 100;

  const nextBooking = bookings.upcoming[0];
  const placedLevel =
    profile == null || !isEnglish
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
      title={j(`${LEARNING_JOURNEYS[learningLanguage].key}.dashboard`)}
      description={th("pageIntro")}
      next={
        nextBooking
          ? {
              id: nextBooking.id,
              learningLanguage: nextBooking.learningLanguage,
              startsAt: nextBooking.startsAt,
              endsAt: nextBooking.endsAt,
              counterpartName:
                nextBooking.teacher.user.name ?? nextBooking.teacher.user.email ?? "—",
              lessonNameJa: lessonProductNames(nextBooking.lessonProduct, nextBooking.learningLanguage).nameJa,
              lessonNameEn: lessonProductNames(nextBooking.lessonProduct, nextBooking.learningLanguage).nameEn,
              status: resolveBookingDisplayStatus(nextBooking),
              meetUrl: nextBooking.meetUrl,
              holdExpiresAt: nextBooking.holdExpiresAt ?? null,
            }
          : null
      }
      canCompletePayment
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
        ...(isEnglish ? [{
          label: th("statRank"),
          value: overview?.rpg ? overview.rpg.rank : "—",
        }] : []),
      ]}
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
      {profile && isEnglish ? (
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

      {!isEnglish ? <section className="border-y border-border py-6">
        <h2 className="text-base font-semibold text-foreground">{jp("title")}</h2>
        <p className="mt-2 text-sm leading-relaxed text-muted">{jp("entry")}</p>
        <Link href="/japanese-placement" className={buttonClasses({ variant: "secondary", className: "mt-4" })}>{jp("open")}</Link>
      </section> : null}

      {overview ? <DashboardStudyHighlight overview={overview} resume={resume} /> : null}
      {overview ? <DashboardFlashcardStats trackPractice={overview.trackPractice} /> : null}

      {/* No wrapping <section>: this brings its own, and renders nothing when
          there is nothing to review — an empty wrapper would still take a gap
          from the spine's `space-y-10`. */}
      {quick ? <DashboardQuickReview
        initialCards={quick.cards}
        dayKey={quick.dayKey}
        initialLearnedToday={quick.learnedToday}
        initialNotYetToday={quick.notYetToday}
      /> : null}
    </DashboardSpine>
  );
}
