import { getLocale, getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { prisma } from "@/lib/prisma";
import { getStudentBookingsForDashboard } from "@/lib/dashboard/student-bookings";
import { getOrCreateQuickReviewCards } from "@/lib/study/quick-review";
import { getStudyTrackOverview } from "@/lib/study/get-overview";
import { DashboardJapaneseQuickReview } from "./dashboard-japanese-quick-review";
import { getJapaneseDashboardStudy } from "@/lib/dashboard/japanese-study";
import { isLoginAllowedForAccountStatus } from "@/lib/account-status";
import { getStudyResumeInfo } from "@/lib/dashboard/study-resume";
import { readStudentOnboardingState } from "@/lib/student-onboarding-state";
import {
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
import { LocalDateTime } from "@/components/local-datetime";
import { learningLanguageForRequest } from "@/lib/learning-site-request";

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
  learningLanguage?: LearningLanguage;
}) {
  // Current persisted intent is authoritative even if a session refresh lags.
  const user = await prisma.user.findUnique({ where: { id: userId }, select: {
    learningLanguage: true, role: true, accountStatus: true,
  } });
  if (!user || user.role !== "STUDENT" || !isLoginAllowedForAccountStatus(user.accountStatus)) return null;
  const learningLanguage = await learningLanguageForRequest(user.learningLanguage);
  const locale = await getLocale();
  const jp = await getTranslations("japanesePlacement");
  const studyJapanese = await getTranslations("japaneseStudy");
  const isEnglish = learningLanguage === "ENGLISH";
  const j = await getTranslations("learningJourney");
  const t = await getTranslations("dashboard");
  const tCommon = await getTranslations("common");
  const th = await getTranslations("dashboard.highlights");
  const tOnboarding = await getTranslations("onboarding");

  const [
    onboarding,
    bookings,
    quick,
    overview,
    resume,
    japanese,
  ] = await Promise.all([
    readStudentOnboardingState(prisma, userId, learningLanguage),
    getStudentBookingsForDashboard(prisma, userId),
    isEnglish ? getOrCreateQuickReviewCards(prisma, userId) : null,
    isEnglish ? getStudyTrackOverview(prisma, userId, "english-flashcards") : null,
    isEnglish ? getStudyResumeInfo(prisma, userId) : null,
    !isEnglish ? getJapaneseDashboardStudy(prisma, userId) : null,
  ]);

  const japaneseStudy = japanese?.available ? japanese : null;
  const studyOverview = isEnglish ? overview : japaneseStudy?.overview;
  const studyResume = isEnglish ? resume : japaneseStudy?.resume;
  const trackPractice = isEnglish ? overview?.trackPractice : japaneseStudy?.trackPractice;

  const { profile, canStartPlacement, completion, materialsAvailable, japanesePlacementResult } = onboarding;
  const japaneseEstimate = japanesePlacementResult?.levelEstimate;
  const progress = summarizeStudentOnboardingProgress(
    buildStudentOnboardingChecklist({ locale: "en", canStartPlacement, completion, learningLanguage, materialsAvailable }),
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
        ...(isEnglish || japaneseStudy ? [{
          label: th("statRank"),
          value: studyOverview?.rpg ? studyOverview.rpg.rank : "—",
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
        {japaneseEstimate?.status === "estimated" && japanesePlacementResult ? <div className="mt-4 space-y-1">
          <p className="text-sm text-muted">{jp("savedLevel")}: <span className="font-semibold text-foreground">{japaneseEstimate.band === "BELOW_N5" ? jp("belowN5") : japaneseEstimate.band}</span></p>
          <p className="text-sm text-muted">{jp("provisional")}</p>
          <p className="text-xs text-muted">{jp("completedAt")}: <LocalDateTime iso={japanesePlacementResult.completedAt} locale={locale} /></p>
        </div> : null}
        {!japaneseStudy ? <p className="mt-3 text-sm text-muted">{studyJapanese("unavailableTitle")}</p> : null}
        <div className="mt-4 flex flex-wrap gap-2">
          <Link href="/japanese-placement" className={buttonClasses({ variant: "secondary" })}>{jp(japanesePlacementResult ? "savedResult" : "open")}</Link>
          <Link href="/learn/study" className={buttonClasses({ variant: "secondary" })}>{studyJapanese("title")}</Link>
        </div>
      </section> : null}

      {studyOverview ? <DashboardStudyHighlight overview={studyOverview} resume={studyResume ?? null} learningLanguage={learningLanguage} /> : null}
      {trackPractice ? <DashboardFlashcardStats trackPractice={trackPractice} /> : null}
      {japaneseStudy ? <DashboardJapaneseQuickReview key={`${userId}:${japaneseStudy.quickReview.dayKey}`} initialStatus={japaneseStudy.quickReview} initialRpg={japaneseStudy.overview.rpg} /> : null}

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
