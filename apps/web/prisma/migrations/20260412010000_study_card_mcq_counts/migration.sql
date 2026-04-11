-- MCQ practice: track correct/wrong and streak for adaptive queue weighting.
ALTER TABLE "UserStudyCardState" ADD COLUMN "correctCount" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "UserStudyCardState" ADD COLUMN "wrongCount" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "UserStudyCardState" ADD COLUMN "streakCorrect" INTEGER NOT NULL DEFAULT 0;
