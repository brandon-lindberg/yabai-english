CREATE TABLE "LearningAchievementMasteryProgress" (
    "userId" TEXT NOT NULL,
    "learningLanguage" "LearningLanguage" NOT NULL,
    "masteredCardIds" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
    "legacyReconciled" BOOLEAN NOT NULL DEFAULT false,
    CONSTRAINT "LearningAchievementMasteryProgress_pkey" PRIMARY KEY ("userId", "learningLanguage"),
    CONSTRAINT "LearningAchievementMasteryProgress_userId_fkey"
        FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE
);
