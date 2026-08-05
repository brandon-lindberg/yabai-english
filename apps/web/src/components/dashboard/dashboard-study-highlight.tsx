import { getTranslations } from "next-intl/server";
import { getLocale } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { buttonClasses } from "@/components/ui/button";
import type { StudyResumeInfo } from "@/lib/dashboard/study-resume";
import type { getStudyTrackOverview } from "@/lib/study/get-overview";
import { StudyLastHint } from "@/components/dashboard/study-last-hint";

type Overview = NonNullable<Awaited<ReturnType<typeof getStudyTrackOverview>>>;

export async function DashboardStudyHighlight({
  overview,
  resume,
}: {
  overview: Overview;
  resume: StudyResumeInfo | null;
}) {
  const t = await getTranslations("dashboard.highlights");
  const locale = await getLocale();

  const focus = resume
    ? overview.levels.find((l) => l.levelCode === resume.levelCode) ?? null
    : overview.levels.find((l) => !l.locked) ?? null;

  return (
    <div className="border-t border-border pt-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <h2 className="text-lg font-semibold text-foreground">{t("studyTitle")}</h2>
        <Link href="/learn/study" className="text-sm font-medium text-link">
          {t("studyBrowse")}
        </Link>
      </div>
      <p className="mt-1 text-xs text-muted">
        {t("rpgLine", {
          rank: overview.rpg.rank,
          into: overview.rpg.xpIntoRank,
          total: overview.rpg.xpForNextRank,
        })}
      </p>

      {focus ? (
        <div className="mt-4 rounded-xl bg-foreground/5 px-3 py-3">
          <p className="text-xs font-medium text-muted">{t("studyResume")}</p>
          <p className="mt-1 text-sm font-semibold text-foreground">
            {locale === "ja" ? focus.titleJa : focus.titleEn}
          </p>
          <p className="mt-1 text-sm text-muted">
            {t("studyProgress", {
              touched: focus.cardsTouched,
              total: focus.cardsTotal,
            })}
          </p>
          {focus.locked ? (
            <p className="mt-2 text-xs text-muted">{t("studyLocked")}</p>
          ) : (
            <Link
              href={`/learn/study/${focus.levelCode}/practice`}
              className={`mt-3 ${buttonClasses({ size: "sm" })}`}
            >
              {t("studyOpen")}
            </Link>
          )}
          {resume ? (
            <StudyLastHint
              iso={resume.lastStudiedAt.toISOString()}
              locale={locale}
              className="mt-2 text-xs text-muted"
            />
          ) : null}
        </div>
      ) : (
        <p className="mt-4 text-sm text-muted">{t("studyNoActivity")}</p>
      )}
    </div>
  );
}
