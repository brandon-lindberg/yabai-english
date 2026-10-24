import { prisma } from "@/lib/prisma";
import { StudyRankProgress } from "@/components/study/study-practice-parts";
import { StudyLevelList, type StudyLevelView } from "@/components/study/study-level-list";
import { JapaneseStudyUnavailable } from "@/components/study/japanese-study-unavailable";
import { requireStudyPageActor, japaneseStudyOverviewForPage } from "@/lib/study/page-access";
import { studyRpgProgressFromTotalXp } from "@/lib/study/rpg-xp";
import { getStudyTrackOverview } from "@/lib/study/get-overview";
import { Link } from "@/i18n/navigation";
import { getLocale, getTranslations } from "next-intl/server";
import { notFound } from "next/navigation";
import { normalizeOnboardingNextHref } from "@/lib/teacher-onboarding-progress";
import { OnboardingResumeBanner } from "@/components/onboarding-resume-banner";
import { actionLinkClass } from "@/components/ui/inline-link";
import { PageHeader } from "@/components/ui/page-header";

const TRACK_SLUG = "english-flashcards";

export default async function StudyHubPage({
  searchParams,
}: {
  searchParams: Promise<{ onboardingNext?: string; onboardingStep?: string }>;
}) {
  const actor = await requireStudyPageActor();
  const isJapanese = actor.learningLanguage === "JAPANESE";
  const locale = await getLocale();
  let levels: StudyLevelView[] = [];
  let rpg = studyRpgProgressFromTotalXp(0);
  let unavailable = false;
  if (isJapanese) {
    const overview = await japaneseStudyOverviewForPage(actor.id);
    unavailable = !overview;
    if (overview) {
      rpg = studyRpgProgressFromTotalXp(overview.levels.reduce((sum, level) => sum + level.xp, 0));
      levels = overview.levels.map(level => ({
        id: level.id, code: level.code, title: level.code, locked: !level.unlocked,
        completed: overview.completed.includes(level.code as "N5" | "N4" | "N3" | "N2" | "N1"),
        masteryScore: level.mastery.total ? Math.round(level.mastery.mastered / level.mastery.total * 100) : 0,
        xp: level.xp, cardsTotal: level.mastery.total, cardsTouched: level.mastery.total - level.practice.newCount,
        weakCount: level.practice.weakCount, masteredCount: level.practice.masteredCount,
      }));
    }
  } else {
    const overview = await getStudyTrackOverview(prisma, actor.id, TRACK_SLUG);
    if (!overview) notFound();
    rpg = overview.rpg;
    levels = overview.levels.map(level => ({
      id: level.id, code: level.levelCode, title: locale === "ja" ? level.titleJa : level.titleEn,
      locked: level.locked, completed: !!level.assessmentPassedAt, masteryScore: level.masteryScore, xp: level.xp,
      cardsTotal: level.cardsTotal, cardsTouched: level.cardsTouched, weakCount: level.practice.weakCount,
      masteredCount: level.practice.masteredCount, exitAssessmentId: level.exitAssessmentId,
    }));
  }

  const t = await getTranslations("study");
  const jp = await getTranslations("japaneseStudy");
  const { onboardingNext, onboardingStep } = await searchParams;
  const onboardingHref = normalizeOnboardingNextHref(onboardingNext ?? null);

  return (
    <main className="mx-auto max-w-3xl flex-1 px-4 py-10 sm:px-6">
      <OnboardingResumeBanner href={onboardingHref} step={onboardingStep ?? null} />
      <p className="text-sm text-muted">
        <Link href="/dashboard" className={actionLinkClass}>
          {t("backToDashboard")}
        </Link>
      </p>
      <div className="mt-4">
        <PageHeader title={isJapanese ? jp("title") : t("title")} description={isJapanese ? jp(unavailable ? "unavailableIntro" : "subtitle") : t("subtitle")} />
      </div>

      {unavailable ? <div data-state="unavailable"><JapaneseStudyUnavailable /></div> : <>
        <div className="mt-6"><StudyRankProgress rpg={rpg} /></div>
        <StudyLevelList language={actor.learningLanguage} levels={levels} />
      </>}

      <p className="mt-10">
        <Link href="/dashboard" className={`${actionLinkClass} text-sm`}>
          ← {t("backToDashboard")}
        </Link>
      </p>
    </main>
  );
}
