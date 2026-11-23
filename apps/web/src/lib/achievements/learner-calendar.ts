import "server-only";
import { Prisma, type LearningLanguage, type PrismaClient } from "@/generated/prisma/client";
import { lessonAwardLimit } from "./gallery";
import { learnerCalendar, type ActivityDay } from "./calendar-rules";
import { achievementScope } from "./rarity";

export type LearnerOwner = { userId: string; learningLanguage: LearningLanguage };

export function studyCalendarTimezone(owner: LearnerOwner) {
  return Prisma.sql`study_calendar_timezone(${owner.userId}, ${owner.learningLanguage}::"LearningLanguage")`;
}

/** Record one graded review. Only the fifth distinct card requests evaluation. */
export async function recordAchievementReview(tx: Prisma.TransactionClient, owner: LearnerOwner, cardId: string, now: Date) {
  const scope = achievementScope(false, owner.learningLanguage);
  const queued = await tx.$executeRaw`
    WITH zone AS (SELECT ${studyCalendarTimezone(owner)} AS tz),
    recorded AS (
      INSERT INTO "LearningAchievementStudyDay" AS d ("userId", "learningLanguage", day, "timezone", "cardIds")
      SELECT ${owner.userId}, ${owner.learningLanguage}::"LearningLanguage",
        (${now.toISOString()}::timestamptz AT TIME ZONE zone.tz)::date, zone.tz, ARRAY[${cardId}]::text[] FROM zone
      ON CONFLICT ("userId", "learningLanguage", day) DO UPDATE
        SET "cardIds" = array_append(d."cardIds", ${cardId})
        WHERE cardinality(d."cardIds") < 5 AND NOT (${cardId} = ANY(d."cardIds"))
      RETURNING cardinality("cardIds") AS cards
    )
    INSERT INTO "AchievementWork" ("userId", "scope", "source", "dueAt")
    SELECT ${owner.userId}, ${scope}::"AchievementScope", 'study', ${now} FROM recorded WHERE cards = 5
    ON CONFLICT ("userId", "scope", "source") DO UPDATE SET "dueAt" = EXCLUDED."dueAt", "leaseUntil" = NULL
  `;
  return queued > 0;
}

export async function readLearnerCalendar(db: PrismaClient, owner: LearnerOwner, now = new Date()) {
  const eligible = Prisma.sql`SELECT b."endsAt" FROM eligible_learning_lesson b
    WHERE b."studentId" = ${owner.userId} AND b."learningLanguage" = ${owner.learningLanguage}::"LearningLanguage"
      AND b."endsAt" <= ${now}`;
  const [totals, zones] = await Promise.all([
    db.$queryRaw<{ lessons: number }[]>`SELECT count(*)::int AS lessons FROM (${eligible} LIMIT ${lessonAwardLimit}) lessons`,
    db.$queryRaw<{ zone: string; trackedFrom: string }[]>`
      SELECT zone.name AS zone, ((t."startedAt" AT TIME ZONE 'UTC') AT TIME ZONE zone.name)::date::text AS "trackedFrom"
      FROM "AchievementTracking" t CROSS JOIN (SELECT ${studyCalendarTimezone(owner)} AS name) zone
      WHERE t.id = 1
    `,
  ]);
  const { zone, trackedFrom } = zones[0];
  const activity = learnerCalendar(trackedFrom);
  // One row per activity date, streamed in order; no answer history is read here.
  let after = "0001-01-01";
  const pageSize = 256;
  for (;;) {
    const days = await db.$queryRaw<ActivityDay[]>`
      SELECT day::text AS day, bool_or(study) AS study, bool_or(lesson) AS lesson FROM (
        SELECT day, cardinality("cardIds") >= 5 AS study, false AS lesson FROM "LearningAchievementStudyDay"
        WHERE "userId" = ${owner.userId} AND "learningLanguage" = ${owner.learningLanguage}::"LearningLanguage"
          AND day > ${after}::date AND day <= (${now.toISOString()}::timestamptz AT TIME ZONE ${zone})::date
        UNION ALL
        SELECT (("endsAt" AT TIME ZONE 'UTC') AT TIME ZONE ${zone})::date, false, true
        FROM (${eligible} AND b."endsAt" >= ((${after}::date + 1)::timestamp AT TIME ZONE ${zone}) AT TIME ZONE 'UTC') bookings
      ) dates GROUP BY day ORDER BY day LIMIT ${pageSize}
    `;
    for (const day of days) activity.add(day);
    if (days.length < pageSize) break;
    after = days.at(-1)!.day;
  }
  return { ...activity.evidence, lessons: totals[0].lessons };
}
