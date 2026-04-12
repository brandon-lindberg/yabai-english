type Props = {
  title: string;
  fractionLabel: string;
  nextHint: string;
  progressPercent: number;
  /** Default `card` is a bordered panel; `compact` nests inside another card. */
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
  const pct = Math.min(100, Math.max(0, progressPercent));
  const isCard = variant === "card";
  const rootClass = [isCard ? "rounded-2xl border border-border bg-surface p-4 shadow-sm" : "mt-3 space-y-2", className]
    .filter(Boolean)
    .join(" ");

  return (
    <section className={rootClass} aria-label={title}>
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        {isCard ? (
          <h2 className="text-sm font-semibold text-foreground">{title}</h2>
        ) : (
          <p className="text-xs font-semibold text-foreground">{title}</p>
        )}
        <span className="text-xs font-medium tabular-nums text-muted">{fractionLabel}</span>
      </div>
      <div
        className={`overflow-hidden rounded-full bg-foreground/10 ${isCard ? "mt-3 h-3" : "mt-1 h-2"}`}
        role="progressbar"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={Math.round(pct)}
        aria-valuetext={`${fractionLabel} (${Math.round(pct)}%)`}
      >
        <div
          className="h-full rounded-full bg-foreground/80 transition-[width] duration-300 ease-out"
          style={{ width: `${pct}%` }}
        />
      </div>
      <p className={`text-xs text-muted ${isCard ? "mt-2" : "mt-1"}`}>{nextHint}</p>
    </section>
  );
}
