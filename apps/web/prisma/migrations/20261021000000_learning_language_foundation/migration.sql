-- Existing accounts, classes and lesson history belong to the English product.
-- UI locale and instructionLanguages intentionally play no part in this backfill.
CREATE TYPE "LearningLanguage" AS ENUM ('ENGLISH', 'JAPANESE');

ALTER TABLE "User"
  ADD COLUMN "learningLanguage" "LearningLanguage" NOT NULL DEFAULT 'ENGLISH';

ALTER TABLE "TeacherLessonOffering"
  ADD COLUMN "learningLanguage" "LearningLanguage" NOT NULL DEFAULT 'ENGLISH';

ALTER TABLE "Booking"
  ADD COLUMN "learningLanguage" "LearningLanguage" NOT NULL DEFAULT 'ENGLISH';

CREATE INDEX "TeacherLessonOffering_teacherId_learningLanguage_active_idx"
  ON "TeacherLessonOffering" ("teacherId", "learningLanguage", "active");
