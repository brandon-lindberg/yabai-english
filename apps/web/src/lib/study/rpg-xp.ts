/**
 * RPG rank is separate from curriculum levels (Beginner 1, etc.).
 * Each rank needs a bit more total XP than the last — linear growth so pacing stays friendly.
 */
export const RPG_RANK_XP_BASE = 280;
/** Extra XP per rank added to the segment after the previous one (easy ramp). */
export const RPG_RANK_XP_STEP = 24;

/** @deprecated Use RPG_RANK_XP_BASE; first rank segment matches the old flat tier size. */
export const RPG_XP_PER_RANK = RPG_RANK_XP_BASE;

export type StudyRpgSnapshot = {
  /** 1-based RPG rank (not the same as Beginner/Intermediate learning levels). */
  rank: number;
  /** XP accumulated toward the next rank (0 .. xpForNextRank - 1). */
  xpIntoRank: number;
  /** XP needed to go from current rank to rank+1. */
  xpForNextRank: number;
  /** 0–100 for progress bar. */
  progressPercent: number;
  /** Sum of study XP across all learning levels in the track. */
  totalStudyXp: number;
};

/**
 * XP required to advance from `rank` (1-based) to the next rank.
 * Rank 1→2 uses {@link RPG_RANK_XP_BASE}; each step adds {@link RPG_RANK_XP_STEP}.
 */
export function xpToAdvanceFromRank(rank: number): number {
  const r = Math.max(1, Math.floor(rank));
  return RPG_RANK_XP_BASE + (r - 1) * RPG_RANK_XP_STEP;
}

const MAX_RANK_ITER = 10_000;

/**
 * Total study XP = sum of per-level `UserStudyLevelProgress.xp` for the track.
 * Every correct/wrong quiz answer already increments that field.
 */
export function studyRpgProgressFromTotalXp(totalStudyXp: number): StudyRpgSnapshot {
  const t = Math.max(0, Math.floor(totalStudyXp));
  let rank = 1;
  let floorXp = 0;

  for (let guard = 0; guard < MAX_RANK_ITER; guard++) {
    const xpForNextRank = xpToAdvanceFromRank(rank);
    if (t < floorXp + xpForNextRank) {
      const xpIntoRank = t - floorXp;
      const progressPercent = Math.min(
        100,
        Math.round((xpIntoRank / xpForNextRank) * 1000) / 10,
      );
      return {
        rank,
        xpIntoRank,
        xpForNextRank,
        progressPercent,
        totalStudyXp: t,
      };
    }
    floorXp += xpForNextRank;
    rank++;
  }

  const xpForNextRank = xpToAdvanceFromRank(rank);
  return {
    rank,
    xpIntoRank: 0,
    xpForNextRank,
    progressPercent: 0,
    totalStudyXp: t,
  };
}
