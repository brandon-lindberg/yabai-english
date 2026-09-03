/**
 * The one vocabulary for how a time slot looks, shared by every calendar
 * surface: the day, week and month teacher grids, and the student slot picker.
 *
 * Slots were previously styled inline in each grid, which is how they drifted
 * apart in the first place. Change a state here and all five surfaces move.
 *
 * The encoding is Alphabet Storm's value ladder, not a colour scale:
 *
 *   booked    solid ink        a confirmed lesson — condensed, settled, real
 *   open      dashed outline   a slot that exists but holds nothing yet
 *   selected  ink ring         the one you are acting on
 *   past      hollow, rain     already spent
 *
 * Why solid ink for booked: a teacher scanning a week needs "where am I
 * committed?" answered before they read a single word. Filled blocks against an
 * empty ground answers it at a glance, at any zoom, in either theme — and it
 * degrades safely for colour-blind users because nothing here is hue.
 *
 * Density note: no transitions or dispersal on these. This grid is clicked
 * dozens of times a morning and animation would tax exactly the workflow the
 * brief protects.
 */

/** A confirmed booking. The strongest mark on the grid. */
export const SLOT_BOOKED =
  "border border-foreground bg-foreground text-[var(--app-canvas)]";

/**
 * Offered availability with nobody in it yet.
 *
 * The border is --app-muted rather than the world's decorative silver: this
 * outline is what identifies the slot and its state, so WCAG 1.4.11 wants 3:1
 * against the surface. Silver is 1.53:1 on paper and would fail; muted is
 * 5.14:1 light / 7.42:1 dark. Silver stays for genuinely decorative marks.
 */
export const SLOT_OPEN =
  "border border-dashed border-[var(--app-muted)] bg-surface text-foreground hover:border-foreground hover:bg-[var(--app-hover)]";

/** The slot currently being acted on. Pairs with SLOT_OPEN or SLOT_BOOKED. */
export const SLOT_SELECTED =
  "border border-foreground bg-[var(--app-hover)] text-foreground ring-2 ring-foreground";

/** Elapsed or cancelled: present, but spent. */
export const SLOT_PAST =
  "border border-[var(--app-muted)] bg-transparent text-muted opacity-80";

/** Times and dates must not jitter as the numerals change. */
export const SLOT_FIGURE = "tabular-nums";

/**
 * Hover feedback for a booked slot you can actually act on.
 *
 * Deliberately not folded into SLOT_BOOKED: "booked" describes the lesson, not
 * what you may do about it. The student's slot picker renders a booked slot as
 * an inert marker meaning somebody else has this time, and a hover state there
 * would promise an action that does not exist.
 *
 * The affordance is the border, not the fill. Fill is what the value ladder
 * encodes state with, so an ink block that lightened under the pointer would
 * read as the selected state; its border is already there at the same width,
 * and turning it from ink to canvas draws a hairline inside the block with no
 * layout shift and no confusion with SLOT_SELECTED's outer ring.
 */
export const SLOT_BOOKED_HOVER = "hover:border-[var(--app-canvas)]";

/** The same, for a spent slot — which is drawn in outline, so it can lift. */
export const SLOT_PAST_HOVER = "hover:border-foreground hover:text-foreground";

/**
 * Resolve a slot's classes from its state.
 * `selected` wins over the base state so the active slot is never ambiguous.
 */
export function slotClasses({
  kind,
  selected = false,
  past = false,
  interactive = false,
}: {
  kind: "booked" | "open";
  selected?: boolean;
  past?: boolean;
  /**
   * This slot is a button or a link. Opt-in rather than assumed, because the
   * same classes dress inert markers elsewhere — see SLOT_BOOKED_HOVER.
   */
  interactive?: boolean;
}) {
  if (past) return interactive ? `${SLOT_PAST} ${SLOT_PAST_HOVER}` : SLOT_PAST;
  if (selected) return SLOT_SELECTED;
  if (kind === "open") return SLOT_OPEN;
  return interactive ? `${SLOT_BOOKED} ${SLOT_BOOKED_HOVER}` : SLOT_BOOKED;
}
