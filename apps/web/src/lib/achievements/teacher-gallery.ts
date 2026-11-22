import "server-only";
import type { PrismaClient } from "@/generated/prisma/client";
import { teachingClassAwardLimit, teachingCollection } from "./teaching-catalogue";

export async function getTeacherGallery(db: PrismaClient, userId: string, now = new Date()) {
  const readAwards = () => db.teachingAchievementAward.findMany({
    where: { userId },
    select: { achievementId: true, awardedAt: true },
  });
  const [profile, existing] = await Promise.all([
    db.teacherProfile.findUnique({
      where: { userId },
      select: { id: true, displayName: true, bio: true, instructionLanguages: true },
    }),
    readAwards(),
  ]);
  const awards = new Map(existing.map(row => [row.achievementId, row.awardedAt]));
  const needsClasses = !awards.has("teach-0100");
  const needsRepeat = !awards.has("teach-return");
  const needsNotes = !awards.has("teach-hidden-notes");
  const needsWeek = !awards.has("teach-hidden-second-bell");
  const [booking, evidence, reply] = profile ? await Promise.all([
    !awards.has("teach-booked") ? db.booking.findFirst({
      where: {
        teacherId: profile.id,
        OR: [
          { status: { in: ["CONFIRMED", "COMPLETED"] } },
          { status: "CANCELLED", cancelledFromStatus: { in: ["CONFIRMED", "COMPLETED"] } },
        ],
      },
      select: { id: true },
    }) : null,
    needsClasses || needsRepeat || needsNotes || needsWeek
      ? db.$queryRaw<Array<{ classes: number; repeatLearner: boolean; lessonNotes: boolean; twoTeachingDays: boolean }>>`
      WITH eligible AS MATERIALIZED (
        SELECT b."studentId" AS student,
          COALESCE('group:' || COALESCE(b."groupLessonSessionId", b."teachingGroupOccurrenceId"),
                   'booking:' || b.id) AS occurrence,
          ((COALESCE(g."startsAt", b."startsAt") AT TIME ZONE 'UTC') AT TIME ZONE 'Asia/Tokyo')::date AS day,
          CASE WHEN ${needsNotes} THEN b."completionNotesMd" ~ '[^[:space:]]' END AS "hasNotes"
        FROM "Booking" b
        LEFT JOIN "GroupLessonSession" g ON g.id = b."groupLessonSessionId"
        WHERE b."teacherId" = ${profile.id}
          AND b.status IN ('CONFIRMED', 'COMPLETED')
          AND COALESCE(g."endsAt", b."endsAt") <= ${now}
      )
      SELECT
        CASE WHEN ${needsClasses} THEN (
          SELECT count(*)::int
          FROM (SELECT DISTINCT occurrence FROM eligible LIMIT ${teachingClassAwardLimit}) classes
        ) ELSE ${teachingClassAwardLimit} END AS classes,
        CASE WHEN ${needsRepeat} THEN EXISTS (
          SELECT 1 FROM eligible GROUP BY student
          HAVING min(day) <> max(day) AND min(occurrence) <> max(occurrence)
        ) ELSE true END AS "repeatLearner",
        CASE WHEN ${needsNotes} THEN EXISTS (
          SELECT 1 FROM eligible WHERE "hasNotes"
        ) ELSE true END AS "lessonNotes",
        CASE WHEN ${needsWeek} THEN EXISTS (
          SELECT 1 FROM eligible GROUP BY date_trunc('week', day::timestamp)
          HAVING min(day) <> max(day) AND min(occurrence) <> max(occurrence)
        ) ELSE true END AS "twoTeachingDays"
    ` : null,
    !awards.has("teach-hidden-reply") ? db.$queryRaw<Array<{ qualified: boolean }>>`
      SELECT EXISTS (
        SELECT 1
        FROM "Booking" b
        JOIN "ChatThread" t ON t."studentId" = b."studentId" AND t."teacherId" = ${userId}
        JOIN "User" teacher ON teacher.id = t."teacherId" AND teacher.role = 'TEACHER'
        JOIN "User" student ON student.id = t."studentId" AND student.role = 'STUDENT'
        JOIN LATERAL (
          SELECT m."createdAt"
          FROM "ChatMessage" m
          WHERE m."threadId" = t.id AND m."senderId" = t."teacherId" AND m."recipientId" = t."studentId"
          ORDER BY m."createdAt" DESC
          LIMIT 1
        ) reply ON reply."createdAt" >= b."createdAt"
        WHERE b."teacherId" = ${profile.id}
          AND b."groupLessonSessionId" IS NULL AND b."teachingGroupOccurrenceId" IS NULL
          AND (b.status IN ('CONFIRMED', 'COMPLETED')
            OR (b.status = 'CANCELLED' AND b."cancelledFromStatus" IN ('CONFIRMED', 'COMPLETED')))
          AND EXISTS (
            SELECT 1 FROM "ChatMessage" incoming
            WHERE incoming."threadId" = t.id AND incoming."senderId" = t."studentId"
              AND incoming."recipientId" = t."teacherId" AND incoming."createdAt" < reply."createdAt"
          )
      ) AS qualified
    ` : null,
  ]) : [null, null, null];
  const cards = teachingCollection({
    completeProfile: Boolean(profile?.displayName?.trim() && profile.bio?.trim()
      && profile.instructionLanguages.some(language => language.trim())),
    firstBooking: Boolean(booking) || awards.has("teach-booked"),
    classes: needsClasses ? evidence?.[0]?.classes ?? 0 : teachingClassAwardLimit,
    repeatLearner: !needsRepeat || Boolean(evidence?.[0]?.repeatLearner),
    lessonNotes: !needsNotes || Boolean(evidence?.[0]?.lessonNotes),
    studentReply: awards.has("teach-hidden-reply") || Boolean(reply?.[0]?.qualified),
    twoTeachingDays: !needsWeek || Boolean(evidence?.[0]?.twoTeachingDays),
  });
  const missing = cards.filter(card => card.qualified && !awards.has(card.id));
  if (missing.length) {
    await db.teachingAchievementAward.createMany({
      data: missing.map(card => ({ userId, achievementId: card.id })),
      skipDuplicates: true,
    });
    for (const award of await readAwards()) awards.set(award.achievementId, award.awardedAt);
  }
  return cards.flatMap(card => {
    const awardedAt = awards.get(card.id) ?? null;
    return card.hidden && !awardedAt ? [] : [{ ...card, awardedAt }];
  });
}
