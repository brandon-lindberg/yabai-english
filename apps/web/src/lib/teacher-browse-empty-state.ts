/**
 * Which "there is nothing here" the teacher browse list should show.
 *
 * One string used to cover four situations: "No teachers matched your filters",
 * described by the page's own subtitle. Both halves were wrong for most of
 * them. A signed-out visitor cannot set a filter — `/book` strips the params
 * and redirects to sign-in before it queries — so the title blamed them for a
 * choice they were never offered; and the description repeated, verbatim, the
 * sentence sitting a few hundred pixels above it.
 *
 * Two facts decide it, and neither is the viewer's role on its own: whether a
 * filter is actually narrowing the list, and whether signing in could change
 * what the list holds.
 */

export type BrowseEmptyAction =
  /** Nothing is listed, but this visitor has an account that might hold more. */
  | "signIn"
  /** A filter is hiding everyone; drop it. */
  | "clearFilters"
  /** Signed in, no filter, genuinely nothing to show. */
  | "dashboard";

export type BrowseEmptyState = {
  /** `booking` namespace keys, resolved by the page. */
  titleKey: "noTeachersFound" | "noTeachersListed";
  bodyKey: "noTeachersFoundBody" | "noTeachersListedGuestBody" | "noTeachersListedBody";
  action: BrowseEmptyAction;
};

export function browseEmptyState({
  guest,
  filtered,
}: {
  guest: boolean;
  /** A specialty or language is narrowing the list. */
  filtered: boolean;
}): BrowseEmptyState {
  /*
    The filter comes first and ignores who is asking: clearing it is the fix
    whoever set it. A guest cannot reach this today — the page redirects them
    to sign-in the moment a filter param appears — but "clear the filter" stays
    correct if that ever changes, where "sign in" would send them away from a
    list they could have fixed in place.
  */
  if (filtered) {
    return {
      titleKey: "noTeachersFound",
      bodyKey: "noTeachersFoundBody",
      action: "clearFilters",
    };
  }

  /*
    For a guest this is not a dead end. `marketplaceTeacherWhere` shows a
    signed-in student the teachers on their own roster even when those teachers
    are hidden from the marketplace, and `sortOwnTeachersFirst` puts them at the
    top — so signing in can turn an empty marketplace into their own teacher.
  */
  return guest
    ? {
        titleKey: "noTeachersListed",
        bodyKey: "noTeachersListedGuestBody",
        action: "signIn",
      }
    : {
        titleKey: "noTeachersListed",
        bodyKey: "noTeachersListedBody",
        action: "dashboard",
      };
}
