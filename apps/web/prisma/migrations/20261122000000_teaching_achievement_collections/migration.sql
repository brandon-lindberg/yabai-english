CREATE TYPE "AchievementScope" AS ENUM ('LEARN_ENGLISH', 'LEARN_JAPANESE', 'TEACHING');

CREATE TABLE "TeachingAchievementAward" (
    "userId" TEXT NOT NULL,
    "achievementId" TEXT NOT NULL,
    "awardedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "TeachingAchievementAward_pkey" PRIMARY KEY ("userId", "achievementId"),
    CONSTRAINT "TeachingAchievementAward_userId_fkey"
        FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE TABLE "AchievementUnlockSnapshot" (
    "scope" "AchievementScope" NOT NULL,
    "eligibleUsers" INTEGER NOT NULL,
    "awardedCounts" JSONB NOT NULL,
    "refreshedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "AchievementUnlockSnapshot_pkey" PRIMARY KEY ("scope")
);

ALTER TABLE "Booking" ADD COLUMN "teachingGroupOccurrenceId" TEXT;

CREATE FUNCTION preserve_teaching_group_occurrence() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
    NEW."teachingGroupOccurrenceId" := OLD."groupLessonSessionId";
    RETURN NEW;
END;
$$;

CREATE TRIGGER preserve_teaching_group_occurrence
BEFORE UPDATE OF "groupLessonSessionId" ON "Booking"
FOR EACH ROW WHEN (OLD."groupLessonSessionId" IS NOT NULL AND NEW."groupLessonSessionId" IS NULL)
EXECUTE FUNCTION preserve_teaching_group_occurrence();

-- The background refresh and initial migration use the same cohort definition.
CREATE FUNCTION refresh_achievement_unlock_snapshot(target_scope "AchievementScope")
RETURNS boolean LANGUAGE sql AS $$
    WITH eligible AS MATERIALIZED (
        SELECT u.id FROM "User" u
        WHERE CASE target_scope
            WHEN 'TEACHING' THEN u.role = 'TEACHER' OR (
                u.role = 'SUPER_ADMIN' AND EXISTS (
                    SELECT 1 FROM "TeacherProfile" p WHERE p."userId" = u.id
                )
            )
            WHEN 'LEARN_ENGLISH' THEN u.role = 'STUDENT' AND u."learningLanguage" = 'ENGLISH'
            WHEN 'LEARN_JAPANESE' THEN u.role = 'STUDENT' AND u."learningLanguage" = 'JAPANESE'
        END
    ), counts AS (
        SELECT a."achievementId", count(*)::integer AS total
        FROM "TeachingAchievementAward" a JOIN eligible e ON e.id = a."userId"
        WHERE target_scope = 'TEACHING'
        GROUP BY a."achievementId"
        UNION ALL
        SELECT a."achievementId", count(*)::integer AS total
        FROM "LearningAchievementAward" a JOIN eligible e ON e.id = a."userId"
        WHERE (target_scope = 'LEARN_ENGLISH' AND a."learningLanguage" = 'ENGLISH')
           OR (target_scope = 'LEARN_JAPANESE' AND a."learningLanguage" = 'JAPANESE')
        GROUP BY a."achievementId"
    )
    INSERT INTO "AchievementUnlockSnapshot" ("scope", "eligibleUsers", "awardedCounts", "refreshedAt")
    SELECT target_scope, (SELECT count(*)::integer FROM eligible),
           COALESCE((SELECT jsonb_object_agg("achievementId", total) FROM counts), '{}'::jsonb),
           CURRENT_TIMESTAMP
    ON CONFLICT ("scope") DO UPDATE
    SET "eligibleUsers" = EXCLUDED."eligibleUsers",
        "awardedCounts" = EXCLUDED."awardedCounts",
        "refreshedAt" = EXCLUDED."refreshedAt"
    RETURNING true;
$$;

SELECT refresh_achievement_unlock_snapshot(scope)
FROM unnest(enum_range(NULL::"AchievementScope")) AS scopes(scope);
