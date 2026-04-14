-- Add block/report moderation fields to chat threads.
ALTER TABLE "ChatThread"
ADD COLUMN "studentBlockedAt" TIMESTAMP(3),
ADD COLUMN "teacherBlockedAt" TIMESTAMP(3),
ADD COLUMN "studentReportedAt" TIMESTAMP(3),
ADD COLUMN "teacherReportedAt" TIMESTAMP(3),
ADD COLUMN "studentReportReason" TEXT,
ADD COLUMN "teacherReportReason" TEXT;
