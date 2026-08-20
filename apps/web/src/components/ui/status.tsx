import type { ReactNode } from "react";

/**
 * Status as a value-and-density ladder rather than a colour scale.
 *
 * This is the load-bearing idea of the world. A lesson's life — offered,
 * awaiting confirmation, confirmed, finished, cancelled — maps onto how far the
 * type has condensed out of weather:
 *
 *   open     mist, dashed        a slot that exists but holds nothing yet
 *   pending  silver, half-filled mid-transformation, not settled
 *   settled  solid ink           condensed, confirmed, real
 *   spent    rain, hollow        past or cancelled; grammar already spent
 *
 * Two consequences worth keeping:
 *
 * 1. It inverts cleanly between themes, because it is built from values rather
 *    than hues, so there is no per-state dark-mode variant to forget.
 * 2. Nothing is encoded by colour alone. Each state carries a distinct mark
 *    shape and a text label as well, which is what WCAG 1.4.1 actually asks
 *    for — the previous colour-only chips did not satisfy it.
 *
 * `warn` and `amber` are the only hued states, reserved for attention and
 * failure. They are deliberately outside the ladder so they read as
 * interruptions to it.
 */

type Tone = "open" | "pending" | "settled" | "spent" | "warn" | "error";

/*
  These marks carry state, so they are user-interface information and fall under
  WCAG 1.4.11 — 3:1 against the surface behind them. The world's decorative
  silver is 1.53:1 on paper and rain is 3.00:1, so neither can be trusted here;
  the marks use --app-muted instead (5.14:1 light, 7.42:1 dark).

  The value ladder still reads, because the step that matters is muted → ink:
  outlined, then half-filled, then solid.
*/
const markClass: Record<Tone, string> = {
  open: "border border-dashed border-[var(--app-muted)] bg-transparent",
  pending:
    "border border-[var(--app-muted)] bg-[linear-gradient(90deg,var(--app-muted)_50%,transparent_50%)]",
  settled: "bg-foreground",
  spent: "border border-[var(--app-muted)] bg-transparent",
  warn: "bg-[var(--app-warn-text)]",
  error: "bg-[var(--app-danger)]",
};

const labelClass: Record<Tone, string> = {
  open: "text-muted",
  pending: "text-muted",
  settled: "text-foreground",
  spent: "text-muted line-through decoration-[var(--storm-rain)]",
  warn: "text-[var(--app-warn-text)]",
  error: "text-[var(--app-danger)]",
};

export function StatusMark({ tone, className = "" }: { tone: Tone; className?: string }) {
  return (
    <span
      aria-hidden="true"
      className={["inline-block h-2.5 w-2.5 shrink-0 rounded-[1px]", markClass[tone], className]
        .filter(Boolean)
        .join(" ")}
    />
  );
}

export function Status({
  tone,
  children,
  className = "",
}: {
  tone: Tone;
  children: ReactNode;
  className?: string;
}) {
  return (
    <span
      className={[
        "inline-flex items-center gap-1.5 text-xs font-medium tracking-[-0.01em]",
        labelClass[tone],
        className,
      ]
        .filter(Boolean)
        .join(" ")}
    >
      <StatusMark tone={tone} />
      {children}
    </span>
  );
}

export type { Tone as StatusTone };
