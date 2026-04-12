import { describe, expect, it } from "vitest";
import {
  countQuickReviewOutcomeStats,
  eligibleReplacementCandidates,
  learnedDismissedIds,
  parseQuickReviewInteractions,
  pickRandomId,
  replaceSlotCardId,
  type QuickReviewInteraction,
} from "../study/quick-review-actions";

describe("parseQuickReviewInteractions", () => {
  it("parses a valid array", () => {
    const raw: unknown = [
      { cardId: "a", outcome: "learned", at: "2026-01-01T00:00:00.000Z" },
      { cardId: "b", outcome: "not_yet", at: "2026-01-01T00:01:00.000Z" },
    ];
    const out = parseQuickReviewInteractions(raw);
    expect(out).toHaveLength(2);
    expect(out[0]!.outcome).toBe("learned");
  });

  it("returns empty for invalid input", () => {
    expect(parseQuickReviewInteractions(null)).toEqual([]);
    expect(parseQuickReviewInteractions({})).toEqual([]);
  });
});

describe("learnedDismissedIds", () => {
  it("collects only learned card ids", () => {
    const xs: QuickReviewInteraction[] = [
      { cardId: "x", outcome: "learned", at: "2026-01-01T00:00:00.000Z" },
      { cardId: "y", outcome: "not_yet", at: "2026-01-01T00:00:00.000Z" },
      { cardId: "z", outcome: "learned", at: "2026-01-01T00:00:00.000Z" },
    ];
    expect([...learnedDismissedIds(xs)].sort()).toEqual(["x", "z"]);
  });
});

describe("eligibleReplacementCandidates", () => {
  const pool = ["p1", "p2", "p3", "p4", "p5", "p6"];

  it("excludes other current slots and learned-dismissed ids", () => {
    const current = ["p1", "p2", "p3"];
    const dismissed = new Set<string>(["p4"]);
    const leaving = "p2";
    const c = eligibleReplacementCandidates(pool, current, dismissed, leaving);
    expect(c.sort()).toEqual(["p5", "p6"]);
  });

  it("excludes the leaving slot id from candidates", () => {
    const current = ["p1", "p2"];
    const dismissed = new Set<string>();
    const c = eligibleReplacementCandidates(pool, current, dismissed, "p1");
    expect(c).not.toContain("p1");
    expect(c).toContain("p3");
  });

  it("returns empty when nothing is available", () => {
    const current = ["p1", "p2", "p3"];
    const dismissed = new Set<string>(["p4", "p5", "p6"]);
    expect(eligibleReplacementCandidates(pool, current, dismissed, "p1")).toEqual([]);
  });
});

describe("replaceSlotCardId", () => {
  it("replaces the first matching id preserving order", () => {
    expect(replaceSlotCardId(["a", "b", "c"], "b", "x")).toEqual(["a", "x", "c"]);
  });

  it("removes the slot when replacement is null", () => {
    expect(replaceSlotCardId(["a", "b", "c"], "b", null)).toEqual(["a", "c"]);
  });

  it("no-ops when id missing", () => {
    expect(replaceSlotCardId(["a", "b"], "z", "x")).toEqual(["a", "b"]);
  });
});

describe("countQuickReviewOutcomeStats", () => {
  it("counts learned vs not yet", () => {
    const xs: QuickReviewInteraction[] = [
      { cardId: "a", outcome: "learned", at: "t" },
      { cardId: "b", outcome: "not_yet", at: "t" },
      { cardId: "c", outcome: "learned", at: "t" },
    ];
    expect(countQuickReviewOutcomeStats(xs)).toEqual({ learnedToday: 2, notYetToday: 1 });
  });
});

describe("pickRandomId", () => {
  it("returns null for empty candidates", () => {
    expect(pickRandomId([], () => 0.5)).toBeNull();
  });

  it("uses rng to index candidates", () => {
    expect(pickRandomId(["only"], () => 0.99)).toBe("only");
    expect(pickRandomId(["a", "b"], () => 0)).toBe("a");
  });
});
