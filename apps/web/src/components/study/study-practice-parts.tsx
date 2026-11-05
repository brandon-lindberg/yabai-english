import type { ReactNode } from "react";
import { useTranslations } from "next-intl";
import { Skeleton } from "@/components/ui/skeleton";
import { StudyRpgXpBar } from "./study-rpg-xp-bar";
import type { StudyRpgSnapshot } from "@/lib/study/rpg-xp";
import type { JapaneseStudyFeedback } from "@/lib/study/japanese-public";

export function StudyPracticeLoading({ label }: { label: string }) {
  return <div role="status" aria-busy="true" aria-label={label} className="space-y-6" data-testid="study-practice-loading">
    <div className="border-y border-border py-4"><Skeleton height="4" width="1/2" /><div className="mt-3"><Skeleton height="3" width="full" rounded="full" /></div></div>
    <div className="flex justify-between gap-3"><Skeleton height="3" width="1/4" /><Skeleton height="3" width="1/3" /></div>
    <div className="rounded-2xl border border-border bg-surface p-4 sm:p-8"><Skeleton height="8" width="3/4" /><div className="mt-4"><Skeleton height="4" width="1/2" /></div></div>
    <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">{[0, 1, 2, 3].map(i => <div key={i} className="rounded-xl border border-border px-4 py-4"><Skeleton height="4" width="3/4" /></div>)}</div>
  </div>;
}

export function StudySessionProgress({ rpg, index, total, xp, correct, wrong, showRank = true, xpLabel }: {
  rpg: StudyRpgSnapshot; index: number; total: number; xp: number; correct: number; wrong: number; showRank?: boolean; xpLabel?: string;
}) {
  const t = useTranslations("study");
  return <>
    {showRank ? <StudyRankProgress rpg={rpg} /> : null}
    <div className="flex flex-wrap justify-between gap-2 text-sm text-muted">
      <span className="font-medium tabular-nums">{index + 1} / {total}</span>
      <span className="tabular-nums">{xpLabel ?? t("sessionXp", { xp })} · {t("sessionScore", { correct, wrong })}</span>
    </div>
  </>;
}

export function StudyPromptCard({ label, children }: { label: string; children: ReactNode }) {
  return <section aria-label={label} className="rounded-2xl border border-border bg-surface p-4 sm:p-8">{children}</section>;
}

export function JapaneseStudyFeedbackDetails({ feedback, compact = false }: { feedback: JapaneseStudyFeedback; compact?: boolean }) {
  const t = useTranslations("japaneseStudy");
  const term = compact ? "sr-only" : "text-muted";
  const detail = compact ? "text-foreground" : "mt-1 text-foreground";
  return (
    <dl className={compact
      ? "max-h-full w-full space-y-2 overflow-y-auto px-1 text-center text-sm leading-snug [overflow-wrap:anywhere]"
      : "space-y-3 text-sm"}>
      {feedback.reading ? <div>
        <dt className={term}>{t("reading")}</dt>
        <dd lang="ja" className={`${detail} ${compact ? "font-semibold" : "font-medium"}`}>{feedback.reading}</dd>
      </div> : null}
      <div>
        <dt className={term}>{t("meanings")}</dt>
        <dd lang="en" className={compact ? detail : `${detail} leading-relaxed`}>{feedback.meanings.join(compact ? ", " : "; ")}</dd>
      </div>
      {(["onyomi", "kunyomi", "nanori"] as const).map(category => {
        const readings = feedback[category];
        return readings?.length ? <div key={category} className={compact ? "text-xs" : undefined}>
          <dt className="text-muted">{t(category)}</dt>
          <dd lang="ja" className={compact ? detail : `${detail} break-words leading-relaxed`}>{readings.join(" · ")}</dd>
        </div> : null;
      })}
    </dl>
  );
}

export function StudyRankProgress({ rpg }: { rpg: StudyRpgSnapshot }) {
  const t = useTranslations("study");
  return <StudyRpgXpBar title={t("rpgRankTitle", { rank: rpg.rank })} fractionLabel={t("rpgXpLine", { into: rpg.xpIntoRank, total: rpg.xpForNextRank })}
      nextHint={t("rpgNextHint", { remaining: Math.max(0, rpg.xpForNextRank - rpg.xpIntoRank), nextRank: rpg.rank + 1 })} progressPercent={rpg.progressPercent} />;
}
