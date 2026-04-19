import type { PrismaClient } from "@/generated/prisma/client";
import { isStudyLevelUnlocked } from "./access";
import { computeLevelMastery } from "./mastery";
import { studyRpgProgressFromTotalXp, type StudyRpgSnapshot } from "./rpg-xp";
import {
  combineTrackPracticeRollups,
  getFlashcardPracticeRollupsByLevelId,
  type FlashcardLevelPracticeRollup,
} from "./study-flashcard-stats";

export async function getTotalStudyXpForTrack(
  prisma: PrismaClient,
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
    where: { slug: trackSlug },
    include: {
      levels: { orderBy: { sortOrder: "asc" } },
    },
  });
  if (!track) return null;

  const totalStudyXp = await getTotalStudyXpForTrack(prisma, userId, track.id);
  const rpg = studyRpgProgressFromTotalXp(totalStudyXp);

  const practiceByLevelId = await getFlashcardPracticeRollupsByLevelId(
    prisma,
    userId,
    track.levels.map((l) => l.id),
  );

  const levels = [];
  for (const level of track.levels) {
    const locked = !(await isStudyLevelUnlocked(prisma, userId, track.id, level.levelCode));
    const progress = await prisma.userStudyLevelProgress.findUnique({
      where: { userId_levelId: { userId, levelId: level.id } },
    });
    const { masteryScore, cardsTotal, cardsTouched } = await computeLevelMastery(
      prisma,
      userId,
      level.id,
    );

    const assessment = await prisma.studyAssessment.findFirst({
      where: { levelId: level.id, kind: "LEVEL_EXIT" },
      select: { id: true },
    });

    levels.push({
      id: level.id,
      levelCode: level.levelCode,
      titleJa: level.titleJa,
      titleEn: level.titleEn,
      sortOrder: level.sortOrder,
      locked,
      xp: progress?.xp ?? 0,
      masteryScore,
      assessmentPassedAt: progress?.assessmentPassedAt ?? null,
      completedAt: progress?.completedAt ?? null,
      cardsTotal,
      cardsTouched,
      exitAssessmentId: assessment?.id ?? null,
      practice: practiceByLevelId.get(level.id)!,
    });
  }

  const trackPractice: FlashcardLevelPracticeRollup = combineTrackPracticeRollups(
    track.levels.map((l) => practiceByLevelId.get(l.id)!),
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
