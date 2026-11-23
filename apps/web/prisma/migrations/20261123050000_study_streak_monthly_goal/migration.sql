BEGIN;
SET LOCAL lock_timeout = '5s';
LOCK TABLE "StudyStreakDay" IN SHARE ROW EXCLUSIVE MODE;

ALTER TABLE "StudyStreak"
    ADD COLUMN "monthlyGoal" integer NOT NULL DEFAULT 1 CHECK ("monthlyGoal" BETWEEN 1 AND 31),
    ADD COLUMN "monthDays" integer NOT NULL DEFAULT 0,
    ADD COLUMN "priorMonths" integer[] NOT NULL DEFAULT ARRAY[
        0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
        0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0
    ];

-- A learner who studies every day in a short month meets any configured goal.
CREATE FUNCTION study_streak_month_capacity(active_days integer, first_day date)
RETURNS integer LANGUAGE sql IMMUTABLE STRICT AS $$
    SELECT CASE WHEN active_days = EXTRACT(DAY FROM first_day + interval '1 month' - interval '1 day')
        THEN 31 ELSE active_days END;
$$;

-- Aggregate the day ledger once. For each possible goal, a missing month or a
-- month below the goal ends the run. The latest month is counted at read time.
WITH months AS (
    SELECT "userId", "learningLanguage", date_trunc('month', day::timestamp)::date AS month_start,
        count(*)::int AS active_days
    FROM "StudyStreakDay"
    GROUP BY "userId", "learningLanguage", month_start
), history AS (
    SELECT *, EXTRACT(YEAR FROM month_start)::int * 12 + EXTRACT(MONTH FROM month_start)::int AS month_index,
        study_streak_month_capacity(active_days, month_start) AS capacity
    FROM months
), ordered AS (
    SELECT *, (row_number() OVER recent - 1)::int AS position,
        first_value(month_index) OVER recent - month_index AS gap
    FROM history
    WINDOW recent AS (PARTITION BY "userId", "learningLanguage" ORDER BY month_start DESC)
), runs AS (
    SELECT "userId", "learningLanguage", goal,
        max(active_days) FILTER (WHERE position = 0) AS active_days,
        COALESCE(min(position) FILTER (WHERE position > 0 AND (gap <> position OR capacity < goal)) - 1,
            max(position)) AS completed
    FROM ordered CROSS JOIN generate_series(1, 31) AS goal
    GROUP BY "userId", "learningLanguage", goal
), summaries AS (
    SELECT "userId", "learningLanguage", max(active_days) AS active_days,
        array_agg(completed ORDER BY goal) AS prior
    FROM runs
    GROUP BY "userId", "learningLanguage"
)
UPDATE "StudyStreak" s SET "monthDays" = m.active_days, "priorMonths" = m.prior
FROM summaries m WHERE s."userId" = m."userId" AND s."learningLanguage" = m."learningLanguage";

CREATE OR REPLACE FUNCTION advance_study_streak(owner_id text, subject "LearningLanguage", studied_on date)
RETURNS void LANGUAGE plpgsql AS $$
DECLARE
    progress "StudyStreak"%ROWTYPE;
    previous_day date;
    week_distance integer;
    previous_month date;
    current_month date;
    month_capacity integer;
BEGIN
    INSERT INTO "StudyStreak" ("userId", "learningLanguage")
    VALUES (owner_id, subject) ON CONFLICT DO NOTHING;
    SELECT * INTO STRICT progress FROM "StudyStreak"
    WHERE "userId" = owner_id AND "learningLanguage" = subject FOR UPDATE;

    IF studied_on <= progress."lastStudyDay" THEN
        -- Delayed activity can repair a gap for any of the available goals.
        UPDATE "StudyStreak" SET "lastStudyDay" = NULL, daily = 0, monthly = 0,
            "weekDays" = 0, "priorWeeks" = DEFAULT, "monthDays" = 0, "priorMonths" = DEFAULT
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
    previous_month := date_trunc('month', progress."lastStudyDay"::timestamp)::date;
    current_month := date_trunc('month', studied_on::timestamp)::date;
    IF current_month = previous_month + interval '1 month' THEN
        month_capacity := study_streak_month_capacity(progress."monthDays", previous_month);
    END IF;

    UPDATE "StudyStreak" SET
        "lastStudyDay" = studied_on,
        daily = CASE WHEN studied_on = progress."lastStudyDay" + 1 THEN progress.daily + 1 ELSE 1 END,
        monthly = CASE WHEN current_month = previous_month THEN progress.monthly
            WHEN month_capacity IS NOT NULL THEN progress.monthly + 1 ELSE 1 END,
        "weekDays" = CASE WHEN week_distance = 0 THEN progress."weekDays" + 1 ELSE 1 END,
        "priorWeeks" = CASE WHEN week_distance = 0 THEN progress."priorWeeks" ELSE
            ARRAY(SELECT CASE WHEN week_distance = 7 AND progress."weekDays" >= goal
                THEN progress."priorWeeks"[goal] + 1 ELSE 0 END FROM generate_series(1, 7) AS goal ORDER BY goal) END,
        "monthDays" = CASE WHEN current_month = previous_month THEN progress."monthDays" + 1 ELSE 1 END,
        "priorMonths" = CASE
            WHEN current_month = previous_month THEN progress."priorMonths"
            WHEN month_capacity IS NULL THEN array_fill(0, ARRAY[31])
            ELSE ARRAY(SELECT CASE WHEN month_capacity >= goal THEN progress."priorMonths"[goal] + 1
                ELSE 0 END FROM generate_series(1, 31) AS goal ORDER BY goal) END
    WHERE "userId" = owner_id AND "learningLanguage" = subject;
END;
$$;
COMMIT;
