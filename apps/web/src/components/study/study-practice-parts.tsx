import type { ReactNode } from "react";
import { useTranslations } from "next-intl";
import { ProgressBar } from "@/components/ui/progress-bar";
import type { QueuePreparationProgress } from "@/lib/study/queue-preparation";
import { StudyRpgXpBar } from "./study-rpg-xp-bar";
import type { StudyRpgSnapshot } from "@/lib/study/rpg-xp";
import type { JapaneseStudyFeedback } from "@/lib/study/japanese-public";

export function StudyPracticeLoading({ label, progress }: { label: string; progress?: QueuePreparationProgress | null }) {
  const percent = progress ? Math.floor(progress.completed / progress.total * 100) : undefined;
  return <div aria-busy="true" className="mx-auto flex min-h-80 w-full max-w-md flex-col justify-center gap-5 py-16" data-testid="study-practice-loading">
    <div className="flex items-baseline justify-between gap-4">
      <p role="status" className="text-lg font-semibold text-foreground">{label}</p>
      {percent != null ? <span aria-hidden="true" className="text-sm tabular-nums text-muted">{percent}%</span> : null}
    </div>
    <ProgressBar percent={percent} label={label} />
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

export function JapaneseStudyFeedbackDetails({ feedback, layout = "practice" }: {
  feedback: JapaneseStudyFeedback;
  layout?: "practice" | "recap" | "preview";
}) {
  const t = useTranslations("japaneseStudy");
  const practice = layout === "practice";
  const term = practice ? "text-muted" : "sr-only";
  const detail = practice ? "mt-1 text-foreground" : "text-foreground";
  return (
    <dl className={layout === "recap"
      ? "max-h-full w-full space-y-2 overflow-y-auto px-1 text-center text-sm leading-snug [overflow-wrap:anywhere]"
      : practice ? "space-y-3 text-sm" : "space-y-3 text-left text-base leading-snug [overflow-wrap:anywhere]"}>
      {feedback.reading ? <div>
        <dt className={term}>{t("reading")}</dt>
        <dd lang="ja" className={`${detail} ${practice ? "font-medium" : "font-semibold"}`}>{feedback.reading}</dd>
      </div> : null}
      <div>
        <dt className={term}>{t("meanings")}</dt>
        <dd lang="en" className={practice ? `${detail} leading-relaxed` : detail}>{feedback.meanings.join(practice ? "; " : ", ")}</dd>
      </div>
      {(["onyomi", "kunyomi", "nanori"] as const).map(category => {
        const readings = feedback[category];
        return readings?.length ? <div key={category} className={layout === "recap" ? "text-xs" : undefined}>
          <dt className={layout === "preview" ? "text-xs text-muted" : "text-muted"}>{t(category)}</dt>
          <dd lang="ja" className={practice ? `${detail} break-words leading-relaxed` : detail}>{readings.join(" · ")}</dd>
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
