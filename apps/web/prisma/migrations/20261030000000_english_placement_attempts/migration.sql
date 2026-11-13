-- Additive: historical profile results and all Japanese assessment data are untouched.
CREATE TYPE "EnglishPlacementAttemptStatus" AS ENUM ('IN_PROGRESS', 'COMPLETED', 'ABANDONED');

CREATE TABLE "EnglishPlacementBankSnapshot" (
  "id" TEXT NOT NULL,
  "digest" TEXT NOT NULL,
  "content" JSONB NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "EnglishPlacementBankSnapshot_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "EnglishPlacementBankSnapshot_digest_key" ON "EnglishPlacementBankSnapshot"("digest");

CREATE TABLE "EnglishPlacementAttempt" (
  "id" TEXT NOT NULL,
  "learnerId" TEXT NOT NULL,
  "activeLearnerId" TEXT,
  "bankSnapshotId" TEXT NOT NULL,
  "schemaVersion" INTEGER NOT NULL,
  "scoringVersion" INTEGER NOT NULL,
  "routingRevision" TEXT NOT NULL,
  "status" "EnglishPlacementAttemptStatus" NOT NULL DEFAULT 'IN_PROGRESS',
  "revision" INTEGER NOT NULL DEFAULT 0,
  "state" JSONB NOT NULL,
  "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "expiresAt" TIMESTAMP(3) NOT NULL,
  "finishedAt" TIMESTAMP(3),
  "result" JSONB,
  CONSTRAINT "EnglishPlacementAttempt_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "EnglishPlacementAttempt_learnerId_fkey" FOREIGN KEY ("learnerId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "EnglishPlacementAttempt_bankSnapshotId_fkey" FOREIGN KEY ("bankSnapshotId") REFERENCES "EnglishPlacementBankSnapshot"("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
CREATE UNIQUE INDEX "EnglishPlacementAttempt_activeLearnerId_key" ON "EnglishPlacementAttempt"("activeLearnerId");
CREATE INDEX "EnglishPlacementAttempt_learnerId_startedAt_idx" ON "EnglishPlacementAttempt"("learnerId", "startedAt");

ALTER TABLE "EnglishPlacementAttempt" ADD CONSTRAINT "EnglishPlacementAttempt_state_check" CHECK ((
  "schemaVersion" >= 1 AND "scoringVersion" >= 1 AND "revision" BETWEEN 0 AND 24
  AND "expiresAt" = "startedAt" + INTERVAL '20 minutes'
  AND jsonb_typeof("state"->'asked') = 'array'
  AND jsonb_typeof("state"->'adaptiveState') = 'object'
  AND jsonb_typeof("state"->'currentQuestionId') IN ('string', 'null')
  AND jsonb_array_length("state"->'asked') = "revision"
  AND (("status" = 'IN_PROGRESS' AND "activeLearnerId" = "learnerId" AND "activeLearnerId" IS NOT NULL AND "finishedAt" IS NULL AND "result" IS NULL)
    OR ("status" <> 'IN_PROGRESS' AND "activeLearnerId" IS NULL AND "finishedAt" IS NOT NULL AND "result" IS NOT NULL))
) IS TRUE);

CREATE FUNCTION "protectEnglishPlacementBank"() RETURNS trigger
LANGUAGE plpgsql SET search_path FROM CURRENT AS $$
BEGIN
  IF NEW IS DISTINCT FROM OLD THEN RAISE EXCEPTION 'English placement bank snapshots are immutable'; END IF;
  RETURN NEW;
END;
$$;
CREATE TRIGGER "EnglishPlacementBankSnapshot_immutable" BEFORE UPDATE ON "EnglishPlacementBankSnapshot"
  FOR EACH ROW EXECUTE FUNCTION "protectEnglishPlacementBank"();

CREATE FUNCTION "protectEnglishPlacementAttempt"() RETURNS trigger
LANGUAGE plpgsql SET search_path FROM CURRENT AS $$
DECLARE position INTEGER; accepted JSONB;
BEGIN
  IF OLD."status" <> 'IN_PROGRESS' OR ROW(NEW."id", NEW."learnerId", NEW."bankSnapshotId", NEW."schemaVersion", NEW."scoringVersion", NEW."routingRevision", NEW."startedAt", NEW."expiresAt")
    IS DISTINCT FROM ROW(OLD."id", OLD."learnerId", OLD."bankSnapshotId", OLD."schemaVersion", OLD."scoringVersion", OLD."routingRevision", OLD."startedAt", OLD."expiresAt") THEN
    RAISE EXCEPTION 'English placement identity, deadline and terminal receipts are immutable';
  END IF;
  IF NEW."revision" < OLD."revision" OR NEW."revision" > OLD."revision" + 1 THEN RAISE EXCEPTION 'English placement answers must be appended one at a time'; END IF;
  IF NEW."revision" = OLD."revision" AND NEW."state" IS DISTINCT FROM OLD."state" THEN RAISE EXCEPTION 'English placement accepted state is immutable'; END IF;
  IF OLD."revision" > 0 THEN
    FOR position IN 0..OLD."revision" - 1 LOOP
      IF NEW."state"->'asked'->position IS DISTINCT FROM OLD."state"->'asked'->position THEN RAISE EXCEPTION 'English placement accepted answers are immutable'; END IF;
    END LOOP;
  END IF;
  IF NEW."revision" > OLD."revision" THEN
    accepted := NEW."state"->'asked'->OLD."revision";
    IF NEW."status" <> 'IN_PROGRESS' OR OLD."state"->>'currentQuestionId' IS NULL OR accepted->>'id' IS DISTINCT FROM OLD."state"->>'currentQuestionId'
      OR accepted->>'acceptedAt' IS NULL OR accepted->>'answer' IS NULL OR (accepted->>'answer')::integer NOT BETWEEN 0 AND 2
      OR (accepted->>'acceptedAt')::numeric < extract(epoch from NEW."startedAt") * 1000
      OR (accepted->>'acceptedAt')::numeric >= extract(epoch from NEW."expiresAt") * 1000 THEN
      RAISE EXCEPTION 'English placement answer outside issued question or deadline';
    END IF;
  END IF;
  RETURN NEW;
END;
$$;
CREATE TRIGGER "EnglishPlacementAttempt_immutable" BEFORE UPDATE ON "EnglishPlacementAttempt"
  FOR EACH ROW EXECUTE FUNCTION "protectEnglishPlacementAttempt"();
