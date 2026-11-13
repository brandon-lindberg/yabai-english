import type { PrismaClient } from "@/generated/prisma/client";
import { studyLevelAccess } from "./access";
import { studyMasteryPercent } from "./mastery";
import { previousStudyLevel } from "./constants";
import { studyRpgProgressFromTotalXp, type StudyRpgSnapshot } from "./rpg-xp";
import {
  combineTrackPracticeRollups,
  getFlashcardStatisticsByLevelId,
  type FlashcardLevelPracticeRollup,
} from "./study-flashcard-stats";

export async function getTotalStudyXpForTrack(
  prisma: Pick<PrismaClient, "userStudyLevelProgress">,
  userId: string,
  trackId: string,
): Promise<number> {
  const agg = await prisma.userStudyLevelProgress.aggregate({
    where: { userId, level: { trackId } },
    _sum: { xp: true },
  });
  return agg._sum.xp ?? 0;
}

export async function getStudyRpgSnapshot(
  prisma: PrismaClient,
  userId: string,
  trackId: string,
): Promise<StudyRpgSnapshot> {
  const total = await getTotalStudyXpForTrack(prisma, userId, trackId);
  return studyRpgProgressFromTotalXp(total);
}

export async function getStudyTrackOverview(
  prisma: PrismaClient,
  userId: string,
  trackSlug: string,
) {
  const track = await prisma.studyTrack.findUnique({
    where: { slug: trackSlug, learningLanguage: "ENGLISH", publicationStatus: "PUBLISHED" },
    include: {
      levels: { orderBy: { sortOrder: "asc" } },
    },
  });
  if (!track) return null;

  const [actor, progressRows, assessments, statistics] = await Promise.all([
    prisma.user.findUnique({ where: { id: userId }, select: { role: true, studentProfile: { select: { placedLevel: true, placedSubLevel: true } } } }),
    prisma.userStudyLevelProgress.findMany({ where: { userId, level: { trackId: track.id } } }),
    prisma.studyAssessment.findMany({ where: { level: { trackId: track.id }, kind: "LEVEL_EXIT" }, select: { id: true, levelId: true } }),
    getFlashcardStatisticsByLevelId(prisma, userId, track.levels.map(level => level.id)),
  ]);
  const rpg = studyRpgProgressFromTotalXp(progressRows.reduce((sum, row) => sum + row.xp, 0));
  const byLevel = new Map(progressRows.map(row => [row.levelId, row]));
  const levels = track.levels.map(level => {
    const progress = byLevel.get(level.id);
    const previous = track.levels.find(row => row.levelCode === previousStudyLevel(level.levelCode));
    const locked = !studyLevelAccess({ role: actor?.role, levelCode: level.levelCode, ...actor?.studentProfile,
      previousPassed: Boolean(previous && byLevel.get(previous.id)?.assessmentPassedAt) });
    const { practice, cardsTotal, cardsTouched } = statistics.get(level.id)!;
    return {
      id: level.id,
      levelCode: level.levelCode,
      titleJa: level.titleJa,
      titleEn: level.titleEn,
      sortOrder: level.sortOrder,
      locked,
      xp: progress?.xp ?? 0,
      masteryScore: studyMasteryPercent(cardsTotal, cardsTouched),
      assessmentPassedAt: progress?.assessmentPassedAt ?? null,
      completedAt: progress?.completedAt ?? null,
      cardsTotal,
      cardsTouched,
      exitAssessmentId: assessments.find(row => row.levelId === level.id)?.id ?? null,
      practice,
    };
  });

  const trackPractice: FlashcardLevelPracticeRollup = combineTrackPracticeRollups(
    track.levels.map((l) => statistics.get(l.id)!.practice),
  );

  return {
    track: {
      id: track.id,
      slug: track.slug,
      titleJa: track.titleJa,
      titleEn: track.titleEn,
    },
    levels,
    rpg,
    trackPractice,
  };
}
