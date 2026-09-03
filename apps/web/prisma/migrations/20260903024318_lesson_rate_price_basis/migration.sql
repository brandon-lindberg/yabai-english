-- CreateEnum
CREATE TYPE "LessonRatePriceBasis" AS ENUM ('TAX_INCLUDED', 'TAX_EXCLUSIVE');

-- AlterTable
ALTER TABLE "TeacherLessonOffering" ADD COLUMN     "ratePriceBasis" "LessonRatePriceBasis" NOT NULL DEFAULT 'TAX_INCLUDED';
