import { describe, expect, test } from "vitest";
import { buttonClasses } from "@/components/ui/button";

/*
  A button has to answer the pointer twice: once when it is under it, and again
  when it is pressed. Both were weak here.

  Primary — the solid ink one, which is every "Next", "Save" and "Finish" in the
  app — changed only its opacity on hover. Ninety per cent of near-black on
  near-white is a shift of about twenty values in a field of ten: technically a
  change, practically invisible, and the reason the onboarding buttons read as
  dead. Secondary and ghost had the *same* declaration for hover and active, so
  pressing them said nothing at all.

  Everything below is expressed in tokens rather than literals: primary is ink
  on paper by day and paper on ink at night, so a hardcoded "slightly lighter"
  would be wrong in one of the two themes.
*/

const VARIANTS = ["primary", "secondary", "ghost", "destructive"] as const;

/** The declarations for one pseudo-state, e.g. every `hover:*` utility. */
function state(classes: string, prefix: "hover" | "active") {
  return classes
    .split(" ")
    .filter((c) => c.startsWith(`${prefix}:`))
    .map((c) => c.slice(prefix.length + 1))
    .sort()
    .join(" ");
}

describe("buttonClasses", () => {
  test.each(VARIANTS)("%s answers the pointer", (variant) => {
    expect(state(buttonClasses({ variant }), "hover")).not.toBe("");
  });

  test.each(VARIANTS)("%s answers being pressed, differently", (variant) => {
    const classes = buttonClasses({ variant });

    expect(state(classes, "active")).not.toBe(state(classes, "hover"));
  });

  test("primary changes its fill, not merely its opacity", () => {
    // Opacity on a solid-ink block is the change that could not be seen.
    expect(state(buttonClasses({ variant: "primary" }), "hover")).toMatch(/^bg-/);
  });

  test("primary's states are built from tokens, so both themes work", () => {
    // Primary inverts at night — ink on paper becomes paper on ink — so a
    // literal colour would be right in one theme and wrong in the other.
    const hover = state(buttonClasses({ variant: "primary" }), "hover");

    expect(hover).toContain("var(--app-primary)");
    expect(hover).not.toMatch(/#[0-9a-f]{3,8}/i);
  });

  test("colour changes are transitioned, or the new states pop", () => {
    expect(buttonClasses()).toMatch(/transition-colors/);
  });

  test("a disabled button still reads as unavailable", () => {
    expect(buttonClasses()).toContain("disabled:opacity-40");
    expect(buttonClasses()).toContain("disabled:cursor-not-allowed");
  });
});
