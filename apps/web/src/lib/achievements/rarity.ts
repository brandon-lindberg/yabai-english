import type { AchievementScope, LearningLanguage } from "@/generated/prisma/client";

export function achievementScope(teaching: boolean, language: LearningLanguage): AchievementScope {
  if (teaching) return "TEACHING";
  return language === "JAPANESE" ? "LEARN_JAPANESE" : "LEARN_ENGLISH";
}

export function achievementRarity(earned: number, eligible: number, viewerEarned = false) {
  if (eligible === 0) return null;
  // The snapshot can predate the viewer's award, so the actual count is at least one.
  const count = Math.max(earned, Number(viewerEarned));
  const hundredths = Math.floor(count * 10_000 / eligible);
  const belowMinimum = count > 0 && hundredths === 0;
  return {
    fraction: (belowMinimum ? 1 : hundredths) / 10_000,
    belowMinimum,
    rare: count > 0 && count * 10 < eligible,
  };
}
