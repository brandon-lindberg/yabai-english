/** XP required to advance from one RPG rank to the next (flat tiers for predictable pacing). */
export const RPG_XP_PER_RANK = 280;

export type StudyRpgSnapshot = {
  /** 1-based RPG rank (not the same as Beginner/Intermediate learning levels). */
  rank: number;
  /** XP accumulated toward the next rank (0 .. rpgXpForNextRank - 1). */
  xpIntoRank: number;
  /** XP needed to go from current rank to rank+1. */
  xpForNextRank: number;
  /** 0–100 for progress bar. */
  progressPercent: number;
  /** Sum of study XP across all learning levels in the track. */
  totalStudyXp: number;
};

/**
 * Total study XP = sum of per-level `UserStudyLevelProgress.xp` for the track.
 * Every correct/wrong quiz answer already increments that field.
 */
export function studyRpgProgressFromTotalXp(totalStudyXp: number): StudyRpgSnapshot {
  const t = Math.max(0, Math.floor(totalStudyXp));
  const xpIntoRank = t % RPG_XP_PER_RANK;
  const rank = Math.floor(t / RPG_XP_PER_RANK) + 1;
  const progressPercent = Math.min(100, Math.round((xpIntoRank / RPG_XP_PER_RANK) * 1000) / 10);

  return {
    rank,
    xpIntoRank,
    xpForNextRank: RPG_XP_PER_RANK,
    progressPercent,
    totalStudyXp: t,
  };
}
