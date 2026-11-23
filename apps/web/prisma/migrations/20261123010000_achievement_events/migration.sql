CREATE TABLE "LearningAchievementStudyDay" (
  "userId" TEXT NOT NULL REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  "learningLanguage" "LearningLanguage" NOT NULL,
  "day" DATE NOT NULL,
  "timezone" TEXT NOT NULL,
  "cardIds" TEXT[] NOT NULL,
  PRIMARY KEY ("userId", "learningLanguage", "day")
);

CREATE TABLE "AchievementTracking" (
  id INTEGER PRIMARY KEY,
  "startedAt" TIMESTAMP(3) NOT NULL
);
INSERT INTO "AchievementTracking" (id, "startedAt") VALUES (1, statement_timestamp() AT TIME ZONE 'UTC');

CREATE TABLE "AchievementWork" (
  "userId" TEXT NOT NULL REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  "scope" "AchievementScope" NOT NULL,
  "source" TEXT NOT NULL,
  "dueAt" TIMESTAMP(3) NOT NULL,
  "leaseUntil" TIMESTAMP(3),
  PRIMARY KEY ("userId", "scope", "source")
);
CREATE INDEX "AchievementWork_dueAt_idx" ON "AchievementWork" ("dueAt");

CREATE FUNCTION achievement_timezone(zone_name text)
RETURNS text LANGUAGE plpgsql STABLE STRICT AS $$
BEGIN
  PERFORM timezone(zone_name, timestamp '2000-01-01');
  RETURN zone_name;
EXCEPTION WHEN invalid_parameter_value THEN
  RETURN NULL;
END;
$$;

CREATE FUNCTION queue_achievement_work(owner_id text, collection "AchievementScope", source_key text, due timestamp)
RETURNS void LANGUAGE sql AS $$
  INSERT INTO "AchievementWork" ("userId", "scope", "source", "dueAt")
  VALUES (owner_id, collection, source_key, due)
  ON CONFLICT ("userId", "scope", "source") DO UPDATE
  SET "dueAt" = EXCLUDED."dueAt", "leaseUntil" = NULL;
$$;

CREATE FUNCTION achievement_booking_work() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE
  teacher_user text;
  learner_scope "AchievementScope";
  lesson_end timestamp;
  event_time timestamp := statement_timestamp() AT TIME ZONE 'UTC';
BEGIN
  IF TG_OP = 'UPDATE' AND (NEW.status, NEW."endsAt", NEW."groupLessonSessionId", NEW."completionNotesMd") IS NOT DISTINCT FROM
     (OLD.status, OLD."endsAt", OLD."groupLessonSessionId", OLD."completionNotesMd") THEN RETURN NULL; END IF;
  SELECT "userId" INTO teacher_user FROM "TeacherProfile" WHERE id = NEW."teacherId";
  IF NEW.status IN ('CONFIRMED', 'COMPLETED') THEN
    SELECT COALESCE((SELECT "endsAt" FROM "GroupLessonSession" WHERE id = NEW."groupLessonSessionId"), NEW."endsAt") INTO lesson_end;
    learner_scope := CASE NEW."learningLanguage" WHEN 'JAPANESE' THEN 'LEARN_JAPANESE' ELSE 'LEARN_ENGLISH' END;
    PERFORM queue_achievement_work(NEW."studentId", learner_scope, 'lesson:' || NEW.id, lesson_end);
    IF teacher_user IS NOT NULL THEN
      PERFORM queue_achievement_work(teacher_user, 'TEACHING', 'lesson:' || NEW.id, lesson_end);
      IF (TG_OP = 'INSERT' OR OLD.status NOT IN ('CONFIRMED', 'COMPLETED')) AND NOT EXISTS (
        SELECT 1 FROM "TeachingAchievementAward" WHERE "userId" = teacher_user AND "achievementId" = 'teach-booked'
      ) THEN
        PERFORM queue_achievement_work(teacher_user, 'TEACHING', 'booking', event_time);
      END IF;
    END IF;
  ELSIF TG_OP = 'UPDATE' AND OLD.status IN ('CONFIRMED', 'COMPLETED') THEN
    DELETE FROM "AchievementWork"
    WHERE "source" = 'lesson:' || OLD.id AND "userId" IN (OLD."studentId", teacher_user);
  END IF;
  RETURN NULL;
END;
$$;
CREATE TRIGGER achievement_booking_work AFTER INSERT OR UPDATE OF status, "endsAt", "groupLessonSessionId", "completionNotesMd"
ON "Booking" FOR EACH ROW EXECUTE FUNCTION achievement_booking_work();

CREATE FUNCTION achievement_profile_work() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM "TeachingAchievementAward" WHERE "userId" = NEW."userId" AND "achievementId" = 'teach-profile') THEN
    PERFORM queue_achievement_work(NEW."userId", 'TEACHING', 'profile', statement_timestamp() AT TIME ZONE 'UTC');
  END IF;
  RETURN NULL;
END;
$$;
CREATE TRIGGER achievement_profile_work AFTER INSERT OR UPDATE OF "displayName", bio, "instructionLanguages"
ON "TeacherProfile" FOR EACH ROW EXECUTE FUNCTION achievement_profile_work();

CREATE FUNCTION achievement_reply_work() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF EXISTS (SELECT 1 FROM "ChatThread" WHERE id = NEW."threadId" AND "teacherId" = NEW."senderId" AND "studentId" = NEW."recipientId")
    AND NOT EXISTS (SELECT 1 FROM "TeachingAchievementAward" WHERE "userId" = NEW."senderId" AND "achievementId" = 'teach-hidden-reply') THEN
    PERFORM queue_achievement_work(NEW."senderId", 'TEACHING', 'reply', statement_timestamp() AT TIME ZONE 'UTC');
  END IF;
  RETURN NULL;
END;
$$;
CREATE TRIGGER achievement_reply_work AFTER INSERT ON "ChatMessage"
FOR EACH ROW EXECUTE FUNCTION achievement_reply_work();

-- Already scheduled lessons need the same end-time checks after deployment.
INSERT INTO "AchievementWork" ("userId", "scope", "source", "dueAt")
SELECT actor."userId", actor.scope::"AchievementScope", 'lesson:' || b.id, COALESCE(g."endsAt", b."endsAt")
FROM "Booking" b
JOIN "TeacherProfile" t ON t.id = b."teacherId"
LEFT JOIN "GroupLessonSession" g ON g.id = b."groupLessonSessionId"
CROSS JOIN LATERAL (VALUES (b."studentId", CASE b."learningLanguage" WHEN 'JAPANESE' THEN 'LEARN_JAPANESE' ELSE 'LEARN_ENGLISH' END),
  (t."userId", 'TEACHING')) actor("userId", scope)
WHERE b.status IN ('CONFIRMED', 'COMPLETED') AND COALESCE(g."endsAt", b."endsAt") > statement_timestamp() AT TIME ZONE 'UTC';
