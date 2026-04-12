import type { PrismaClient } from "@prisma/client";
import { computeLevelMastery } from "@/lib/study/mastery";

const TRACK_SLUG = "english-flashcards";

export type StudyResumeInfo = {
  levelCode: string;
  titleJa: string;
  titleEn: string;
  cardsTouched: number;
  cardsTotal: number;
  lastStudiedAt: Date;
};

/** Most recently studied track level (for “where you left off”). */
export async function getStudyResumeInfo(
  prisma: PrismaClient,
  userId: string,
): Promise<StudyResumeInfo | null> {
  const track = await prisma.studyTrack.findUnique({
    where: { slug: TRACK_SLUG },
    select: { id: true },
  });
  if (!track) return null;

  const progress = await prisma.userStudyLevelProgress.findFirst({
    where: {
      userId,
      lastStudiedAt: { not: null },
      level: { trackId: track.id },
    },
    orderBy: { lastStudiedAt: "desc" },
    include: { level: true },
  });
  if (!progress?.lastStudiedAt) return null;

  const { cardsTouched, cardsTotal } = await computeLevelMastery(prisma, userId, progress.levelId);

  return {
    levelCode: progress.level.levelCode,
    titleJa: progress.level.titleJa,
    titleEn: progress.level.titleEn,
    cardsTouched,
    cardsTotal,
    lastStudiedAt: progress.lastStudiedAt,
  };
}
