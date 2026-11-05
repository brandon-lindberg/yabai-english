import "server-only";
import type { PrismaClient, StudyLevel, StudyTrack } from "@/generated/prisma/client";
import type { JapaneseLevel } from "../japanese-content/corpus-audit";
import { isLoginAllowedForAccountStatus } from "../account-status";
import { readLatestJapanesePlacementAward } from "../japanese-placement/retake";
import { JAPANESE_STUDY_LEVEL_ORDER, studyLevelIndex } from "./constants";
import { getFlashcardPracticeRollupsByLevelId } from "./study-flashcard-stats";

type Mastery = { total: number; mastered: number };
type ProgressionInput = {
  placementBand?: string | null;
  mastery?: Partial<Record<JapaneseLevel, Mastery>>;
  earnedLevels?: readonly string[];
  completedLevels?: readonly string[];
};
const levels = JAPANESE_STUDY_LEVEL_ORDER as JapaneseLevel[];
const index = (code: string) => levels.includes(code as JapaneseLevel) ? studyLevelIndex(code as JapaneseLevel, "JAPANESE") : -1;

/** Study access only: flashcard mastery never writes or substitutes a placement result. */
export function japaneseStudyProgression(input: ProgressionInput) {
  const mastered = levels.filter(code => {
    const row = input.mastery?.[code];
    return !!row && Number.isInteger(row.total) && Number.isInteger(row.mastered) && row.total > 0 && row.mastered === row.total;
  });
  const completed = [...new Set([...(input.completedLevels ?? []).filter(code => index(code) >= 0), ...mastered])];
  const cap = Math.min(levels.length - 1, Math.max(0, index(input.placementBand ?? ""),
    ...(input.earnedLevels ?? []).map(index), ...completed.map(code => index(code) + 1)));
  return { unlocked: levels.slice(0, cap + 1), mastered, completed: levels.filter(code => completed.includes(code)) };
}

type JapaneseStudyDb = Pick<PrismaClient, "user" | "studyTrack" | "japanesePlacementAttempt" | "userStudyLevelProgress" | "studyCard" | "userStudyCardState">;
type JapaneseTrack = StudyTrack & { levels: StudyLevel[] };

export async function readJapaneseStudyContext(db: JapaneseStudyDb, learnerId: string) {
  const actor = await db.user.findUnique({ where: { id: learnerId }, select: { role: true, accountStatus: true, learningLanguage: true } });
  if (!actor) return { status: "unauthorized" } as const;
  if (actor.role !== "STUDENT" || actor.learningLanguage !== "JAPANESE" || !isLoginAllowedForAccountStatus(actor.accountStatus)) return { status: "forbidden" } as const;
  const track = await db.studyTrack.findUnique({ where: { slug: "japanese-flashcards", learningLanguage: "JAPANESE", publicationStatus: "PUBLISHED" }, include: { levels: { orderBy: { sortOrder: "asc" } } } });
  return track ? { status: "available", track } as const : { status: "unavailable" } as const;
}

/** Shared read calculation for HTTP overview and transactional milestones. */
export async function getJapaneseStudyProgressionForTrack(db: JapaneseStudyDb, learnerId: string, track: JapaneseTrack) {
  const levelIds = track.levels.map(row => row.id);
  const [attempt, progress, practice] = await Promise.all([
    readLatestJapanesePlacementAward(db, learnerId),
    db.userStudyLevelProgress.findMany({ where: { userId: learnerId, level: { trackId: track.id } } }),
    getFlashcardPracticeRollupsByLevelId(db, learnerId, levelIds),
  ]);
  const result = attempt?.result;
  const placementBand = result?.levelEstimate.status === "estimated" ? result.levelEstimate.band : null;
  const codeById = new Map(track.levels.map(row => [row.id, row.levelCode]));
  const mastery = Object.fromEntries(track.levels.map(row => {
    const stats = practice.get(row.id)!;
    return [row.levelCode, { total: stats.newCount + stats.learningCount + stats.weakCount + stats.masteredCount, mastered: stats.masteredCount }];
  }));
  const progression = japaneseStudyProgression({ placementBand, mastery,
    earnedLevels: progress.map(row => codeById.get(row.levelId)!),
    completedLevels: progress.filter(row => row.completedAt).map(row => codeById.get(row.levelId)!),
  });
  return { available: true, track: { id: track.id, slug: track.slug }, placementBand, ...progression,
    levels: track.levels.map(row => ({ id: row.id, code: row.levelCode, unlocked: progression.unlocked.includes(row.levelCode as JapaneseLevel),
      lastStudiedAt: progress.find(p => p.levelId === row.id)?.lastStudiedAt ?? null,
      mastery: mastery[row.levelCode]!, practice: practice.get(row.id)!, xp: progress.find(p => p.levelId === row.id)?.xp ?? 0,
    })),
  } as const;
}

/** Read-only service boundary, also used when no learner-facing catalog is live. */
export async function getJapaneseStudyProgression(db: JapaneseStudyDb, learnerId: string) {
  const context = await readJapaneseStudyContext(db, learnerId);
  return context.status === "available" ? getJapaneseStudyProgressionForTrack(db, learnerId, context.track) : { available: false } as const;
}
