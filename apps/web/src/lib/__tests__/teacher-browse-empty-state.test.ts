import { describe, expect, test } from "vitest";
import en from "../../../messages/en.json";
import { browseEmptyState } from "@/lib/teacher-browse-empty-state";

/**
 * Which "there is nothing here" the browse list shows.
 *
 * There used to be exactly one, for four different situations: "No teachers
 * matched your filters", described by the page's own subtitle. A signed-out
 * visitor never gets to set a filter — the page strips the params and redirects
 * to sign-in before it queries — so that sentence blamed them for a choice they
 * were not offered, underneath a description they had already read at the top
 * of the same screen.
 */

const bookingMessages = en.booking as Record<string, string>;

const everyState = [
  browseEmptyState({ guest: true, filtered: false }),
  browseEmptyState({ guest: false, filtered: false }),
  browseEmptyState({ guest: true, filtered: true }),
  browseEmptyState({ guest: false, filtered: true }),
];

describe("browseEmptyState", () => {
  test("does not blame a filter that was never applied", () => {
    expect(browseEmptyState({ guest: true, filtered: false }).titleKey).not.toBe(
      "noTeachersFound",
    );
    expect(browseEmptyState({ guest: false, filtered: false }).titleKey).not.toBe(
      "noTeachersFound",
    );
  });

  test("blames the filter when one was applied, and offers to clear it", () => {
    const state = browseEmptyState({ guest: false, filtered: true });

    expect(state.titleKey).toBe("noTeachersFound");
    expect(state.action).toBe("clearFilters");
  });

  test("sends a signed-out visitor to sign in, which can genuinely change this list", () => {
    /*
      Not a consolation prize. `marketplaceTeacherWhere` shows a signed-in
      student the teachers on their own roster even when those teachers are
      hidden from the marketplace, and `sortOwnTeachersFirst` puts them at the
      top — so signing in can turn this empty page into their own teacher.
    */
    expect(browseEmptyState({ guest: true, filtered: false }).action).toBe("signIn");
  });

  test("keeps a signed-in student on a route they can use", () => {
    // Nothing to clear and nowhere to sign in to, so the only move left is back.
    expect(browseEmptyState({ guest: false, filtered: false }).action).toBe("dashboard");
  });

  test("never describes itself with the sentence already at the top of the page", () => {
    const bodies = everyState.map((state) => bookingMessages[state.bodyKey]);

    expect(bodies).not.toContain(en.booking.teacherBrowseSubtitle);
  });

  test("every state names copy that exists", () => {
    // The keys are strings, so nothing else would catch a typo until the page
    // threw MISSING_MESSAGE in front of whoever opened it.
    for (const state of everyState) {
      expect(bookingMessages[state.titleKey], state.titleKey).toBeTruthy();
      expect(bookingMessages[state.bodyKey], state.bodyKey).toBeTruthy();
    }
  });
});
