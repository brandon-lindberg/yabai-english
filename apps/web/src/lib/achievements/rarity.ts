import type { AchievementScope, LearningLanguage } from "@/generated/prisma/client";

export function achievementScope(teaching: boolean, language: LearningLanguage): AchievementScope {
  if (teaching) return "TEACHING";
  return language === "JAPANESE" ? "LEARN_JAPANESE" : "LEARN_ENGLISH";
}

export function achievementRarity(earned: number, eligible: number) {
  if (eligible === 0) return null;
  return {
    // Floor to a tenth of a percent so a rare 9.99% badge never reads as 10%.
    fraction: Math.floor(earned * 1000 / eligible) / 1000,
    rare: earned * 10 < eligible,
  };
}
