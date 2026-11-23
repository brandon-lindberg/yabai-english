-- A database may have recorded the first, flashcard-only version of the streak
-- migration. Fresh databases already have the complete schema and skip this repair.
DO $repair$
DECLARE
    activity record;
BEGIN
    IF to_regclass('"StudyStreakDay"') IS NOT NULL
        AND to_regclass('eligible_learning_lesson') IS NOT NULL
        AND to_regprocedure('study_calendar_timezone(text,"LearningLanguage")') IS NOT NULL
        AND EXISTS (SELECT 1 FROM pg_trigger WHERE tgrelid = to_regclass('"StudyStreakDay"')
                    AND tgname = 'study_streak_on_new_day' AND tgenabled = 'O')
        AND EXISTS (SELECT 1 FROM pg_trigger WHERE tgrelid = to_regclass('"LearningAchievementStudyDay"')
                    AND tgname = 'study_streak_on_qualification' AND tgenabled = 'O')
        AND EXISTS (SELECT 1 FROM pg_trigger WHERE tgrelid = to_regclass('"AchievementWork"')
                    AND tgname = 'study_streak_on_completed_lesson' AND tgenabled = 'O')
    THEN
        RETURN;
    END IF;

    PERFORM set_config('lock_timeout', '5s', true);
    LOCK TABLE "LearningAchievementStudyDay", "AchievementWork", "StudyStreak" IN SHARE ROW EXCLUSIVE MODE;

    CREATE TABLE IF NOT EXISTS "StudyStreakDay" (
        "userId" TEXT NOT NULL REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE,
        "learningLanguage" "LearningLanguage" NOT NULL,
        day DATE NOT NULL,
        timezone TEXT NOT NULL,
        PRIMARY KEY ("userId", "learningLanguage", day)
    );

    -- Merge facts with the summary trigger detached. This also allows an upgrade
    -- from a schema where the day table is present but a required object is missing.
    DROP TRIGGER IF EXISTS study_streak_on_new_day ON "StudyStreakDay";

    -- Pin the same study calendar once either source records activity.
    CREATE OR REPLACE FUNCTION study_calendar_timezone(owner_id text, subject "LearningLanguage")
    RETURNS text LANGUAGE sql STABLE AS $$
        SELECT COALESCE(
            (SELECT timezone FROM "LearningAchievementStudyDay"
             WHERE "userId" = owner_id AND "learningLanguage" = subject ORDER BY day DESC LIMIT 1),
            (SELECT timezone FROM "StudyStreakDay"
             WHERE "userId" = owner_id AND "learningLanguage" = subject ORDER BY day DESC LIMIT 1),
            (SELECT achievement_timezone(timezone) FROM "StudentProfile" WHERE "userId" = owner_id),
            'Asia/Tokyo');
    $$;

    -- Keep one bounded summary for each subject. priorWeeks holds the consecutive
    -- completed weeks before the latest study week, for each possible goal (1–7).
    CREATE OR REPLACE FUNCTION advance_study_streak(owner_id text, subject "LearningLanguage", studied_on date)
    RETURNS void LANGUAGE plpgsql AS $$
    DECLARE
        progress "StudyStreak"%ROWTYPE;
        previous_day date;
        week_distance integer;
    BEGIN
        INSERT INTO "StudyStreak" ("userId", "learningLanguage")
        VALUES (owner_id, subject) ON CONFLICT DO NOTHING;
        SELECT * INTO STRICT progress FROM "StudyStreak"
        WHERE "userId" = owner_id AND "learningLanguage" = subject FOR UPDATE;

        IF studied_on <= progress."lastStudyDay" THEN
            -- Requests committed across midnight can arrive out of order. The
            -- daily facts remain authoritative, so repair this learner once.
            UPDATE "StudyStreak" SET "lastStudyDay" = NULL, daily = 0, monthly = 0, "weekDays" = 0,
                "priorWeeks" = ARRAY[0, 0, 0, 0, 0, 0, 0]
            WHERE "userId" = owner_id AND "learningLanguage" = subject;
            FOR previous_day IN
                SELECT day FROM "StudyStreakDay"
                WHERE "userId" = owner_id AND "learningLanguage" = subject
                ORDER BY day
            LOOP
                PERFORM advance_study_streak(owner_id, subject, previous_day);
            END LOOP;
            RETURN;
        END IF;

        week_distance := date_trunc('week', studied_on::timestamp)::date
            - date_trunc('week', progress."lastStudyDay"::timestamp)::date;
        UPDATE "StudyStreak" SET
            "lastStudyDay" = studied_on,
            daily = CASE WHEN studied_on = progress."lastStudyDay" + 1 THEN progress.daily + 1 ELSE 1 END,
            monthly = CASE
                WHEN date_trunc('month', studied_on::timestamp) = date_trunc('month', progress."lastStudyDay"::timestamp) THEN progress.monthly
                WHEN date_trunc('month', studied_on::timestamp) = date_trunc('month', progress."lastStudyDay"::timestamp) + interval '1 month' THEN progress.monthly + 1
                ELSE 1 END,
            "weekDays" = CASE WHEN week_distance = 0 THEN progress."weekDays" + 1 ELSE 1 END,
            "priorWeeks" = CASE WHEN week_distance = 0 THEN progress."priorWeeks" ELSE
                ARRAY(SELECT CASE WHEN week_distance = 7 AND progress."weekDays" >= goal
                    THEN progress."priorWeeks"[goal] + 1 ELSE 0 END FROM generate_series(1, 7) AS goal ORDER BY goal) END
        WHERE "userId" = owner_id AND "learningLanguage" = subject;
    END;
    $$;

    CREATE OR REPLACE FUNCTION study_streak_on_new_day() RETURNS trigger LANGUAGE plpgsql AS $$
    BEGIN
        PERFORM advance_study_streak(NEW."userId", NEW."learningLanguage", NEW.day);
        RETURN NULL;
    END;
    $$;

    CREATE OR REPLACE FUNCTION study_streak_on_qualification() RETURNS trigger LANGUAGE plpgsql AS $$
    BEGIN
        IF cardinality(NEW."cardIds") >= 5 AND
            (TG_OP = 'INSERT' OR cardinality(OLD."cardIds") < 5) THEN
            INSERT INTO "StudyStreakDay" ("userId", "learningLanguage", day, timezone)
            VALUES (NEW."userId", NEW."learningLanguage", NEW.day, NEW.timezone)
            ON CONFLICT DO NOTHING;
        END IF;
        RETURN NULL;
    END;
    $$;

    CREATE OR REPLACE TRIGGER study_streak_on_qualification
    AFTER INSERT OR UPDATE OF "cardIds" ON "LearningAchievementStudyDay"
    FOR EACH ROW EXECUTE FUNCTION study_streak_on_qualification();

    CREATE OR REPLACE VIEW eligible_learning_lesson AS
        SELECT b.id, b."studentId", b."learningLanguage", COALESCE(g."endsAt", b."endsAt") AS "endsAt"
        FROM "Booking" b
        LEFT JOIN "GroupLessonSession" g ON g.id = b."groupLessonSessionId"
        WHERE b.status IN ('CONFIRMED', 'COMPLETED');

    CREATE OR REPLACE FUNCTION study_streak_on_completed_lesson() RETURNS trigger LANGUAGE plpgsql AS $$
    DECLARE
        subject "LearningLanguage";
        lesson_end timestamp;
        calendar_zone text;
    BEGIN
        IF OLD."leaseUntil" IS NULL OR OLD.scope = 'TEACHING' OR OLD.source NOT LIKE 'lesson:%' THEN RETURN NULL; END IF;

        subject := CASE OLD.scope WHEN 'LEARN_JAPANESE' THEN 'JAPANESE' ELSE 'ENGLISH' END;
        SELECT "endsAt" INTO lesson_end FROM eligible_learning_lesson
        WHERE id = substring(OLD.source FROM 8) AND "studentId" = OLD."userId" AND "learningLanguage" = subject
          AND EXISTS (SELECT 1 FROM "User" WHERE id = OLD."userId");

        -- A leased job was already due when it was picked up. Recheck status and
        -- the retained end time because the booking may have changed since then.
        IF lesson_end IS NOT NULL AND lesson_end <= GREATEST(OLD."dueAt", statement_timestamp() AT TIME ZONE 'UTC') THEN
            calendar_zone := study_calendar_timezone(OLD."userId", subject);
            INSERT INTO "StudyStreakDay" ("userId", "learningLanguage", day, timezone)
            VALUES (OLD."userId", subject, ((lesson_end AT TIME ZONE 'UTC') AT TIME ZONE calendar_zone)::date, calendar_zone)
            ON CONFLICT DO NOTHING;
        END IF;
        RETURN NULL;
    END;
    $$;

    CREATE OR REPLACE TRIGGER study_streak_on_completed_lesson AFTER DELETE ON "AchievementWork"
    FOR EACH ROW EXECUTE FUNCTION study_streak_on_completed_lesson();

    -- Replay recorded qualifying dates and lessons that had already ended.
    WITH lesson_owners AS MATERIALIZED (
        SELECT DISTINCT "studentId", "learningLanguage"
        FROM eligible_learning_lesson
        WHERE "endsAt" <= statement_timestamp() AT TIME ZONE 'UTC'
    ), calendar_zones AS MATERIALIZED (
        SELECT *, study_calendar_timezone("studentId", "learningLanguage") AS timezone FROM lesson_owners
    ), dates AS (
        SELECT "userId", "learningLanguage", day, timezone FROM "LearningAchievementStudyDay"
        WHERE cardinality("cardIds") >= 5
        UNION ALL
        SELECT z."studentId", z."learningLanguage", ((l."endsAt" AT TIME ZONE 'UTC') AT TIME ZONE z.timezone)::date, z.timezone
        FROM calendar_zones z JOIN eligible_learning_lesson l USING ("studentId", "learningLanguage")
        WHERE l."endsAt" <= statement_timestamp() AT TIME ZONE 'UTC'
    )
    INSERT INTO "StudyStreakDay" ("userId", "learningLanguage", day, timezone)
    SELECT "userId", "learningLanguage", day, min(timezone) FROM dates
    GROUP BY "userId", "learningLanguage", day
    ON CONFLICT DO NOTHING;

    -- Rebuild counters from the merged dates while preserving the saved
    -- mode, weekly goal, and visibility for every learner and subject.
    UPDATE "StudyStreak" SET "lastStudyDay" = NULL, daily = 0, monthly = 0,
        "weekDays" = 0, "priorWeeks" = ARRAY[0, 0, 0, 0, 0, 0]
    WHERE "lastStudyDay" IS NOT NULL;
    FOR activity IN
        SELECT "userId", "learningLanguage", day FROM "StudyStreakDay"
        ORDER BY "userId", "learningLanguage", day
    LOOP
        PERFORM advance_study_streak(activity."userId", activity."learningLanguage", activity.day);
    END LOOP;

    CREATE TRIGGER study_streak_on_new_day AFTER INSERT ON "StudyStreakDay"
    FOR EACH ROW EXECUTE FUNCTION study_streak_on_new_day();
END;
$repair$;
