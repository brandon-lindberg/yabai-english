import type { ReactNode } from "react";

/**
 * A ruled section — the default page container in this world.
 *
 * Replaces the bordered, shadowed card that was doing duty as the universal
 * page wrapper. Structure here comes from a rule and space,
 * not from a box, which is what stops a page reading as a tray of panels.
 *
 * Use a card (`AppCard`) only when something genuinely needs to sit *inside*
 * the page rather than on it. Never put a Section inside a card, or a card
 * inside a card — nested containers are the thing this exists to end.
 */

type Props = {
  /** Omit for an unlabelled ruled block. */
  title?: string;
  description?: string;
  /** Trailing controls on the heading line. */
  actions?: ReactNode;
  /**
   * Heading level for correct document outline. The visual size is set by
   * `size`, never by the level — that separation is what keeps semantics
   * honest without inviting an eyebrow.
   */
  as?: "h2" | "h3" | "h4";
  size?: "lg" | "md" | "sm";
  /** Drop the top rule when the section is first in a run. */
  ruled?: boolean;
  className?: string;
  children: ReactNode;
};

const titleSize = {
  lg: "text-2xl sm:text-3xl font-black tracking-[-0.03em]",
  md: "text-lg sm:text-xl font-bold tracking-[-0.02em]",
  sm: "text-base font-bold tracking-[-0.02em]",
} as const;

export function Section({
  title,
  description,
  actions,
  as: Heading = "h2",
  size = "md",
  ruled = true,
  className = "",
  children,
}: Props) {
  return (
    <section
      className={[ruled ? "border-t border-border pt-6" : "", className].filter(Boolean).join(" ")}
    >
      {title || actions ? (
        <div className="mb-4 flex flex-wrap items-baseline justify-between gap-x-4 gap-y-2">
          <div className="min-w-0">
            {title ? <Heading className={`${titleSize[size]} text-foreground`}>{title}</Heading> : null}
            {description ? (
              <p className="mt-1.5 max-w-[62ch] text-sm leading-relaxed text-muted">{description}</p>
            ) : null}
          </div>
          {actions ? <div className="flex shrink-0 flex-wrap gap-2">{actions}</div> : null}
        </div>
      ) : null}
      {children}
    </section>
  );
}
