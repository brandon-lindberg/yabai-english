-- Add skippedOnboardingSteps to StudentProfile and TeacherProfile
ALTER TABLE "StudentProfile"
  ADD COLUMN "skippedOnboardingSteps" TEXT[] DEFAULT ARRAY[]::TEXT[] NOT NULL;

ALTER TABLE "TeacherProfile"
  ADD COLUMN "skippedOnboardingSteps" TEXT[] DEFAULT ARRAY[]::TEXT[] NOT NULL;
