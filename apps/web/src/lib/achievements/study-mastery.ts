import "server-only";
import type { LearningLanguage, Prisma, PrismaClient } from "@/generated/prisma/client";
import { practiceBandSql } from "@/lib/study/practice-band-sql";
import { lockStudyLearner } from "@/lib/study/review-progress";
import { masteryAwardLimit } from "./gallery";

type Owner = { userId: string; learningLanguage: LearningLanguage };
type MasteryTotal = { total: number; legacyReconciled: boolean };

/** Record one changed card under the existing learner lock. No review-history read. */
export async function recordMasteredCard(tx: Prisma.TransactionClient, owner: Owner, cardId: string) {
  const [updated] = await tx.$queryRaw<{ total: number }[]>`
    INSERT INTO "LearningAchievementMasteryProgress" AS progress ("userId", "learningLanguage", "masteredCardIds")
    VALUES (${owner.userId}, ${owner.learningLanguage}::"LearningLanguage", ARRAY[${cardId}]::text[])
    ON CONFLICT ("userId", "learningLanguage") DO UPDATE
      SET "masteredCardIds" = array_append(progress."masteredCardIds", ${cardId})
      WHERE cardinality(progress."masteredCardIds") < ${masteryAwardLimit}
        AND NOT (${cardId} = ANY(progress."masteredCardIds"))
    RETURNING cardinality("masteredCardIds") AS total
  `;
  return updated?.total;
}

async function readMasteryTotal(db: Pick<Prisma.TransactionClient, "$queryRaw">, owner: Owner) {
  const [result] = await db.$queryRaw<MasteryTotal[]>`
    SELECT cardinality("masteredCardIds") AS total, "legacyReconciled"
    FROM "LearningAchievementMasteryProgress"
    WHERE "userId" = ${owner.userId} AND "learningLanguage" = ${owner.learningLanguage}::"LearningLanguage"
  `;
  return result ?? { total: 0, legacyReconciled: false };
}

/** Import existing, provable mastery once on the gallery path. */
export async function reconcileMasteredCards(db: PrismaClient, owner: Owner, trackSlug: string) {
  const current = await readMasteryTotal(db, owner);
  if (current.legacyReconciled || current.total >= masteryAwardLimit) return current.total;

  return db.$transaction(async tx => {
    await lockStudyLearner(tx, owner.userId);
    const latest = await readMasteryTotal(tx, owner);
    if (latest.legacyReconciled || latest.total >= masteryAwardLimit) return latest.total;

    const [updated] = await tx.$queryRaw<{ total: number }[]>`
      WITH recorded AS (
        SELECT "masteredCardIds" FROM "LearningAchievementMasteryProgress"
        WHERE "userId" = ${owner.userId} AND "learningLanguage" = ${owner.learningLanguage}::"LearningLanguage"
      )
      INSERT INTO "LearningAchievementMasteryProgress" AS progress
        ("userId", "learningLanguage", "masteredCardIds", "legacyReconciled")
      VALUES (${owner.userId}, ${owner.learningLanguage}::"LearningLanguage", ARRAY(
        SELECT s."cardId"
        FROM "UserStudyCardState" s
        JOIN "StudyCard" c ON c.id = s."cardId"
        JOIN "StudyDeck" d ON d.id = c."deckId"
        JOIN "StudyLevel" l ON l.id = d."levelId"
        JOIN "StudyTrack" t ON t.id = l."trackId"
        WHERE s."userId" = ${owner.userId} AND t.slug = ${trackSlug}
          AND t."learningLanguage" = ${owner.learningLanguage}::"LearningLanguage"
          AND (${practiceBandSql}) = 'mastered'
          AND NOT (s."cardId" = ANY(COALESCE((SELECT "masteredCardIds" FROM recorded), ARRAY[]::text[])))
        ORDER BY s."cardId"
        LIMIT ${masteryAwardLimit - latest.total}
      ), true)
      ON CONFLICT ("userId", "learningLanguage") DO UPDATE
        SET "masteredCardIds" = progress."masteredCardIds" || EXCLUDED."masteredCardIds", "legacyReconciled" = true
      RETURNING cardinality("masteredCardIds") AS total
    `;
    return updated.total;
  });
}
