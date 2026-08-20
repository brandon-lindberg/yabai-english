-- A free trial is now one per student per teacher, rather than one per student
-- for the whole platform, so a student shopping for a teacher can try several.
-- The unique pair is what enforces the rule.
-- CreateTable
CREATE TABLE "FreeTrialRedemption" (
    "id" TEXT NOT NULL,
    "studentId" TEXT NOT NULL,
    "teacherId" TEXT NOT NULL,
    "bookingId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "FreeTrialRedemption_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "FreeTrialRedemption_studentId_teacherId_key" ON "FreeTrialRedemption"("studentId", "teacherId");
CREATE INDEX "FreeTrialRedemption_teacherId_createdAt_idx" ON "FreeTrialRedemption"("teacherId", "createdAt");

-- AddForeignKey
ALTER TABLE "FreeTrialRedemption" ADD CONSTRAINT "FreeTrialRedemption_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "FreeTrialRedemption" ADD CONSTRAINT "FreeTrialRedemption_teacherId_fkey" FOREIGN KEY ("teacherId") REFERENCES "TeacherProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Trials become a per-teacher offering so trial availability can be published.
-- AlterTable
ALTER TABLE "TeacherLessonOffering" ADD COLUMN "isFreeTrial" BOOLEAN NOT NULL DEFAULT false;

-- The global one-trial-ever flag is superseded by the table above.
-- AlterTable
ALTER TABLE "StudentProfile" DROP COLUMN "trialLessonUsedAt";
