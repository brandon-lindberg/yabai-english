import { describe, expect, test } from "vitest";
import { SLOT_BOOKED, slotClasses } from "@/components/ui/slot-state";

/*
  Hover is a claim that something will happen if you click. It belongs to
  "you can act on this", not to "this is booked" — the student's slot picker
  renders a booked slot as an inert marker meaning somebody else has it, and a
  hover state there would promise an action that does not exist.
*/

describe("slotClasses", () => {
  test("a booked slot you can open reacts to the pointer", () => {
    expect(slotClasses({ kind: "booked", interactive: true })).toMatch(/hover:/);
  });

  test("a booked slot you cannot act on does not", () => {
    expect(slotClasses({ kind: "booked" })).not.toMatch(/hover:/);
    expect(SLOT_BOOKED).not.toMatch(/hover:/);
  });

  test("a past lesson still answers the pointer where it is a link", () => {
    expect(slotClasses({ kind: "booked", past: true, interactive: true })).toMatch(/hover:/);
    expect(slotClasses({ kind: "booked", past: true })).not.toMatch(/hover:/);
  });

  test("an open slot has always reacted, and still does", () => {
    expect(slotClasses({ kind: "open" })).toMatch(/hover:/);
  });

  test("hover never changes the fill, so it cannot read as another state", () => {
    // The value ladder encodes state in fill. A booked block that lightened on
    // hover would read as the selected state under the pointer.
    expect(slotClasses({ kind: "booked", interactive: true })).not.toMatch(/hover:bg-/);
  });
});
