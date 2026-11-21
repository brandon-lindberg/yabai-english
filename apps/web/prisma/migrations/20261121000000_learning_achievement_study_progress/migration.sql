CREATE TABLE "LearningAchievementStudyProgress" (
    "userId" TEXT NOT NULL,
    "learningLanguage" "LearningLanguage" NOT NULL,
    "cards" INTEGER NOT NULL,

    CONSTRAINT "LearningAchievementStudyProgress_pkey" PRIMARY KEY ("userId", "learningLanguage"),
    CONSTRAINT "LearningAchievementStudyProgress_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE
);
