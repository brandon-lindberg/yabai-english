-- Additive upgrade: existing v2 attempts/results keep their original interpretation.
ALTER TABLE "JapanesePlacementAttempt"
  ADD COLUMN "expiresAt" TIMESTAMP(3),
  ADD COLUMN "policyRevision" TEXT,
  ADD COLUMN "questionLimit" INTEGER,
  ADD CONSTRAINT "JapanesePlacementAttempt_timing_check" CHECK (
    ("schemaVersion" < 3 AND "expiresAt" IS NULL AND "policyRevision" IS NULL AND "questionLimit" IS NULL) OR
    ("schemaVersion" = 3 AND "expiresAt" IS NOT NULL AND "policyRevision" IS NOT NULL AND "questionLimit" IS NOT NULL
      AND "expiresAt" = "startedAt" + INTERVAL '20 minutes'
      AND "policyRevision" = 'japanese-posterior-v1' AND "questionLimit" BETWEEN 6 AND 60)
  );

CREATE OR REPLACE FUNCTION "protectJapanesePlacementAttempt"() RETURNS trigger
LANGUAGE plpgsql SET search_path FROM CURRENT AS $$
BEGIN
  IF OLD."status" <> 'IN_PROGRESS' OR ROW(NEW."id", NEW."learnerId", NEW."bankSnapshotId", NEW."requestId", NEW."schemaVersion", NEW."scoringRevision", NEW."startedAt", NEW."expiresAt", NEW."policyRevision", NEW."questionLimit")
    IS DISTINCT FROM ROW(OLD."id", OLD."learnerId", OLD."bankSnapshotId", OLD."requestId", OLD."schemaVersion", OLD."scoringRevision", OLD."startedAt", OLD."expiresAt", OLD."policyRevision", OLD."questionLimit") THEN
    RAISE EXCEPTION 'Japanese placement attempt identity, deadline and finished results are immutable';
  END IF;
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION "protectJapanesePlacementResponse"() RETURNS trigger
LANGUAGE plpgsql SET search_path FROM CURRENT AS $$
DECLARE attempt_row "JapanesePlacementAttempt"%ROWTYPE;
BEGIN
  IF TG_OP = 'UPDATE' THEN RAISE EXCEPTION 'Japanese placement responses are immutable'; END IF;
  SELECT * INTO attempt_row FROM "JapanesePlacementAttempt" WHERE "id" = NEW."attemptId" FOR UPDATE;
  IF attempt_row."status" IS DISTINCT FROM 'IN_PROGRESS'::"JapanesePlacementAttemptStatus" THEN
    RAISE EXCEPTION 'Japanese placement responses require an active attempt';
  END IF;
  IF attempt_row."schemaVersion" = 3 AND (
    NEW."position" >= attempt_row."questionLimit" OR NEW."payload"->>'submittedAt' IS NULL OR
    (NEW."payload"->>'submittedAt')::timestamptz < attempt_row."startedAt" AT TIME ZONE 'UTC' OR
    (NEW."payload"->>'submittedAt')::timestamptz >= attempt_row."expiresAt" AT TIME ZONE 'UTC'
  ) THEN
    RAISE EXCEPTION 'Japanese placement response outside attempt budget or deadline';
  END IF;
  RETURN NEW;
END;
$$;
