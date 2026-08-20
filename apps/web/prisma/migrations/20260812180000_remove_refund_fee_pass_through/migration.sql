-- Refunds are a full unwind: the student is always returned the whole lesson
-- price and the platform returns its entire application fee, so there is no
-- per-teacher share left to configure.
-- AlterTable
ALTER TABLE "TeacherProfile" DROP COLUMN "refundFeePassedToStudent";
