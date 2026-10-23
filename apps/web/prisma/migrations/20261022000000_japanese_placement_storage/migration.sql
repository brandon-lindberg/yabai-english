CREATE TYPE "JapanesePlacementAttemptStatus" AS ENUM ('IN_PROGRESS', 'COMPLETED', 'ABANDONED');

CREATE TABLE "JapanesePlacementBankSnapshot" (
  "id" TEXT NOT NULL,
  "bankKey" TEXT NOT NULL,
  "version" INTEGER NOT NULL,
  "digest" TEXT NOT NULL,
  "itemCount" INTEGER NOT NULL,
  "content" JSONB NOT NULL,
  "publishedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "revokedAt" TIMESTAMP(3),
  CONSTRAINT "JapanesePlacementBankSnapshot_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "JapanesePlacementBankSnapshot_content_check" CHECK (
    "version" > 0 AND "itemCount" BETWEEN 6 AND 120 AND "digest" ~ '^[a-f0-9]{64}$' AND jsonb_typeof("content") = 'object'
  )
);

CREATE TABLE "JapanesePlacementAttempt" (
  "id" TEXT NOT NULL,
  "learnerId" TEXT NOT NULL,
  "bankSnapshotId" TEXT NOT NULL,
  "requestId" UUID NOT NULL,
  "activeLearnerId" TEXT,
  "schemaVersion" INTEGER NOT NULL,
  "scoringRevision" TEXT NOT NULL,
  "status" "JapanesePlacementAttemptStatus" NOT NULL DEFAULT 'IN_PROGRESS',
  "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "finishedAt" TIMESTAMP(3),
  "result" JSONB,
  CONSTRAINT "JapanesePlacementAttempt_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "JapanesePlacementAttempt_learnerId_fkey" FOREIGN KEY ("learnerId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "JapanesePlacementAttempt_bankSnapshotId_fkey" FOREIGN KEY ("bankSnapshotId") REFERENCES "JapanesePlacementBankSnapshot"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "JapanesePlacementAttempt_state_check" CHECK (
    "schemaVersion" > 0 AND length("scoringRevision") > 0 AND (
      ("status" = 'IN_PROGRESS' AND "activeLearnerId" IS NOT NULL AND "activeLearnerId" = "learnerId" AND "finishedAt" IS NULL AND "result" IS NULL) OR
      ("status" = 'COMPLETED' AND "activeLearnerId" IS NULL AND "finishedAt" IS NOT NULL AND "result" IS NOT NULL AND jsonb_typeof("result") = 'object') OR
      ("status" = 'ABANDONED' AND "activeLearnerId" IS NULL AND "finishedAt" IS NOT NULL AND "result" IS NULL)
    )
  )
);

CREATE TABLE "JapanesePlacementResponse" (
  "id" TEXT NOT NULL,
  "attemptId" TEXT NOT NULL,
  "itemId" TEXT NOT NULL,
  "position" INTEGER NOT NULL,
  "payload" JSONB NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "JapanesePlacementResponse_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "JapanesePlacementResponse_attemptId_fkey" FOREIGN KEY ("attemptId") REFERENCES "JapanesePlacementAttempt"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "JapanesePlacementResponse_payload_check" CHECK (
    "position" >= 0 AND "position" < 120 AND jsonb_typeof("payload") = 'object'
    AND "payload"->>'itemId' IS NOT NULL AND "payload"->>'itemId' = "itemId"
  )
);

CREATE UNIQUE INDEX "JapanesePlacementBankSnapshot_digest_key" ON "JapanesePlacementBankSnapshot"("digest");
CREATE UNIQUE INDEX "JapanesePlacementBankSnapshot_bankKey_version_key" ON "JapanesePlacementBankSnapshot"("bankKey", "version");
CREATE INDEX "JapanesePlacementBankSnapshot_revokedAt_publishedAt_idx" ON "JapanesePlacementBankSnapshot"("revokedAt", "publishedAt");
CREATE UNIQUE INDEX "JapanesePlacementAttempt_activeLearnerId_key" ON "JapanesePlacementAttempt"("activeLearnerId");
CREATE UNIQUE INDEX "JapanesePlacementAttempt_learnerId_requestId_key" ON "JapanesePlacementAttempt"("learnerId", "requestId");
CREATE INDEX "JapanesePlacementAttempt_learnerId_startedAt_idx" ON "JapanesePlacementAttempt"("learnerId", "startedAt");
CREATE UNIQUE INDEX "JapanesePlacementResponse_attemptId_itemId_key" ON "JapanesePlacementResponse"("attemptId", "itemId");
CREATE UNIQUE INDEX "JapanesePlacementResponse_attemptId_position_key" ON "JapanesePlacementResponse"("attemptId", "position");

-- Capture the migration's schema, including during isolated verification.
CREATE FUNCTION "protectJapanesePlacementBankSnapshot"() RETURNS trigger
LANGUAGE plpgsql SET search_path FROM CURRENT AS $$
BEGIN
  IF ROW(NEW."id", NEW."bankKey", NEW."version", NEW."digest", NEW."itemCount", NEW."content", NEW."publishedAt")
    IS DISTINCT FROM ROW(OLD."id", OLD."bankKey", OLD."version", OLD."digest", OLD."itemCount", OLD."content", OLD."publishedAt")
    OR (OLD."revokedAt" IS NOT NULL AND NEW."revokedAt" IS DISTINCT FROM OLD."revokedAt") THEN
    RAISE EXCEPTION 'Japanese placement snapshots are immutable; publish a new version';
  END IF;
  RETURN NEW;
END;
$$;
CREATE TRIGGER "JapanesePlacementBankSnapshot_immutable" BEFORE UPDATE ON "JapanesePlacementBankSnapshot"
FOR EACH ROW EXECUTE FUNCTION "protectJapanesePlacementBankSnapshot"();

CREATE FUNCTION "protectJapanesePlacementAttempt"() RETURNS trigger
LANGUAGE plpgsql SET search_path FROM CURRENT AS $$
BEGIN
  IF OLD."status" <> 'IN_PROGRESS' OR ROW(NEW."id", NEW."learnerId", NEW."bankSnapshotId", NEW."requestId", NEW."schemaVersion", NEW."scoringRevision", NEW."startedAt")
    IS DISTINCT FROM ROW(OLD."id", OLD."learnerId", OLD."bankSnapshotId", OLD."requestId", OLD."schemaVersion", OLD."scoringRevision", OLD."startedAt") THEN
    RAISE EXCEPTION 'Japanese placement attempt identity and finished results are immutable';
  END IF;
  RETURN NEW;
END;
$$;
CREATE TRIGGER "JapanesePlacementAttempt_immutable" BEFORE UPDATE ON "JapanesePlacementAttempt"
FOR EACH ROW EXECUTE FUNCTION "protectJapanesePlacementAttempt"();

CREATE FUNCTION "protectJapanesePlacementResponse"() RETURNS trigger
LANGUAGE plpgsql SET search_path FROM CURRENT AS $$
DECLARE attempt_status "JapanesePlacementAttemptStatus";
BEGIN
  IF TG_OP = 'UPDATE' THEN RAISE EXCEPTION 'Japanese placement responses are immutable'; END IF;
  SELECT "status" INTO attempt_status FROM "JapanesePlacementAttempt" WHERE "id" = NEW."attemptId" FOR UPDATE;
  IF attempt_status IS DISTINCT FROM 'IN_PROGRESS'::"JapanesePlacementAttemptStatus" THEN
    RAISE EXCEPTION 'Japanese placement responses require an active attempt';
  END IF;
  RETURN NEW;
END;
$$;
CREATE TRIGGER "JapanesePlacementResponse_immutable" BEFORE INSERT OR UPDATE ON "JapanesePlacementResponse"
FOR EACH ROW EXECUTE FUNCTION "protectJapanesePlacementResponse"();
