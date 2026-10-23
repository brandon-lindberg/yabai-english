ALTER TYPE "StudyLevelCode" ADD VALUE 'N5';
ALTER TYPE "StudyLevelCode" ADD VALUE 'N4';
ALTER TYPE "StudyLevelCode" ADD VALUE 'N3';
ALTER TYPE "StudyLevelCode" ADD VALUE 'N2';
ALTER TYPE "StudyLevelCode" ADD VALUE 'N1';
CREATE TYPE "StudyPublicationStatus" AS ENUM ('DRAFT', 'PUBLISHED');
CREATE TYPE "StudyCardKind" AS ENUM ('ENGLISH_EXERCISE', 'JAPANESE_VOCABULARY', 'JAPANESE_KANJI');

-- Preserve every existing identifier, progress value, due date and daily interaction.
ALTER TABLE "StudyTrack" ADD COLUMN "learningLanguage" "LearningLanguage" NOT NULL DEFAULT 'ENGLISH',
  ADD COLUMN "publicationStatus" "StudyPublicationStatus" NOT NULL DEFAULT 'PUBLISHED',
  ADD COLUMN "catalogSnapshotId" TEXT;
ALTER TABLE "StudyCard" ADD COLUMN "kind" "StudyCardKind" NOT NULL DEFAULT 'ENGLISH_EXERCISE',
  ADD COLUMN "contentJson" JSONB;
ALTER TABLE "StudyQuickReviewDay" ADD COLUMN "learningLanguage" "LearningLanguage" NOT NULL DEFAULT 'ENGLISH';
DROP INDEX "StudyQuickReviewDay_userId_dayKey_key";
CREATE UNIQUE INDEX "StudyQuickReviewDay_userId_learningLanguage_dayKey_key" ON "StudyQuickReviewDay"("userId", "learningLanguage", "dayKey");
CREATE INDEX "StudyTrack_learningLanguage_publicationStatus_idx" ON "StudyTrack"("learningLanguage", "publicationStatus");

CREATE TABLE "StudyCatalogSnapshot" (
  "id" TEXT NOT NULL,
  "studyCatalogSha256" TEXT NOT NULL,
  "sourceCatalogSha256" TEXT NOT NULL,
  "sourceLockSha256" TEXT NOT NULL,
  "policySha256" TEXT NOT NULL,
  "provenanceJson" JSONB NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "StudyCatalogSnapshot_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "StudyCatalogSnapshot_studyCatalogSha256_key" ON "StudyCatalogSnapshot"("studyCatalogSha256");
ALTER TABLE "StudyTrack" ADD CONSTRAINT "StudyTrack_catalogSnapshotId_fkey" FOREIGN KEY ("catalogSnapshotId") REFERENCES "StudyCatalogSnapshot"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
