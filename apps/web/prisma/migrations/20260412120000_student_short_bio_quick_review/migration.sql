-- AlterTable
ALTER TABLE "StudentProfile" ADD COLUMN "shortBio" VARCHAR(600);

-- CreateTable
CREATE TABLE "StudyQuickReviewDay" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "dayKey" TEXT NOT NULL,
    "cardIds" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "StudyQuickReviewDay_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "StudyQuickReviewDay_userId_dayKey_key" ON "StudyQuickReviewDay"("userId", "dayKey");

-- CreateIndex
CREATE INDEX "StudyQuickReviewDay_userId_idx" ON "StudyQuickReviewDay"("userId");

-- AddForeignKey
ALTER TABLE "StudyQuickReviewDay" ADD CONSTRAINT "StudyQuickReviewDay_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
