import type { ReactNode } from "react";

/**
 * The end of a run.
 *
 * Five surfaces had built their own version of "there is nothing more to do
 * here, this is what happened, here is where to go": the practice session's
 * finish panel and its empty queue, the assessment result, the placement result
 * and the placement cooldown. Each was a bordered card with a title, a couple
 * of lines and a button, and each had picked its own padding and radius.
 *
 * `figure` is the reason this is not just a paragraph: when a run ends on a
 * number — the XP earned, the score — that number is the whole point of the
 * screen, so it lands at display scale with its label beneath. Same rule as
 * `StatLedger`, and the same reason: a figure carries itself.
 */

export function Outcome({
  title,
  description,
  figure,
  figureLabel,
  actions,
  children,
}: {
  title: string;
  description?: string | null;
  /** The number the run ended on. Rendered at display scale. */
  figure?: string | number | null;
  figureLabel?: string | null;
  actions?: ReactNode;
  /** Anything the outcome needs beyond a line of prose — a score breakdown, a notice. */
  children?: ReactNode;
}) {
  return (
    <div className="border-y border-border py-10 text-center">
      <p className="text-base font-bold tracking-[-0.02em] text-foreground">{title}</p>
      {figure != null ? (
        <p className="mt-4">
          <span className="block text-[clamp(2.5rem,8vw,4rem)] font-black leading-none tracking-[-0.04em] tabular-nums text-foreground">
            {figure}
          </span>
          {figureLabel ? <span className="mt-2 block text-sm text-muted">{figureLabel}</span> : null}
        </p>
      ) : null}
      {description ? (
        <p className="mx-auto mt-3 max-w-[52ch] text-sm leading-relaxed text-muted">{description}</p>
      ) : null}
      {children ? <div className="mt-6 text-left">{children}</div> : null}
      {actions ? <div className="mt-8 flex flex-wrap justify-center gap-3">{actions}</div> : null}
    </div>
  );
}
