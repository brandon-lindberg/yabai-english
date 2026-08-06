"use client";

import type { ReactNode } from "react";

/**
 * A ruled tab row — replaces the five duplicated "pills inside a bordered box"
 * sub-navs (dashboard, dashboard schedule, admin, org, school, settings).
 *
 * The pill-box version put a container around the navigation and a second
 * container (the active pill, with its own shadow) inside it, on every page.
 * Here the row is a single rule and the active tab is a heavier rule under the
 * label — the tab metaphor's own vocabulary, and one less box on every screen.
 *
 * Shell only: `SubNav` renders the row, `SubNavLink` renders a tab. Callers
 * keep their own typed `Link`, so route literals stay type-checked.
 */

/**
 * The tab's own look, shared by anything that switches between sibling views:
 * the six sub-navs and the calendars' day/week/month switcher.
 *
 * It lives here rather than inside `SubNavLink` because the calendar's tabs are
 * buttons, not links — same vocabulary, different semantics. Two copies of these
 * classes is how they would drift.
 */
export function tabClasses(active: boolean) {
  return [
    "-mb-px block whitespace-nowrap border-b-2 pb-3 pt-1 text-sm font-semibold transition-colors",
    active
      ? "border-foreground text-foreground"
      : "border-transparent text-muted hover:border-[var(--app-muted)] hover:text-foreground",
  ].join(" ");
}

export function SubNav({ label, children }: { label: string; children: ReactNode }) {
  return (
    <nav
      aria-label={label}
      /*
        The row wraps rather than scrolls. A single scrolling row clipped
        "Taxonomy" to "Taxonc" with no visible affordance, which reads as broken
        text rather than as something you can scroll — worse than the wrapping
        it replaced.

        The rule lives on the nav, not on the list, so it stays continuous no
        matter how many lines the tabs occupy. `min-w-0` keeps the row from
        leaking its max-content width up through the page's <main>, which
        previously forced the whole layout to 623px on a 390px phone.
      */
      className="mb-8 w-full min-w-0 border-b border-border"
    >
      <ul className="flex list-none flex-wrap gap-x-6 p-0">{children}</ul>
    </nav>
  );
}

/**
 * Render the caller's `Link` (or `a`) through `render`, so typed routes survive.
 * `aria-current="page"` marks the active tab — the pill version conveyed it by
 * background colour alone, which screen readers never received.
 */
export function SubNavLink({
  active,
  render,
}: {
  active: boolean;
  render: (props: {
    className: string;
    "aria-current": "page" | undefined;
  }) => ReactNode;
}) {
  return (
    <li>
      {render({
        className: tabClasses(active),
        "aria-current": active ? "page" : undefined,
      })}
    </li>
  );
}
