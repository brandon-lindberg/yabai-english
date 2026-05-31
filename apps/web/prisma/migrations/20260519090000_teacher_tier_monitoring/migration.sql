-- CreateEnum
CREATE TYPE "TeacherPlatformTier" AS ENUM ('TIER_1', 'TIER_2', 'TIER_3');

-- CreateEnum
CREATE TYPE "TeacherTierEvaluationKind" AS ENUM ('QUARTERLY', 'ANNUAL');

-- CreateEnum
CREATE TYPE "TeacherTierEvaluationStatus" AS ENUM ('APPLIED', 'NO_CHANGE', 'PENDING_ADMIN_APPROVAL', 'ADMIN_APPROVED', 'ADMIN_KEPT');

-- CreateEnum
CREATE TYPE "TeacherTierAuditAction" AS ENUM ('INITIALIZED', 'QUARTERLY_EVALUATED', 'ANNUAL_EVALUATED', 'ANNUAL_DEMOTION_APPROVED', 'ANNUAL_DEMOTION_KEPT', 'OVERRIDE_SET', 'OVERRIDE_REMOVED');

-- CreateTable
CREATE TABLE "TeacherTierState" (
    "id" TEXT NOT NULL,
    "teacherId" TEXT NOT NULL,
    "calculatedTier" "TeacherPlatformTier" NOT NULL DEFAULT 'TIER_1',
    "effectiveTier" "TeacherPlatformTier" NOT NULL DEFAULT 'TIER_1',
    "firstPaidLessonAt" TIMESTAMP(3),
    "tierYearStart" TIMESTAMP(3),
    "lastEvaluationAt" TIMESTAMP(3),
    "nextQuarterlyReviewAt" TIMESTAMP(3),
    "nextAnnualReviewAt" TIMESTAMP(3),
    "overrideTier" "TeacherPlatformTier",
    "overrideStartsAt" TIMESTAMP(3),
    "overrideExpiresAt" TIMESTAMP(3),
    "overrideNote" TEXT,
    "overrideSetByUserId" TEXT,
    "overrideSetAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TeacherTierState_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TeacherTierEvaluation" (
    "id" TEXT NOT NULL,
    "teacherId" TEXT NOT NULL,
    "kind" "TeacherTierEvaluationKind" NOT NULL,
    "periodStart" TIMESTAMP(3) NOT NULL,
    "periodEnd" TIMESTAMP(3) NOT NULL,
    "monthlyCountsJson" JSONB NOT NULL,
    "averageLessons" DOUBLE PRECISION NOT NULL,
    "recommendedTier" "TeacherPlatformTier" NOT NULL,
    "appliedTier" "TeacherPlatformTier",
    "status" "TeacherTierEvaluationStatus" NOT NULL,
    "reviewedByUserId" TEXT,
    "reviewedAt" TIMESTAMP(3),
    "reviewNote" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TeacherTierEvaluation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TeacherTierAuditLog" (
    "id" TEXT NOT NULL,
    "teacherId" TEXT NOT NULL,
    "actorUserId" TEXT,
    "action" "TeacherTierAuditAction" NOT NULL,
    "previousTier" "TeacherPlatformTier",
    "newTier" "TeacherPlatformTier",
    "note" TEXT,
    "metadataJson" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TeacherTierAuditLog_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "TeacherTierState_teacherId_key" ON "TeacherTierState"("teacherId");

-- CreateIndex
CREATE INDEX "TeacherTierState_effectiveTier_idx" ON "TeacherTierState"("effectiveTier");

-- CreateIndex
CREATE INDEX "TeacherTierState_nextQuarterlyReviewAt_idx" ON "TeacherTierState"("nextQuarterlyReviewAt");

-- CreateIndex
CREATE INDEX "TeacherTierState_nextAnnualReviewAt_idx" ON "TeacherTierState"("nextAnnualReviewAt");

-- CreateIndex
CREATE UNIQUE INDEX "TeacherTierEvaluation_teacherId_kind_periodStart_periodEnd_key" ON "TeacherTierEvaluation"("teacherId", "kind", "periodStart", "periodEnd");

-- CreateIndex
CREATE INDEX "TeacherTierEvaluation_status_idx" ON "TeacherTierEvaluation"("status");

-- CreateIndex
CREATE INDEX "TeacherTierEvaluation_teacherId_createdAt_idx" ON "TeacherTierEvaluation"("teacherId", "createdAt");

-- CreateIndex
CREATE INDEX "TeacherTierAuditLog_teacherId_createdAt_idx" ON "TeacherTierAuditLog"("teacherId", "createdAt");

-- CreateIndex
CREATE INDEX "TeacherTierAuditLog_action_idx" ON "TeacherTierAuditLog"("action");

-- AddForeignKey
ALTER TABLE "TeacherTierState" ADD CONSTRAINT "TeacherTierState_teacherId_fkey" FOREIGN KEY ("teacherId") REFERENCES "TeacherProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TeacherTierEvaluation" ADD CONSTRAINT "TeacherTierEvaluation_teacherId_fkey" FOREIGN KEY ("teacherId") REFERENCES "TeacherProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TeacherTierAuditLog" ADD CONSTRAINT "TeacherTierAuditLog_teacherId_fkey" FOREIGN KEY ("teacherId") REFERENCES "TeacherProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;
