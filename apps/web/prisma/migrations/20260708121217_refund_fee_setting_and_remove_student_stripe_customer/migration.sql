/*
  Warnings:

  - You are about to drop the column `stripeCustomerId` on the `StudentProfile` table. All the data in the column will be lost.

*/
-- DropIndex
DROP INDEX "StudentProfile_stripeCustomerId_key";

-- AlterTable
ALTER TABLE "StudentProfile" DROP COLUMN "stripeCustomerId";

-- AlterTable
ALTER TABLE "TeacherProfile" ADD COLUMN     "refundFeePassedToStudent" BOOLEAN NOT NULL DEFAULT false;
