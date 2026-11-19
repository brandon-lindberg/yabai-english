CREATE TABLE "LearningAchievementAward" (
    "userId" TEXT NOT NULL,
    "learningLanguage" "LearningLanguage" NOT NULL,
    "achievementId" TEXT NOT NULL,
    "awardedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "LearningAchievementAward_pkey" PRIMARY KEY ("userId", "learningLanguage", "achievementId"),
    CONSTRAINT "LearningAchievementAward_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE
);
