import { describe, expect, it } from "vitest";
import { isPlacementRetakeAllowed, placementRetakeEligibleAt } from "../placement-cooldown";

describe("placement cooldown", () => {
  it("allows retake when never completed", () => {
    expect(isPlacementRetakeAllowed(null)).toBe(true);
    expect(isPlacementRetakeAllowed(undefined)).toBe(true);
  });

  it("eligibleAt is one calendar month after completion (UTC)", () => {
    const completed = new Date(Date.UTC(2026, 0, 15, 10, 0, 0));
    const eligible = placementRetakeEligibleAt(completed);
    expect(eligible.getUTCFullYear()).toBe(2026);
    expect(eligible.getUTCMonth()).toBe(1);
    expect(eligible.getUTCDate()).toBe(15);
  });

  it("blocks retake before eligible date", () => {
    const completed = new Date(Date.now() - 24 * 60 * 60 * 1000);
    expect(isPlacementRetakeAllowed(completed)).toBe(false);
  });

  it("allows retake on or after eligible date", () => {
    const completed = new Date(Date.now() - 400 * 24 * 60 * 60 * 1000);
    expect(isPlacementRetakeAllowed(completed)).toBe(true);
  });
});
