import "server-only";
import type { PrismaClient } from "@/generated/prisma/client";
import { studyCalendarTimezone, type LearnerOwner } from "@/lib/achievements/learner-calendar";
import { dayNumber, monthNumber, studyWeekDays, weekNumber } from "./calendar-date";
import { defaultStudyStreakPreference, type StudyStreakPreference, type StudyStreakUpdate } from "./streak-preference";

type Summary = StudyStreakPreference & {
  lastStudyDay: string | null;
  daily: number;
  monthly: number;
  weekDays: number;
  priorWeeks: number[];
};

const preferenceFields = { enabled: true, mode: true, weeklyGoal: true } as const;

export async function getStudyStreakPreference(db: PrismaClient, owner: LearnerOwner): Promise<StudyStreakPreference> {
  return await db.studyStreak.findUnique({
    where: { userId_learningLanguage: owner }, select: preferenceFields,
  }) ?? defaultStudyStreakPreference;
}

export async function saveStudyStreakPreference(db: PrismaClient, owner: LearnerOwner, preference: StudyStreakUpdate) {
  return db.studyStreak.upsert({
    where: { userId_learningLanguage: owner },
    create: { ...owner, ...preference },
    update: preference,
    select: preferenceFields,
  });
}

export async function getStudyStreak(db: PrismaClient, owner: LearnerOwner, now = new Date()) {
  const [row] = await db.$queryRaw<
    ({ today: string; stamps: string[] } & ({ mode: null } | Summary))[]
  >`
    WITH local_day AS (SELECT (${now.toISOString()}::timestamptz AT TIME ZONE ${studyCalendarTimezone(owner)})::date AS day)
    SELECT d.day::text AS today, s.enabled, s.mode, s."weeklyGoal", s."lastStudyDay"::text AS "lastStudyDay",
      s.daily, s.monthly, s."weekDays", s."priorWeeks", ARRAY(
        SELECT fact.day::text FROM "StudyStreakDay" fact
        WHERE fact."userId" = ${owner.userId} AND fact."learningLanguage" = ${owner.learningLanguage}::"LearningLanguage"
          AND fact.day BETWEEN date_trunc('week', d.day::timestamp)::date AND d.day
      ) AS stamps
    FROM local_day d LEFT JOIN "StudyStreak" s
      ON s."userId" = ${owner.userId} AND s."learningLanguage" = ${owner.learningLanguage}::"LearningLanguage"
    WHERE s.enabled IS NOT FALSE
  `;
  if (!row) return null;
  const { today, stamps } = row;
  const summary = row.mode === null ? null : row;
  const preference = summary
    ? { enabled: summary.enabled, mode: summary.mode, weeklyGoal: summary.weeklyGoal }
    : defaultStudyStreakPreference;
  const week = studyWeekDays(today);
  const days = week.map(day => stamps.includes(day));
  const lastDay = summary?.lastStudyDay;
  const monthGap = lastDay ? monthNumber(today) - monthNumber(lastDay) : Infinity;
  let count = 0;

  if (summary && lastDay) {
    const dayGap = dayNumber(today) - dayNumber(lastDay);
    const weekGap = weekNumber(dayNumber(today)) - weekNumber(dayNumber(lastDay));
    if (preference.mode === "DAILY" && dayGap >= 0 && dayGap <= 1) count = summary.daily;
    if (preference.mode === "MONTHLY" && monthGap >= 0 && monthGap <= 1) count = summary.monthly;
    if (preference.mode === "WEEKLY") {
      const metGoal = summary.weekDays >= preference.weeklyGoal;
      if (weekGap === 0 || (weekGap === 1 && metGoal)) {
        count = (summary.priorWeeks[preference.weeklyGoal - 1] ?? 0) + Number(metGoal);
      }
    }
  }

  return { ...preference, today, week, days, count, studiedThisWeek: stamps.length, studiedThisMonth: monthGap === 0 };
}

export type StudyStreak = NonNullable<Awaited<ReturnType<typeof getStudyStreak>>>;
