-- CreateEnum
CREATE TYPE "StudyLevelCode" AS ENUM ('BEGINNER_1', 'BEGINNER_2', 'BEGINNER_3', 'INTERMEDIATE_1', 'INTERMEDIATE_2', 'INTERMEDIATE_3', 'ADVANCED_1', 'ADVANCED_2', 'ADVANCED_3');

-- CreateEnum
CREATE TYPE "StudyDeckVisibility" AS ENUM ('SYSTEM', 'PRIVATE', 'COMMUNITY');

-- CreateEnum
CREATE TYPE "StudyAssessmentKind" AS ENUM ('LEVEL_EXIT');

-- CreateTable
CREATE TABLE "StudyTrack" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "titleJa" TEXT NOT NULL,
    "titleEn" TEXT NOT NULL,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "StudyTrack_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "StudyLevel" (
    "id" TEXT NOT NULL,
    "trackId" TEXT NOT NULL,
    "levelCode" "StudyLevelCode" NOT NULL,
    "titleJa" TEXT NOT NULL,
    "titleEn" TEXT NOT NULL,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "referenceMarkdown" TEXT,

    CONSTRAINT "StudyLevel_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "StudyDeck" (
    "id" TEXT NOT NULL,
    "levelId" TEXT NOT NULL,
    "titleJa" TEXT NOT NULL,
    "titleEn" TEXT NOT NULL,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "ownerUserId" TEXT,
    "visibility" "StudyDeckVisibility" NOT NULL DEFAULT 'SYSTEM',

    CONSTRAINT "StudyDeck_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "StudyCard" (
    "id" TEXT NOT NULL,
    "deckId" TEXT NOT NULL,
    "frontJa" TEXT NOT NULL,
    "backEn" TEXT NOT NULL,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "StudyCard_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UserStudyLevelProgress" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "levelId" TEXT NOT NULL,
    "xp" INTEGER NOT NULL DEFAULT 0,
    "masteryScore" INTEGER NOT NULL DEFAULT 0,
    "unlockedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completedAt" TIMESTAMP(3),
    "assessmentPassedAt" TIMESTAMP(3),
    "lastStudiedAt" TIMESTAMP(3),

    CONSTRAINT "UserStudyLevelProgress_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UserStudyCardState" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "cardId" TEXT NOT NULL,
    "ease" DOUBLE PRECISION NOT NULL DEFAULT 2.5,
    "intervalDays" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "dueAt" TIMESTAMP(3),
    "reps" INTEGER NOT NULL DEFAULT 0,
    "lapses" INTEGER NOT NULL DEFAULT 0,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "UserStudyCardState_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "StudyAssessment" (
    "id" TEXT NOT NULL,
    "levelId" TEXT NOT NULL,
    "kind" "StudyAssessmentKind" NOT NULL DEFAULT 'LEVEL_EXIT',
    "itemsJson" JSONB NOT NULL,
    "passingScore" INTEGER NOT NULL DEFAULT 70,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "StudyAssessment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UserStudyAssessmentAttempt" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "assessmentId" TEXT NOT NULL,
    "score" INTEGER NOT NULL,
    "answersJson" JSONB NOT NULL,
    "passed" BOOLEAN NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "UserStudyAssessmentAttempt_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "StudyTrack_slug_key" ON "StudyTrack"("slug");

-- CreateIndex
CREATE INDEX "StudyLevel_trackId_sortOrder_idx" ON "StudyLevel"("trackId", "sortOrder");

-- CreateIndex
CREATE UNIQUE INDEX "StudyLevel_trackId_levelCode_key" ON "StudyLevel"("trackId", "levelCode");

-- CreateIndex
CREATE INDEX "StudyDeck_levelId_sortOrder_idx" ON "StudyDeck"("levelId", "sortOrder");

-- CreateIndex
CREATE INDEX "StudyCard_deckId_sortOrder_idx" ON "StudyCard"("deckId", "sortOrder");

-- CreateIndex
CREATE INDEX "UserStudyLevelProgress_userId_idx" ON "UserStudyLevelProgress"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "UserStudyLevelProgress_userId_levelId_key" ON "UserStudyLevelProgress"("userId", "levelId");

-- CreateIndex
CREATE INDEX "UserStudyCardState_userId_dueAt_idx" ON "UserStudyCardState"("userId", "dueAt");

-- CreateIndex
CREATE UNIQUE INDEX "UserStudyCardState_userId_cardId_key" ON "UserStudyCardState"("userId", "cardId");

-- CreateIndex
CREATE INDEX "StudyAssessment_levelId_sortOrder_idx" ON "StudyAssessment"("levelId", "sortOrder");

-- CreateIndex
CREATE INDEX "UserStudyAssessmentAttempt_userId_createdAt_idx" ON "UserStudyAssessmentAttempt"("userId", "createdAt");

-- AddForeignKey
ALTER TABLE "StudyLevel" ADD CONSTRAINT "StudyLevel_trackId_fkey" FOREIGN KEY ("trackId") REFERENCES "StudyTrack"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StudyDeck" ADD CONSTRAINT "StudyDeck_levelId_fkey" FOREIGN KEY ("levelId") REFERENCES "StudyLevel"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StudyDeck" ADD CONSTRAINT "StudyDeck_ownerUserId_fkey" FOREIGN KEY ("ownerUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StudyCard" ADD CONSTRAINT "StudyCard_deckId_fkey" FOREIGN KEY ("deckId") REFERENCES "StudyDeck"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserStudyLevelProgress" ADD CONSTRAINT "UserStudyLevelProgress_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserStudyLevelProgress" ADD CONSTRAINT "UserStudyLevelProgress_levelId_fkey" FOREIGN KEY ("levelId") REFERENCES "StudyLevel"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserStudyCardState" ADD CONSTRAINT "UserStudyCardState_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserStudyCardState" ADD CONSTRAINT "UserStudyCardState_cardId_fkey" FOREIGN KEY ("cardId") REFERENCES "StudyCard"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StudyAssessment" ADD CONSTRAINT "StudyAssessment_levelId_fkey" FOREIGN KEY ("levelId") REFERENCES "StudyLevel"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserStudyAssessmentAttempt" ADD CONSTRAINT "UserStudyAssessmentAttempt_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserStudyAssessmentAttempt" ADD CONSTRAINT "UserStudyAssessmentAttempt_assessmentId_fkey" FOREIGN KEY ("assessmentId") REFERENCES "StudyAssessment"("id") ON DELETE CASCADE ON UPDATE CASCADE;
