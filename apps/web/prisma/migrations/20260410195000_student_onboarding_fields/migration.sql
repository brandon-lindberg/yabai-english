-- Student onboarding fields (timezone, goals, notifications, legal consent)
ALTER TABLE "StudentProfile"
ADD COLUMN IF NOT EXISTS "timezone" TEXT NOT NULL DEFAULT 'Asia/Tokyo',
ADD COLUMN IF NOT EXISTS "learningGoals" TEXT[] DEFAULT ARRAY[]::TEXT[],
ADD COLUMN IF NOT EXISTS "notifyLessonReminders" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN IF NOT EXISTS "notifyMessages" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN IF NOT EXISTS "notifyPayments" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN IF NOT EXISTS "termsAcceptedAt" TIMESTAMP(3),
ADD COLUMN IF NOT EXISTS "privacyAcceptedAt" TIMESTAMP(3),
ADD COLUMN IF NOT EXISTS "recordingConsentAt" TIMESTAMP(3),
ADD COLUMN IF NOT EXISTS "onboardingCompletedAt" TIMESTAMP(3);
