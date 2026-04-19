import type { PlacedLevel } from "@/generated/prisma/client";

export function getStudentPostOnboardingRoute(placedLevel: PlacedLevel) {
  if (placedLevel === "UNSET") {
    return "/onboarding/next";
  }
  return "/dashboard";
}
