-- Additive practice ledger: existing study data is unchanged.
CREATE TABLE "StudyReviewPrompt" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "cardId" TEXT NOT NULL,
  "catalogSnapshotId" TEXT NOT NULL,
  "contentSha256" TEXT NOT NULL,
  "baseReps" INTEGER NOT NULL,
  "studyBand" "StudyLevelCode" NOT NULL,
  "questionJson" JSONB NOT NULL,
  "answerJson" JSONB NOT NULL,
  "activeKey" TEXT,
  "issuedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "expiresAt" TIMESTAMP(3) NOT NULL,
  "answeredAt" TIMESTAMP(3),
  "choiceId" TEXT,
  "resultJson" JSONB,
  CONSTRAINT "StudyReviewPrompt_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "StudyReviewPrompt_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "StudyReviewPrompt_cardId_fkey" FOREIGN KEY ("cardId") REFERENCES "StudyCard"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "StudyReviewPrompt_catalogSnapshotId_fkey" FOREIGN KEY ("catalogSnapshotId") REFERENCES "StudyCatalogSnapshot"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "StudyReviewPrompt_content_check" CHECK (
    "baseReps" >= 0 AND "contentSha256" ~ '^[a-f0-9]{64}$'
    AND "studyBand" IN ('N5','N4','N3','N2','N1') AND "expiresAt" > "issuedAt"
    AND jsonb_typeof("questionJson") = 'object' AND ("questionJson"->>'id' = "id") IS TRUE
    AND jsonb_typeof("answerJson") = 'object' AND "answerJson"->>'correctChoiceId' IS NOT NULL
  ),
  CONSTRAINT "StudyReviewPrompt_result_check" CHECK (
    ("answeredAt" IS NULL AND "choiceId" IS NULL AND "resultJson" IS NULL) OR
    ("answeredAt" IS NOT NULL AND "choiceId" IS NOT NULL AND "activeKey" IS NULL
      AND "resultJson" IS NOT NULL AND jsonb_typeof("resultJson") = 'object'
      AND "answeredAt" >= "issuedAt" AND "answeredAt" < "expiresAt")
  )
);
CREATE UNIQUE INDEX "StudyReviewPrompt_activeKey_key" ON "StudyReviewPrompt"("activeKey");
CREATE INDEX "StudyReviewPrompt_userId_expiresAt_idx" ON "StudyReviewPrompt"("userId", "expiresAt");
CREATE INDEX "StudyReviewPrompt_userId_cardId_issuedAt_idx" ON "StudyReviewPrompt"("userId", "cardId", "issuedAt");

CREATE FUNCTION "protectStudyReviewPrompt"() RETURNS trigger
LANGUAGE plpgsql SET search_path FROM CURRENT AS $$
BEGIN
  IF OLD."answeredAt" IS NOT NULL OR
    ROW(NEW."id",NEW."userId",NEW."cardId",NEW."catalogSnapshotId",NEW."contentSha256",NEW."baseReps",NEW."studyBand",NEW."questionJson",NEW."answerJson",NEW."issuedAt",NEW."expiresAt")
    IS DISTINCT FROM
    ROW(OLD."id",OLD."userId",OLD."cardId",OLD."catalogSnapshotId",OLD."contentSha256",OLD."baseReps",OLD."studyBand",OLD."questionJson",OLD."answerJson",OLD."issuedAt",OLD."expiresAt")
    OR (NEW."activeKey" IS NOT NULL AND NEW."activeKey" IS DISTINCT FROM OLD."activeKey") THEN
    RAISE EXCEPTION 'Study practice questions and completed results are immutable';
  END IF;
  RETURN NEW;
END;
$$;
CREATE TRIGGER "StudyReviewPrompt_immutable" BEFORE UPDATE ON "StudyReviewPrompt"
FOR EACH ROW EXECUTE FUNCTION "protectStudyReviewPrompt"();
