import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { buttonClasses } from "@/components/ui/button";
import { Status } from "@/components/ui/status";

export type StudyLevelView = {
  id: string; code: string; title: string; locked: boolean; completed: boolean;
  masteryScore: number; xp: number; cardsTouched: number; cardsTotal: number;
  weakCount: number; masteredCount: number; exitAssessmentId?: string | null;
};

/** One level list for both subjects; the caller supplies subject-specific access and mastery. */
export function StudyLevelList({ levels, language }: { levels: StudyLevelView[]; language: "ENGLISH" | "JAPANESE" }) {
  const t = useTranslations("study");
  const jp = useTranslations("japaneseStudy");
  return <section className="mt-8 border-t border-border">
    {levels.map(level => {
      const href = `/learn/study/${level.code}/practice`;
      return <article key={level.id} className="border-b border-border py-6" aria-labelledby={`level-${level.id}`}>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 id={`level-${level.id}`} className="text-lg font-semibold text-foreground">{level.title}</h2>
          {level.locked ? <Status tone="open">{t("locked")}</Status> : level.completed ? <Status tone="settled">{language === "JAPANESE" ? jp("completed") : t("passed")}</Status> : null}
        </div>
        <dl className="mt-4 flex flex-wrap gap-x-8 gap-y-3 text-sm">
          {[
            [t("mastery"), `${level.masteryScore}%`], [t("xp"), level.xp],
            [language === "JAPANESE" ? jp("cardsStudied") : t("cards"), `${level.cardsTouched} / ${level.cardsTotal}`],
          ].map(([label, value]) => <div key={label}>
            <dt className="text-xs text-muted">{label}</dt><dd className="mt-1 font-semibold tabular-nums text-foreground">{value}</dd>
          </div>)}
        </dl>
        {level.locked ? <p className="mt-4 text-sm text-muted">{language === "JAPANESE" ? jp("lockedHelp") : t("locked")}</p> : <div className="mt-5 flex flex-wrap gap-2">
          <Link href={href} className={buttonClasses()}>{t("practice")}</Link>
          {language === "JAPANESE" ? <>{(["vocabulary", "kanji"] as const).map(kind => <Link key={kind} href={`${href}?kind=${kind}`} className={buttonClasses({ variant: "secondary" })}>{jp(kind)}</Link>)}</> : null}
          {(["weak", "mastered"] as const).map(focus => {
            const count = focus === "weak" ? level.weakCount : level.masteredCount;
            return count > 0 ? <Link key={focus} href={`${href}?focus=${focus}`} className={buttonClasses({ variant: "secondary" })}>{t(focus === "weak" ? "practiceWeak" : "practiceMastered")} ({count})</Link> : null;
          })}
          {language === "ENGLISH" && level.exitAssessmentId ? <Link href={`/learn/study/${level.code}/assessment`} className={buttonClasses({ variant: "secondary" })}>{t("levelTest")}</Link> : null}
        </div>}
      </article>;
    })}
  </section>;
}
