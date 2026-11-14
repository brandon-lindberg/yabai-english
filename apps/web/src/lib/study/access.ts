import type { PrismaClient } from "@/generated/prisma/client";
import { StudyLevelCode } from "@/generated/prisma/client";
import { previousStudyLevel, studyLevelIndex, STUDY_LEVEL_ORDER } from "./constants";
import { placementMaxStudyLevelIndex } from "./placement-unlock";

/** Shared access calculation for individual checks and batched overviews. */
export function studyLevelAccess(input: {
  role?: string; levelCode: StudyLevelCode; placedLevel?: Parameters<typeof placementMaxStudyLevelIndex>[0];
  placedSubLevel?: number | null; previousPassed: boolean;
}) {
  if (!STUDY_LEVEL_ORDER.includes(input.levelCode)) return false;
  if (input.role === "TEACHER" || input.role === "SUPER_ADMIN" || input.levelCode === StudyLevelCode.BEGINNER_1) return true;
  const cap = placementMaxStudyLevelIndex(input.placedLevel ?? "UNSET", input.placedSubLevel);
  return (cap !== null && studyLevelIndex(input.levelCode) <= cap) || input.previousPassed;
}

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
  // English entry points must never expose a draft or another subject's data,
  // including to teachers. Japanese prompt/unlock policy is a separate increment.
  const track = await prisma.studyTrack.findUnique({
    where: { id: trackId }, select: { learningLanguage: true, publicationStatus: true },
  });
  if (!track || track.learningLanguage !== "ENGLISH" || track.publicationStatus !== "PUBLISHED" || !STUDY_LEVEL_ORDER.includes(levelCode)) return false;
  if (levelCode === StudyLevelCode.BEGINNER_1) return true;

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { role: true },
  });
  // Teachers/Admins do not take placement; keep all flashcard levels reviewable.
  if (user?.role === "TEACHER" || user?.role === "SUPER_ADMIN") return true;

  const profile = await prisma.studentProfile.findUnique({
    where: { userId },
    select: { placedLevel: true, placedSubLevel: true },
  });

  if (studyLevelAccess({ role: user?.role, levelCode, ...profile, previousPassed: false })) return true;

  const prev = previousStudyLevel(levelCode);
  if (!prev) return true;

  const prevLevel = await prisma.studyLevel.findUnique({
    where: { trackId_levelCode: { trackId, levelCode: prev } },
    select: { id: true },
  });
  if (!prevLevel) return false;

  const prevProgress = await prisma.userStudyLevelProgress.findUnique({
    where: { userId_levelId: { userId, levelId: prevLevel.id } },
    select: { assessmentPassedAt: true },
  });

  return studyLevelAccess({ role: user?.role, levelCode, ...profile, previousPassed: Boolean(prevProgress?.assessmentPassedAt) });
}
