"use client";

import { useRef, useState, type ReactNode } from "react";
import {
  TeacherAvailabilityPreview,
  type PreviewDay,
} from "@/components/teacher-availability-preview";

/**
 * The browse list, with an availability panel that follows whichever teacher
 * you are looking at.
 *
 * The list keeps its rules and its right-hand price column — the whole reason
 * it stopped being a card grid, since prices in a column are what let you
 * compare teachers at all. What the competitor's card layout does better is
 * *content*, and the most useful of that is when the teacher is free. So the
 * schedule goes beside the list rather than inside each row, where a 7×6 grid
 * would swamp the row and break the column.
 *
 * "Looking at" is hover **and** focus. Hover alone would put this behind a
 * mouse, which is no use on a phone and unreachable from a keyboard.
 *
 * The rows stay server-rendered: they are passed in as children and found by
 * `data-row-id`, so nothing about a teacher's details has to cross the client
 * boundary — only the small grid of booleans this panel draws.
 */

export type TeacherPreview = {
  days: PreviewDay[];
  grid: boolean[][];
  profileHref: string;
};

export function TeacherBrowseList({
  previews,
  timeZone,
  children,
}: {
  previews: Record<string, TeacherPreview>;
  timeZone: string;
  children: ReactNode;
}) {
  /*
    Nothing until a teacher is picked out. A panel that is always there,
    quietly changing, reads as part of the furniture rather than as an answer
    about the row under the pointer.
  */
  const [activeId, setActiveId] = useState<string | null>(null);
  /*
    How far down to push the panel so it sits level with the row it describes.
    It used to pin to the top of the viewport, which put the answer beside the
    first teacher no matter which one you were pointing at.
  */
  const [alignTop, setAlignTop] = useState(0);
  /*
    Slide between rows, but arrive instantly.

    The offset starts at zero, so animating the *first* appearance sent the
    panel travelling down from the top of the list past every row to reach the
    pointer — and it could be caught anywhere along the way. Moving from one
    row to another is worth animating: it ties the panel to the row you moved
    to. Arriving is not a move.
  */
  const [sliding, setSliding] = useState(false);
  const regionRef = useRef<HTMLDivElement>(null);

  function trackFrom(target: EventTarget | null) {
    if (!(target instanceof Element)) return;
    const row = target.closest("[data-row-id]");
    const id = row?.getAttribute("data-row-id");
    if (!id || !previews[id]) return;
    setSliding(activeId !== null);
    setActiveId(id);
    const region = regionRef.current;
    if (region) {
      setAlignTop(Math.max(0, row!.getBoundingClientRect().top - region.getBoundingClientRect().top));
    }
  }

  const active = activeId ? previews[activeId] : null;

  return (
    /*
      The pointer has to be able to leave the rows and reach the panel — that
      is the only way to click "View full schedule". So the region that counts
      as "still looking at a teacher" is both columns, not just the list.
    */
    <div
      ref={regionRef}
      data-testid="browse-region"
      className="flex flex-col gap-8 lg:flex-row lg:items-start"
      onMouseLeave={() => setActiveId(null)}
      onBlur={(e) => {
        // Only when focus has actually left the region — otherwise tabbing from
        // one row to the next would flicker the panel off and on.
        if (!e.currentTarget.contains(e.relatedTarget as Node | null)) setActiveId(null);
      }}
    >
      {/* Delegated rather than per-row handlers, so the rows themselves stay
          server components with no props to thread through. */}
      <div
        data-testid="teacher-rows"
        className="min-w-0 flex-1"
        onMouseOver={(e) => trackFrom(e.target)}
        onFocus={(e) => trackFrom(e.target)}
      >
        <ul className="list-none border-t border-border p-0">{children}</ul>
      </div>

      {/*
        The column keeps its width whether or not anything is in it. The panel
        comes and goes with the pointer, and if it took the width with it every
        row would reflow underneath the cursor that summoned it.
      */}
      <div
        data-testid="availability-column"
        style={{ paddingTop: alignTop }}
        className={`hidden w-72 shrink-0 lg:block ${
          sliding ? "transition-[padding] duration-150 ease-out" : ""
        }`}
      >
        {active ? (
          <aside
            data-testid="availability-panel"
            /*
              It changes as the pointer crosses the list. Announcing every change
              would make the list unusable with a screen reader, so it is
              supplementary and the row stays the thing being read.
            */
            aria-live="off"
            className="border-t border-border pt-4"
          >
            <TeacherAvailabilityPreview
              days={active.days}
              grid={active.grid}
              timeZone={timeZone}
              profileHref={active.profileHref}
            />
          </aside>
        ) : null}
      </div>
    </div>
  );
}
