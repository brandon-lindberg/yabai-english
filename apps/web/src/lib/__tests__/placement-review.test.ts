import { describe, expect, test } from "vitest";
import { buildPlacementReviewUpdate } from "@/lib/placement-review";

describe("buildPlacementReviewUpdate", () => {
  test("marks review resolved and sets level", () => {
    const update = buildPlacementReviewUpdate({
      placedLevel: "INTERMEDIATE",
      adminNote: "Reviewed writing sample and objective profile.",
    });
    expect(update.placedLevel).toBe("INTERMEDIATE");
    expect(update.placementNeedsReview).toBe(false);
    expect(update.placementReviewReason).toContain("Admin review:");
  });
});
