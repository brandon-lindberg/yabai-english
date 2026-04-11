import { describe, expect, it } from "vitest";
import { PlacedLevel, StudyLevelCode } from "@prisma/client";
import {
  assertPlacementUnlockMappingCoversTrack,
  isStudyLevelUnlockedByPlacement,
  placementMaxStudyLevelIndex,
} from "../study/placement-unlock";

describe("placementMaxStudyLevelIndex", () => {
  it("covers full track at max subLevel per band", () => {
    expect(() => assertPlacementUnlockMappingCoversTrack()).not.toThrow();
  });

  it("Intermediate 2 unlocks through INTERMEDIATE_2 only", () => {
    const cap = placementMaxStudyLevelIndex(PlacedLevel.INTERMEDIATE, 2);
    expect(cap).toBe(4);
    expect(isStudyLevelUnlockedByPlacement(StudyLevelCode.BEGINNER_1, PlacedLevel.INTERMEDIATE, 2)).toBe(true);
    expect(isStudyLevelUnlockedByPlacement(StudyLevelCode.INTERMEDIATE_2, PlacedLevel.INTERMEDIATE, 2)).toBe(true);
    expect(isStudyLevelUnlockedByPlacement(StudyLevelCode.INTERMEDIATE_3, PlacedLevel.INTERMEDIATE, 2)).toBe(false);
    expect(isStudyLevelUnlockedByPlacement(StudyLevelCode.ADVANCED_1, PlacedLevel.INTERMEDIATE, 2)).toBe(false);
  });

  it("UNSET yields no placement unlock", () => {
    expect(placementMaxStudyLevelIndex(PlacedLevel.UNSET, 1)).toBeNull();
    expect(isStudyLevelUnlockedByPlacement(StudyLevelCode.BEGINNER_2, PlacedLevel.UNSET, 1)).toBe(false);
  });
});
