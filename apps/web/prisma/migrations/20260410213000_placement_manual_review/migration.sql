ALTER TABLE "StudentProfile"
ADD COLUMN "placementNeedsReview" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN "placementReviewReason" TEXT,
ADD COLUMN "placementReport" JSONB,
ADD COLUMN "placementWritingSample" TEXT;
