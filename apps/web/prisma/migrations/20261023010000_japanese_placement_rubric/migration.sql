-- Extend the existing Japanese snapshot/attempt guards for the v5 rubric policy.
-- No stored snapshot, response or completed result is rewritten.
ALTER TABLE "JapanesePlacementBankSnapshot"
  DROP CONSTRAINT "JapanesePlacementBankSnapshot_content_check",
  ADD CONSTRAINT "JapanesePlacementBankSnapshot_content_check" CHECK (
    "version" > 0 AND "itemCount" BETWEEN 6 AND 1000 AND "digest" ~ '^[a-f0-9]{64}$'
    AND jsonb_typeof("content") = 'object'
    AND (CASE WHEN "content"->>'schemaVersion' IN ('4', '5') THEN
      jsonb_typeof("content"->'items') = 'array' AND jsonb_array_length("content"->'items') = "itemCount"
      ELSE "itemCount" <= 120 END) IS TRUE
  );

ALTER TABLE "JapanesePlacementAttempt"
  DROP CONSTRAINT "JapanesePlacementAttempt_timing_check",
  ADD CONSTRAINT "JapanesePlacementAttempt_timing_check" CHECK (
    ("schemaVersion" < 3 AND "expiresAt" IS NULL AND "policyRevision" IS NULL AND "questionLimit" IS NULL) OR
    ("schemaVersion" IN (3, 4, 5) AND "expiresAt" IS NOT NULL AND "policyRevision" IS NOT NULL AND "questionLimit" IS NOT NULL
      AND "expiresAt" = "startedAt" + INTERVAL '20 minutes' AND "questionLimit" BETWEEN 6 AND 60
      AND (("schemaVersion" = 3 AND "policyRevision" = 'japanese-posterior-v1') OR
        ("schemaVersion" = 4 AND "policyRevision" = 'japanese-posterior-passages-v2'
          AND "scoringRevision" = 'japanese-reading-writing-passages-v2') OR
        ("schemaVersion" = 5 AND "policyRevision" = 'japanese-jlpt-rubric-v1'
          AND "scoringRevision" = 'japanese-reading-writing-rubric-v1')))
  );

-- Replace the same trigger function: one set of runtime guards serves all supported versions.
CREATE OR REPLACE FUNCTION "protectJapanesePlacementResponse"() RETURNS trigger
LANGUAGE plpgsql SET search_path FROM CURRENT AS $$
DECLARE
  attempt_row "JapanesePlacementAttempt"%ROWTYPE;
  snapshot_content JSONB;
  passage_id TEXT;
BEGIN
  IF TG_OP = 'UPDATE' THEN RAISE EXCEPTION 'Japanese placement responses are immutable'; END IF;
  SELECT * INTO attempt_row FROM "JapanesePlacementAttempt" WHERE "id" = NEW."attemptId" FOR UPDATE;
  IF attempt_row."status" IS DISTINCT FROM 'IN_PROGRESS'::"JapanesePlacementAttemptStatus" THEN
    RAISE EXCEPTION 'Japanese placement responses require an active attempt';
  END IF;
  IF attempt_row."schemaVersion" IN (3, 4, 5) AND (
    NEW."position" >= attempt_row."questionLimit" OR NEW."payload"->>'submittedAt' IS NULL OR
    (NEW."payload"->>'submittedAt')::timestamptz < attempt_row."startedAt" AT TIME ZONE 'UTC' OR
    (NEW."payload"->>'submittedAt')::timestamptz >= attempt_row."expiresAt" AT TIME ZONE 'UTC'
  ) THEN
    RAISE EXCEPTION 'Japanese placement response outside attempt budget or deadline';
  END IF;
  IF attempt_row."schemaVersion" IN (4, 5) THEN
    SELECT "content" INTO snapshot_content FROM "JapanesePlacementBankSnapshot" WHERE "id" = attempt_row."bankSnapshotId";
    SELECT item->>'passageId' INTO passage_id FROM jsonb_array_elements(snapshot_content->'items') AS entries(item)
      WHERE item->>'id' = NEW."itemId";
    IF NOT FOUND THEN RAISE EXCEPTION 'Unknown Japanese bank item'; END IF;
    IF passage_id IS NOT NULL AND EXISTS (
      SELECT 1 FROM "JapanesePlacementResponse" response
      JOIN LATERAL jsonb_array_elements(snapshot_content->'items') AS entries(item) ON item->>'id' = response."itemId"
      WHERE response."attemptId" = NEW."attemptId" AND item->>'passageId' = passage_id
    ) THEN
      RAISE EXCEPTION 'Japanese passage already used in this attempt';
    END IF;
  END IF;
  RETURN NEW;
END;
$$;
