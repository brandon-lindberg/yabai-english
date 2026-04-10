-- CreateEnum
CREATE TYPE "PlacedLevel" AS ENUM ('UNSET', 'BEGINNER', 'INTERMEDIATE', 'ADVANCED');

-- AlterEnum
ALTER TYPE "LessonTier" ADD VALUE 'FREE_TRIAL';

-- AlterTable
ALTER TABLE "StudentProfile" ADD COLUMN     "placedLevel" "PlacedLevel" NOT NULL DEFAULT 'UNSET',
ADD COLUMN     "placementCompletedAt" TIMESTAMP(3),
ADD COLUMN     "trialLessonUsedAt" TIMESTAMP(3);
