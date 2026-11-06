import "server-only";
import { z } from "zod";
import { LearningLanguage, PlacedLevel } from "@/generated/prisma/enums";
import type { PrismaClient, StudentProfile } from "@/generated/prisma/client";
import { lessonProductNames } from "@/lib/lesson-product-catalog";
import { japaneseResultSchema } from "@/lib/japanese-placement/public";
import { readJapanesePlacementRetake } from "@/lib/japanese-placement/retake";
import { placementRetakeStatus } from "@/lib/placement-cooldown";

const languages = Object.values(LearningLanguage);
const recentLimit = 5;
const englishAward = z.object({
  level: z.enum([PlacedLevel.BEGINNER, PlacedLevel.INTERMEDIATE, PlacedLevel.ADVANCED]),
  subLevel: z.number().int().min(1).max(3).optional(),
});

type AttemptSummary = {
  id: string;
  completedAt: string;
  status: "AWARDED" | "INCONCLUSIVE";
  level?: string;
  subLevel?: number;
};

export async function loadAdminStudentOverview(db: PrismaClient, studentId: string,
  profile: Pick<StudentProfile, "placedLevel" | "placedSubLevel" | "placementCompletedAt" | "timezone"> | null,
) {
  const finished = { learnerId: studentId, status: "COMPLETED", finishedAt: { not: null } } as const;
  const recent = {
    where: finished,
    orderBy: [{ finishedAt: "desc" as const }, { id: "desc" as const }],
    take: recentLimit,
    select: { id: true, finishedAt: true, result: true },
  };
  const [bookingCounts, bookings, english, japanese, japaneseRetake] = await Promise.all([
    db.booking.groupBy({ by: ["learningLanguage"], where: { studentId }, _count: { _all: true } }),
    Promise.all(languages.map((learningLanguage) => db.booking.findMany({
      where: { studentId, learningLanguage },
      orderBy: [{ startsAt: "desc" }, { id: "desc" }],
      take: recentLimit,
      select: {
        id: true, startsAt: true, status: true,
        lessonProduct: { select: { nameJa: true, nameEn: true, tier: true, durationMin: true } },
        teacher: { select: { displayName: true, user: { select: { name: true } } } },
      },
    }))),
    db.englishPlacementAttempt.findMany(recent),
    db.japanesePlacementAttempt.findMany(recent),
    readJapanesePlacementRetake(db, studentId),
  ]);

  const englishAttempts: AttemptSummary[] = english.flatMap(({ id, finishedAt, result }) => {
    if (!finishedAt) return [];
    const parsed = englishAward.safeParse(result);
    return [{ id, completedAt: finishedAt.toISOString(), status: parsed.success ? "AWARDED" : "INCONCLUSIVE",
      ...(parsed.success ? parsed.data : {}) }];
  });
  const japaneseAttempts: AttemptSummary[] = japanese.flatMap(({ id, finishedAt, result }) => {
    const parsed = japaneseResultSchema.safeParse(result);
    if (!finishedAt || !parsed.success || parsed.data.attemptId !== id) return [];
    const estimate = parsed.data.levelEstimate;
    return [{ id, completedAt: finishedAt.toISOString(), status: estimate.status === "estimated" ? "AWARDED" : "INCONCLUSIVE",
      ...(estimate.status === "estimated" ? { level: estimate.band } : {}) }];
  });

  const englishLevel = profile && profile.placedLevel !== "UNSET" ? profile.placedLevel : null;
  const legacyCompletedAt = profile?.placementCompletedAt?.toISOString() ?? null;
  if (englishLevel && legacyCompletedAt && englishAttempts.length < recentLimit &&
    !englishAttempts.some((attempt) => attempt.completedAt === legacyCompletedAt)) {
    englishAttempts.push({
      id: "legacy-english", completedAt: legacyCompletedAt, status: "AWARDED", level: englishLevel,
      subLevel: profile?.placedSubLevel ?? undefined,
    });
    englishAttempts.sort((a, b) => b.completedAt.localeCompare(a.completedAt));
  }
  const japaneseAward = japaneseRetake.result?.levelEstimate;
  const placement = {
    ENGLISH: {
      currentLevel: englishLevel, subLevel: englishLevel ? profile?.placedSubLevel ?? null : null,
      completedAt: legacyCompletedAt,
      retakeDate: placementRetakeStatus(profile?.placementCompletedAt, profile?.timezone).eligibleDate,
      attempts: englishAttempts,
    },
    JAPANESE: {
      currentLevel: japaneseAward?.status === "estimated" ? japaneseAward.band : null, subLevel: null,
      completedAt: japaneseRetake.completedAt?.toISOString() ?? null,
      retakeDate: japaneseRetake.retakeEligibleDate,
      attempts: japaneseAttempts,
    },
  };

  const historyFor = (language: LearningLanguage) => ({
    ...placement[language],
    lessonCount: bookingCounts.find((row) => row.learningLanguage === language)?._count._all ?? 0,
    lessons: bookings[languages.indexOf(language)].map(({ id, startsAt, status, lessonProduct, teacher }) => ({
      id, startsAt: startsAt.toISOString(), status,
      names: lessonProductNames(lessonProduct, language),
      teacher: teacher.displayName ?? teacher.user.name,
    })),
  });
  return { ENGLISH: historyFor("ENGLISH"), JAPANESE: historyFor("JAPANESE") };
}

export type AdminStudentOverview = Awaited<ReturnType<typeof loadAdminStudentOverview>>;
