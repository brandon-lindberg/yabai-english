import type { PlacedLevel } from "@/generated/prisma/client";

export function getStudentPostOnboardingRoute(placedLevel: PlacedLevel, learningLanguage: "ENGLISH" | "JAPANESE" = "ENGLISH") {
  if (learningLanguage === "JAPANESE") return "/onboarding/next";
  if (placedLevel === "UNSET") {
    return "/onboarding/next";
  }
  return "/dashboard";
}
