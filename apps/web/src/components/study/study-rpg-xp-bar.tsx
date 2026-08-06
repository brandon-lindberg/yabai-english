import { ProgressBar } from "@/components/ui/progress-bar";

type Props = {
  title: string;
  fractionLabel: string;
  nextHint: string;
  progressPercent: number;
  /** `compact` sits inside another block and drops the top rule. */
  variant?: "card" | "compact";
  className?: string;
};

export function StudyRpgXpBar({
  title,
  fractionLabel,
  nextHint,
  progressPercent,
  variant = "card",
  className,
}: Props) {
  const isCard = variant === "card";
  // Was a bordered card; it is one line of status about the learner, not a
  // panel, so it reads as a ruled block like everything else on the page.
  const rootClass = [isCard ? "border-y border-border py-4" : "mt-3 space-y-2", className]
    .filter(Boolean)
    .join(" ");

  return (
    <section className={rootClass} aria-label={title}>
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        {isCard ? (
          <h2 className="text-sm font-bold tracking-[-0.01em] text-foreground">{title}</h2>
        ) : (
          <p className="text-xs font-semibold text-foreground">{title}</p>
        )}
        <span className="text-xs font-medium tabular-nums text-muted">{fractionLabel}</span>
      </div>
      <ProgressBar
        percent={progressPercent}
        label={title}
        valueText={`${fractionLabel} (${Math.round(progressPercent)}%)`}
        size={isCard ? "md" : "sm"}
        className={isCard ? "mt-3" : "mt-1"}
      />
      <p className={`text-xs text-muted ${isCard ? "mt-2" : "mt-1"}`}>{nextHint}</p>
    </section>
  );
}
