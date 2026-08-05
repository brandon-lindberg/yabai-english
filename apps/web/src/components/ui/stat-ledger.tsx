import type { ReactNode } from "react";

/**
 * A ruled row of figures — replaces the hero-metric card grid.
 *
 * The card version was the template the craft floor refuses outright: equal
 * boxes, each with a small uppercase tracked label sitting *above* its number.
 * That label is an eyebrow by definition, and three of them compete for the
 * same attention instead of reading as one line of counts.
 *
 * Here the figure carries its own weight at display scale and the label reads
 * beneath it, so the row scans left-to-right as a ledger. Figures are tabular
 * so the columns hold still as the numbers change.
 */

export type Stat = {
  label: string;
  value: number | string;
  /**
   * Optional wrapper so a stat can be a link without this component needing to
   * know about typed routes. Receives the classes the cell needs.
   */
  render?: (props: { className: string; children: ReactNode }) => ReactNode;
};

export function StatLedger({ stats, className = "" }: { stats: Stat[]; className?: string }) {
  return (
    <dl
      className={["grid border-y border-border", className].filter(Boolean).join(" ")}
      style={{ gridTemplateColumns: `repeat(${stats.length}, minmax(0, 1fr))` }}
    >
      {stats.map((stat, i) => {
        const cellClass = [
          "group block py-6 outline-none transition-colors",
          i > 0 ? "border-l border-border pl-4 sm:pl-6" : "pr-4",
          stat.render ? "hover:bg-[var(--app-hover)] focus-visible:bg-[var(--app-hover)]" : "",
        ]
          .filter(Boolean)
          .join(" ");

        const body = (
          <>
            <dd className="text-[clamp(2rem,5vw,3.25rem)] font-black leading-none tracking-[-0.035em] tabular-nums text-foreground">
              {stat.value}
            </dd>
            <dt className="mt-2 text-sm leading-snug text-muted">{stat.label}</dt>
          </>
        );

        return stat.render ? (
          <div key={stat.label} className="contents">
            {stat.render({ className: cellClass, children: body })}
          </div>
        ) : (
          <div key={stat.label} className={cellClass}>
            {body}
          </div>
        );
      })}
    </dl>
  );
}
