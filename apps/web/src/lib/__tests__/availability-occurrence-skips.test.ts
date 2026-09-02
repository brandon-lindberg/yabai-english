import { describe, expect, test } from "vitest";
import {
  buildOccurrenceSkipIndex,
  isOccurrenceSkipped,
} from "@/lib/availability-occurrence-skips";

const WHEN = "2026-04-18T12:00:00.000Z";

describe("occurrence skips", () => {
  test("a skip naming its rule cancels only that rule's occurrence", () => {
    const index = buildOccurrenceSkipIndex([{ slotId: "weekly-a", startsAtIso: WHEN }]);

    expect(isOccurrenceSkipped(index, "weekly-a", WHEN)).toBe(true);
    // Another rule happening at the same instant is untouched — and so is the
    // one-off written to replace the cancelled occurrence.
    expect(isOccurrenceSkipped(index, "weekly-b", WHEN)).toBe(false);
    expect(isOccurrenceSkipped(index, "replacement-one-off", WHEN)).toBe(false);
  });

  // A skip that cancelled "whatever starts at this instant" silently swallowed
  // any slot written there later — including the one-off replacing an edited
  // occurrence, which is how an edited availability vanished. Every skip names
  // its rule, so a skip can only ever cancel the rule it was made against.
  test("a skip never reaches a rule it was not made against", () => {
    const index = buildOccurrenceSkipIndex([{ slotId: "weekly-a", startsAtIso: WHEN }]);

    expect(isOccurrenceSkipped(index, "weekly-b", WHEN)).toBe(false);
    expect(isOccurrenceSkipped(index, "one-off-written-later", WHEN)).toBe(false);
  });

  test("a different instant is never skipped", () => {
    const index = buildOccurrenceSkipIndex([{ slotId: "weekly-a", startsAtIso: WHEN }]);

    expect(isOccurrenceSkipped(index, "weekly-a", "2026-04-25T12:00:00.000Z")).toBe(false);
  });

  test("an empty set skips nothing", () => {
    expect(isOccurrenceSkipped(buildOccurrenceSkipIndex([]), "weekly-a", WHEN)).toBe(false);
  });
});
