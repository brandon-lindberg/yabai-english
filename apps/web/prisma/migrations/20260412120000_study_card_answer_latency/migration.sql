-- Track MCQ answer time (running mean) for analytics, dashboard, and adaptive scheduling.
ALTER TABLE "UserStudyCardState" ADD COLUMN "averageAnswerMs" DOUBLE PRECISION;
ALTER TABLE "UserStudyCardState" ADD COLUMN "latencySampleCount" INTEGER NOT NULL DEFAULT 0;
