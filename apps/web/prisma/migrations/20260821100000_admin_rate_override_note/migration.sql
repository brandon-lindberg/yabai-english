-- Why a below-minimum rate was granted. The rate itself is an exception to a
-- stated rule; this is the only record of the reason behind it.
-- AlterTable
ALTER TABLE "TeacherLessonOffering" ADD COLUMN "adminRateOverrideNote" TEXT;
