/** Only routing mechanics are shared. Each assessment owns its bands, items and final evidence. */
export type StaircaseRank = 1 | 2 | 3 | 4 | 5;
type BandProgress = { correctStreak: number; missStreak: number; needsConfirmation: boolean };
export type StaircaseState = { target: StaircaseRank; bands: Record<StaircaseRank, BandProgress> };

export function initialStaircase(): StaircaseState {
  return { target: 1, bands: Object.fromEntries([1, 2, 3, 4, 5].map(rank =>
    [rank, { correctStreak: 0, missStreak: 0, needsConfirmation: false }],
  )) as StaircaseState["bands"] };
}

export function advanceStaircase(state: StaircaseState, presented: StaircaseRank, correct: boolean): StaircaseState {
  // A fallback outside the intended band must not complete that band's streak.
  if (presented !== state.target) return state;
  const progress = { ...state.bands[presented] };
  let target = state.target;
  if (!correct) {
    progress.correctStreak = 0;
    progress.needsConfirmation = true;
    if (++progress.missStreak >= 2) {
      target = Math.max(1, target - 1) as StaircaseRank;
      progress.missStreak = 0;
    }
  } else {
    progress.missStreak = 0;
    const required = presented === 1 ? 1 : progress.needsConfirmation ? 3 : 2;
    if (++progress.correctStreak >= required) {
      target = Math.min(5, target + 1) as StaircaseRank;
      progress.correctStreak = 0;
      progress.needsConfirmation = false;
    }
  }
  return { target, bands: { ...state.bands, [presented]: progress } };
}
