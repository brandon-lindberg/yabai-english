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
 *
 * Columns wrap rather than compress. This started as a fixed `repeat(n, 1fr)`,
 * which was fine while every caller passed three stats; the org and school
 * overviews pass four and five, and at 390px those collided — `1238` printed
 * on top of `312`. Nothing reported it, because the text overflowed its cell
 * rather than the viewport. So the rules are a lattice now: every cell draws
 * its own top and left, and the grid is pulled a pixel up and left so the outer
 * duplicates clip against the frame. That holds for any count and any wrap.
 *
 * The column floor is set by the widest figure a cell must hold — a five-digit
 * member count at display scale — not by the number of stats. One consequence
 * is deliberate: a three-stat ledger now wraps to 2 + 1 on a phone rather than
 * squeezing three columns into 390px. Bigger figures with an orphan reads
 * better than three cramped ones, and it is the same rule for every caller.
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

export function StatLedger({
  stats,
  size = "lg",
  className = "",
  aside,
}: {
  stats: Stat[];
  /**
   * `lg` is the page-level ledger. `sm` is for secondary rollups that sit
   * inside a section and must not out-shout the page's own focal figure.
   */
  size?: "lg" | "sm";
  className?: string;
  aside?: ReactNode;
}) {
  const figure =
    size === "lg"
      ? "text-[clamp(2rem,5vw,3.25rem)] leading-none"
      : "text-[clamp(1.25rem,3vw,1.75rem)] leading-none";
  const pad = size === "lg" ? "py-6" : "py-4";
  /* Wide enough for a five-digit figure at display scale before it must wrap. */
  const columns = size === "lg"
    ? "grid-cols-[repeat(auto-fit,minmax(8rem,1fr))]"
    : "grid-cols-[repeat(auto-fit,minmax(6rem,1fr))]";
  const pairAsideOnMobile = Boolean(aside) && stats.length === 3;

  const cellClass = (interactive: boolean) =>
    [
      "group block border-l border-t border-border px-4 outline-none transition-colors sm:px-6",
      pad,
      interactive ? "hover:bg-[var(--app-hover)] focus-visible:bg-[var(--app-hover)]" : "",
    ]
      .filter(Boolean)
      .join(" ");

  const ledger = (
    <dl
      className={[
        "-ml-px -mt-px grid",
        columns,
        // Share both rows with the aside so the last two cells stay aligned.
        pairAsideOnMobile && "max-md:col-[1/span_2] max-md:row-[1/span_2] max-md:m-0 max-md:grid-cols-subgrid max-md:grid-rows-subgrid",
      ].filter(Boolean).join(" ")}
    >
      {stats.map((stat) => {
        const body = (
          <>
            <dd
              className={`${figure} font-black tracking-[-0.035em] tabular-nums text-foreground`}
            >
              {stat.value}
            </dd>
            <dt
              className={`mt-2 leading-snug text-muted ${size === "lg" ? "text-sm" : "text-xs"}`}
            >
              {stat.label}
            </dt>
          </>
        );

        return stat.render ? (
          <div key={stat.label} className="contents">
            {stat.render({ className: cellClass(true), children: body })}
          </div>
        ) : (
          <div key={stat.label} className={cellClass(false)}>
            {body}
          </div>
        );
      })}
    </dl>
  );

  return (
    <div className={["overflow-hidden border-y border-border", aside && "@container", className].filter(Boolean).join(" ")}>
      {aside ? (
        <div className={[
          "grid @3xl:grid-cols-[minmax(0,3fr)_minmax(18rem,1fr)]",
          pairAsideOnMobile && "max-md:-ml-px max-md:-mt-px max-md:grid-cols-2",
        ].filter(Boolean).join(" ")}>
          <div className={pairAsideOnMobile ? "overflow-hidden max-md:contents" : "overflow-hidden"}>{ledger}</div>
          <div className={[
            "border-t border-border px-4 py-4 sm:px-6 @3xl:border-l @3xl:border-t-0",
            pairAsideOnMobile && "max-md:col-start-2 max-md:row-start-2 max-md:border-l",
          ].filter(Boolean).join(" ")}>
            {aside}
          </div>
        </div>
      ) : ledger}
    </div>
  );
}
