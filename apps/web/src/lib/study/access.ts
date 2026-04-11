import type { PrismaClient } from "@prisma/client";
import { StudyLevelCode } from "@prisma/client";
import { previousStudyLevel, studyLevelIndex } from "./constants";
import { placementMaxStudyLevelIndex } from "./placement-unlock";

/**
 * A study level is unlocked if:
 * - It is Beginner 1 (default entry for everyone), or
 * - Placement places the learner at or above this level (all lower track levels open), or
 * - The previous level's exit assessment has been passed (progressive unlock).
 */
export async function isStudyLevelUnlocked(
  prisma: PrismaClient,
  userId: string,
  trackId: string,
  levelCode: StudyLevelCode,
): Promise<boolean> {
  if (levelCode === StudyLevelCode.BEGINNER_1) return true;

  const profile = await prisma.studentProfile.findUnique({
    where: { userId },
    select: { placedLevel: true, placedSubLevel: true },
  });

  const cap = placementMaxStudyLevelIndex(
    profile?.placedLevel ?? "UNSET",
    profile?.placedSubLevel,
  );
  const idx = studyLevelIndex(levelCode);
  if (cap !== null && idx <= cap) return true;

  const prev = previousStudyLevel(levelCode);
  if (!prev) return true;

  const prevLevel = await prisma.studyLevel.findUnique({
    where: { trackId_levelCode: { trackId, levelCode: prev } },
  });
  if (!prevLevel) return false;

  const prevProgress = await prisma.userStudyLevelProgress.findUnique({
    where: { userId_levelId: { userId, levelId: prevLevel.id } },
  });

  return Boolean(prevProgress?.assessmentPassedAt);
}
