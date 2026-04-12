-- Track Learned / Not yet taps on dashboard quick review (rotation + stats).
ALTER TABLE "StudyQuickReviewDay" ADD COLUMN "interactions" JSONB NOT NULL DEFAULT '[]';
