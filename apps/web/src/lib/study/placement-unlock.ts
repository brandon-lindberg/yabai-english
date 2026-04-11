import { PlacedLevel, StudyLevelCode } from "@prisma/client";
import { STUDY_LEVEL_ORDER, studyLevelIndex } from "./constants";

/**
 * Highest study track level index (inclusive) unlocked by placement alone.
 * Example: INTERMEDIATE + subLevel 2 → index of INTERMEDIATE_2; all levels with index ≤ that are open.
 * UNSET → no placement-based unlock (only Beginner 1 default + study progression apply).
 */
export function placementMaxStudyLevelIndex(
  placedLevel: PlacedLevel,
  placedSubLevel: number | null | undefined,
): number | null {
  if (placedLevel === PlacedLevel.UNSET) return null;
  const sub = Math.min(3, Math.max(1, placedSubLevel ?? 1));
  switch (placedLevel) {
    case PlacedLevel.BEGINNER:
      return sub - 1;
    case PlacedLevel.INTERMEDIATE:
      return 2 + sub;
    case PlacedLevel.ADVANCED:
      return 5 + sub;
    default:
      return null;
  }
}

export function isStudyLevelUnlockedByPlacement(
  levelCode: StudyLevelCode,
  placedLevel: PlacedLevel,
  placedSubLevel: number | null | undefined,
): boolean {
  const cap = placementMaxStudyLevelIndex(placedLevel, placedSubLevel);
  if (cap === null) return false;
  return studyLevelIndex(levelCode) <= cap;
}

/** Sanity check: mapping covers all nine study levels at max subLevel per band. */
export function assertPlacementUnlockMappingCoversTrack(): void {
  const maxByBand: Record<Exclude<PlacedLevel, "UNSET">, number> = {
    BEGINNER: placementMaxStudyLevelIndex(PlacedLevel.BEGINNER, 3)!,
    INTERMEDIATE: placementMaxStudyLevelIndex(PlacedLevel.INTERMEDIATE, 3)!,
    ADVANCED: placementMaxStudyLevelIndex(PlacedLevel.ADVANCED, 3)!,
  };
  if (maxByBand.BEGINNER !== studyLevelIndex(StudyLevelCode.BEGINNER_3)) {
    throw new Error("BEGINNER placement cap mismatch");
  }
  if (maxByBand.INTERMEDIATE !== studyLevelIndex(StudyLevelCode.INTERMEDIATE_3)) {
    throw new Error("INTERMEDIATE placement cap mismatch");
  }
  if (maxByBand.ADVANCED !== studyLevelIndex(StudyLevelCode.ADVANCED_3)) {
    throw new Error("ADVANCED placement cap mismatch");
  }
  if (STUDY_LEVEL_ORDER.length !== 9) {
    throw new Error("STUDY_LEVEL_ORDER length changed; revisit placement-unlock formulas");
  }
}
