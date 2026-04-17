import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { StudyRpgXpBar } from "@/components/study/study-rpg-xp-bar";
import { getStudyTrackOverview } from "@/lib/study/get-overview";
import { Link } from "@/i18n/navigation";
import { getLocale, getTranslations } from "next-intl/server";
import { notFound } from "next/navigation";
import { normalizeOnboardingNextHref } from "@/lib/teacher-onboarding-progress";
import { OnboardingResumeBanner } from "@/components/onboarding-resume-banner";

const TRACK_SLUG = "english-flashcards";

export default async function StudyHubPage({
  searchParams,
}: {
  searchParams: Promise<{ onboardingNext?: string; onboardingStep?: string }>;
}) {
  const session = await auth();
  if (!session?.user?.id) {
    notFound();
  }

  const overview = await getStudyTrackOverview(prisma, session.user.id, TRACK_SLUG);
  if (!overview) {
    notFound();
  }

  const t = await getTranslations("study");
  const locale = await getLocale();
  const { onboardingNext, onboardingStep } = await searchParams;
  const onboardingHref = normalizeOnboardingNextHref(onboardingNext ?? null);

  return (
    <main className="mx-auto max-w-3xl flex-1 px-4 py-10 sm:px-6">
      <OnboardingResumeBanner href={onboardingHref} step={onboardingStep ?? null} />
      <p className="text-sm text-muted">
        <Link href="/dashboard" className="font-medium text-link hover:opacity-90">
          {t("backToDashboard")}
        </Link>
      </p>
      <h1 className="mt-4 text-2xl font-semibold tracking-tight text-foreground">{t("title")}</h1>
      <p className="mt-2 text-muted">{t("subtitle")}</p>

      <div className="mt-6">
        <StudyRpgXpBar
          title={t("rpgRankTitle", { rank: overview.rpg.rank })}
          fractionLabel={t("rpgXpLine", {
            into: overview.rpg.xpIntoRank,
            total: overview.rpg.xpForNextRank,
          })}
          nextHint={t("rpgNextHint", {
            remaining: Math.max(0, overview.rpg.xpForNextRank - overview.rpg.xpIntoRank),
            nextRank: overview.rpg.rank + 1,
          })}
          progressPercent={overview.rpg.progressPercent}
        />
      </div>

      <section className="mt-8 space-y-4">
        {overview.levels.map((level) => {
          const title = locale === "ja" ? level.titleJa : level.titleEn;
          return (
            <article
              key={level.id}
              className="rounded-2xl border border-border bg-surface p-5 shadow-sm"
            >
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <h2 className="text-lg font-semibold text-foreground">{title}</h2>
                </div>
                <div className="flex flex-wrap gap-2">
                  {level.assessmentPassedAt ? (
                    <span className="rounded-full bg-green-500/15 px-2 py-0.5 text-xs font-medium text-green-700 dark:text-green-400">
                      {t("passed")}
                    </span>
                  ) : null}
                  {level.locked ? (
                    <span className="rounded-full bg-muted/30 px-2 py-0.5 text-xs font-medium text-muted">
                      {t("locked")}
                    </span>
                  ) : null}
                </div>
              </div>

              <div className="mt-4 grid grid-cols-3 gap-3 text-center text-sm">
                <div className="rounded-xl bg-foreground/5 px-2 py-2">
                  <p className="text-xs text-muted">{t("mastery")}</p>
                  <p className="font-semibold text-foreground">{level.masteryScore}%</p>
                </div>
                <div className="rounded-xl bg-foreground/5 px-2 py-2">
                  <p className="text-xs text-muted">{t("xp")}</p>
                  <p className="font-semibold text-foreground">{level.xp}</p>
                </div>
                <div className="rounded-xl bg-foreground/5 px-2 py-2">
                  <p className="text-xs text-muted">{t("cards")}</p>
                  <p className="font-semibold text-foreground">
                    {level.cardsTouched}/{level.cardsTotal}
                  </p>
                </div>
              </div>

              <div className="mt-4 flex flex-wrap gap-3">
                {level.locked ? (
                  <span className="text-sm text-muted">{t("locked")}</span>
                ) : (
                  <>
                    <Link
                      href={`/learn/study/${level.levelCode}/practice`}
                      className="rounded-xl bg-foreground px-4 py-2 text-sm font-medium text-background"
                    >
                      {t("practice")}
                    </Link>
                    {level.practice.weakCount > 0 ? (
                      <Link
                        href={`/learn/study/${level.levelCode}/practice?focus=weak`}
                        className="rounded-xl border border-amber-500/40 bg-amber-500/10 px-4 py-2 text-sm font-medium text-foreground"
                      >
                        {t("practiceWeak")} ({level.practice.weakCount})
                      </Link>
                    ) : null}
                    {level.practice.masteredCount > 0 ? (
                      <Link
                        href={`/learn/study/${level.levelCode}/practice?focus=mastered`}
                        className="rounded-xl border border-green-600/30 bg-green-500/10 px-4 py-2 text-sm font-medium text-foreground"
                      >
                        {t("practiceMastered")} ({level.practice.masteredCount})
                      </Link>
                    ) : null}
                    {level.exitAssessmentId ? (
                      <Link
                        href={`/learn/study/${level.levelCode}/assessment`}
                        className="rounded-xl border border-border px-4 py-2 text-sm font-medium text-foreground"
                      >
                        {t("levelTest")}
                      </Link>
                    ) : null}
                  </>
                )}
              </div>
            </article>
          );
        })}
      </section>

      <p className="mt-10">
        <Link href="/dashboard" className="text-link text-sm">
          ← {t("backToDashboard")}
        </Link>
      </p>
    </main>
  );
}
