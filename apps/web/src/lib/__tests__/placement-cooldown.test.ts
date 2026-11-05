import { describe, expect, it } from "vitest";
import { placementRetakeStatus } from "../placement-cooldown";

describe("placement cooldown", () => {
  it("allows retake when never completed", () => {
    expect(placementRetakeStatus(null)).toEqual({ allowed: true, eligibleAt: null, eligibleDate: null });
    expect(placementRetakeStatus(undefined).allowed).toBe(true);
  });

  it.each([
    ["America/Los_Angeles", "2026-11-30T08:00:00.000Z", "2026-11-30"],
    ["Asia/Tokyo", "2026-11-30T15:00:00.000Z", "2026-12-01"],
    ["Pacific/Auckland", "2026-11-30T11:00:00.000Z", "2026-12-01"],
  ])("opens at local midnight in %s, including a shortened month and a DST change", (zone, boundary, date) => {
    const completed = new Date("2026-11-01T04:30:00.000Z");
    expect(placementRetakeStatus(completed, zone, Date.parse(boundary) - 1)).toEqual({ allowed: false, eligibleAt: boundary, eligibleDate: date });
    expect(placementRetakeStatus(completed, zone, Date.parse(boundary)).allowed).toBe(true);
  });

  it("blocks retake before eligible date", () => {
    const completed = new Date(Date.now() - 24 * 60 * 60 * 1000);
    expect(placementRetakeStatus(completed).allowed).toBe(false);
  });

  it("allows retake on or after eligible date", () => {
    const completed = new Date(Date.now() - 400 * 24 * 60 * 60 * 1000);
    expect(placementRetakeStatus(completed).allowed).toBe(true);
  });

  it("uses the established account default for missing or invalid legacy zones", () => {
    const completed = new Date("2026-11-01T04:30:00.000Z");
    expect(placementRetakeStatus(completed, "Unknown/Zone")).toEqual(placementRetakeStatus(completed, "Asia/Tokyo"));
    expect(placementRetakeStatus(completed).eligibleDate).toBe("2026-12-01");
  });
});
