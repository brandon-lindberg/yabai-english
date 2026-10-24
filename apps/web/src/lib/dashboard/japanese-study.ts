import "server-only";
import type { PrismaClient } from "@/generated/prisma/client";
import { JapaneseStudyFailure, getJapaneseStudyOverview } from "../study/japanese-service";
import { readJapaneseDailyReview } from "../study/japanese-daily-review";
import { combineTrackPracticeRollups } from "../study/study-flashcard-stats";
import { studyRpgProgressFromTotalXp } from "../study/rpg-xp";

/** A read-only dashboard projection; browsing never starts a review. */
export async function getJapaneseDashboardStudy(db: PrismaClient, userId: string) {
  try {
    const source = await getJapaneseStudyOverview(db, userId);
    const trackPractice = combineTrackPracticeRollups(source.levels.map(level => level.practice));
    const levels = source.levels.map(level => ({
      levelCode: level.code, titleEn: level.code, titleJa: level.code, locked: !level.unlocked,
      cardsTotal: level.mastery.total, cardsTouched: level.mastery.total - level.practice.newCount,
    }));
    const latest = source.levels.filter(level => level.lastStudiedAt).sort((a, b) => b.lastStudiedAt!.getTime() - a.lastStudiedAt!.getTime())[0];
    const resumed = latest ? levels.find(level => level.levelCode === latest.code)! : null;
    const daily = await readJapaneseDailyReview(db, userId, source, new Date(Date.now()));
    return { available: true, overview: { levels, rpg: studyRpgProgressFromTotalXp(source.levels.reduce((sum, level) => sum + level.xp, 0)) },
      resume: latest && resumed ? { ...resumed, lastStudiedAt: latest.lastStudiedAt! } : null,
      trackPractice, quickReview: daily.status,
    } as const;
  } catch (error) {
    if (error instanceof JapaneseStudyFailure && [401, 403, 503].includes(error.status)) return { available: false } as const;
    throw error;
  }
}
