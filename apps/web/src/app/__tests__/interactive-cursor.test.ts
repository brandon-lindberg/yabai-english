import { describe, expect, test } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

/*
  Tailwind v3's preflight set `button { cursor: pointer }`. v4 dropped it and
  follows the browser default, which is `default` — so on this upgrade every
  button in the app silently stopped saying it was pressable, and a calendar
  chip you can click read as dead text.

  Restored here rather than as a `cursor-pointer` on each component: it is a
  property of "this is a button", and the fifteen places that had hand-added
  the class are exactly how the other several hundred came to be missing it.
*/
const css = readFileSync(resolve(process.cwd(), "src/app/globals.css"), "utf8");

/** The base-layer block that restores the pointer, or null if it is gone. */
const cursorRule = css.match(/@layer\s+base\s*\{[\s\S]*?cursor:\s*pointer[\s\S]*?\n\}/)?.[0] ?? null;

describe("pressable things look pressable", () => {
  test("buttons get a pointer cursor", () => {
    expect(cursorRule, "no base-layer cursor rule").not.toBeNull();
    expect(cursorRule!).toMatch(/\bbutton\b/);
  });

  test("a disabled button does not claim to be pressable", () => {
    expect(cursorRule!).toMatch(/:disabled/);
  });

  test("it sits in the base layer, so cursor utilities still win", () => {
    // `button:not(:disabled)` outranks a `.cursor-wait` utility on specificity.
    // Only the layer order keeps a component able to override it.
    expect(cursorRule).not.toBeNull();
  });
});
