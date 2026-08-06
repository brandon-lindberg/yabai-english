/**
 * A measured bar.
 *
 * The XP bar was the only progress bar in the app, so the placement quiz — the
 * one screen where a learner most wants to know how much is left — said "3 / 24"
 * in small grey text and nothing else. Same need, so the same mark: the bar
 * lives here and both use it.
 *
 * `label` is required rather than optional: a bar with no accessible name is a
 * decoration, and this one is load-bearing.
 */
export function ProgressBar({
  percent,
  label,
  valueText,
  size = "md",
  className = "",
}: {
  percent: number;
  /** Accessible name, e.g. "Question 3 of 24". */
  label: string;
  /** Spoken value, when a bare percentage would be less useful than "3 of 24". */
  valueText?: string;
  size?: "md" | "sm";
  className?: string;
}) {
  const pct = Math.min(100, Math.max(0, percent));
  return (
    <div
      className={[
        "overflow-hidden rounded-full bg-foreground/10",
        size === "md" ? "h-3" : "h-2",
        className,
      ]
        .filter(Boolean)
        .join(" ")}
      role="progressbar"
      aria-label={label}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={Math.round(pct)}
      aria-valuetext={valueText ?? `${Math.round(pct)}%`}
    >
      <div
        /* `motion-reduce` matters here: this bar animates on every answer, which
           is exactly the repetitive movement 2.3.3 asks us to drop. */
        className="h-full rounded-full bg-foreground/80 transition-[width] duration-300 ease-out motion-reduce:transition-none"
        style={{ width: `${pct}%` }}
      />
    </div>
  );
}
