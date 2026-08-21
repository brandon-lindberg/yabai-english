-- A SUPER_ADMIN may grant a teacher a class priced below the public minimum.
-- The granting admin is recorded here; its presence exempts the offering from
-- the minimum and marks it as one the teacher may teach but not author.
-- AlterTable
ALTER TABLE "TeacherLessonOffering" ADD COLUMN "adminRateOverrideByUserId" TEXT;
