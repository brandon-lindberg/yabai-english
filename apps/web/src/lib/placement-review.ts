import { PlacedLevel } from "@/generated/prisma/client";

export function buildPlacementReviewUpdate(input: {
  placedLevel: Exclude<PlacedLevel, "UNSET">;
  adminNote?: string;
}) {
  const note = input.adminNote?.trim();
  return {
    placedLevel: input.placedLevel,
    placementNeedsReview: false,
    placementReviewReason: note ? `Admin review: ${note}` : "Admin review: completed",
    placementCompletedAt: new Date(),
  };
}
