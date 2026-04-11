type Props = {
  title: string;
  fractionLabel: string;
  nextHint: string;
  progressPercent: number;
};

export function StudyRpgXpBar({ title, fractionLabel, nextHint, progressPercent }: Props) {
  const pct = Math.min(100, Math.max(0, progressPercent));

  return (
    <section
      className="rounded-2xl border border-border bg-surface p-4 shadow-sm"
      aria-label={title}
    >
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h2 className="text-sm font-semibold text-foreground">{title}</h2>
        <span className="text-xs font-medium tabular-nums text-muted">{fractionLabel}</span>
      </div>
      <div
        className="mt-3 h-3 overflow-hidden rounded-full bg-foreground/10"
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
      <p className="mt-2 text-xs text-muted">{nextHint}</p>
    </section>
  );
}
