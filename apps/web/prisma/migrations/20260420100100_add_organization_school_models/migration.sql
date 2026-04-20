-- CreateEnum
CREATE TYPE "OrgRole" AS ENUM ('OWNER', 'ORG_ADMIN', 'SCHOOL_ADMIN', 'TEACHER', 'STUDENT');

-- CreateEnum
CREATE TYPE "OrgMemberStatus" AS ENUM ('ACTIVE', 'INACTIVE', 'INVITED', 'PENDING_APPROVAL');

-- CreateEnum
CREATE TYPE "TimeOffRequestStatus" AS ENUM ('PENDING', 'APPROVED', 'DENIED');

-- CreateEnum
CREATE TYPE "OrgBillingTarget" AS ENUM ('ORGANIZATION', 'STUDENT');

-- CreateTable
CREATE TABLE "Organization" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "nameJa" TEXT,
    "nameEn" TEXT,
    "timezone" TEXT NOT NULL DEFAULT 'Asia/Tokyo',
    "logoUrl" TEXT,
    "description" TEXT,
    "descriptionJa" TEXT,
    "billingTarget" "OrgBillingTarget" NOT NULL DEFAULT 'ORGANIZATION',
    "allowTeacherMarketplace" BOOLEAN NOT NULL DEFAULT true,
    "customDomain" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Organization_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "School" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "nameJa" TEXT,
    "nameEn" TEXT,
    "timezone" TEXT,
    "logoUrl" TEXT,
    "description" TEXT,
    "descriptionJa" TEXT,
    "applicationFlowEnabled" BOOLEAN NOT NULL DEFAULT false,
    "selfEnrollmentEnabled" BOOLEAN NOT NULL DEFAULT false,
    "customDomain" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "School_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OrganizationMembership" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "schoolId" TEXT,
    "orgRole" "OrgRole" NOT NULL,
    "status" "OrgMemberStatus" NOT NULL DEFAULT 'INVITED',
    "invitedByUserId" TEXT,
    "invitedAt" TIMESTAMP(3),
    "joinedAt" TIMESTAMP(3),
    "inviteEmail" TEXT,
    "inviteToken" TEXT,
    "inviteExpiresAt" TIMESTAMP(3),
    "applicationNote" TEXT,
    "reviewNote" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "OrganizationMembership_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SchoolScheduleSlot" (
    "id" TEXT NOT NULL,
    "schoolId" TEXT NOT NULL,
    "assignedTeacherMembershipId" TEXT,
    "dayOfWeek" INTEGER NOT NULL,
    "startMin" INTEGER NOT NULL,
    "endMin" INTEGER NOT NULL,
    "timezone" TEXT NOT NULL,
    "lessonLevel" TEXT NOT NULL,
    "lessonType" TEXT NOT NULL,
    "labelJa" TEXT,
    "labelEn" TEXT,
    "capacity" INTEGER NOT NULL DEFAULT 1,
    "durationMin" INTEGER NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SchoolScheduleSlot_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SchoolScheduleSkip" (
    "id" TEXT NOT NULL,
    "scheduleSlotId" TEXT NOT NULL,
    "startsAtIso" TEXT NOT NULL,
    "reason" TEXT,
    "createdByUserId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SchoolScheduleSkip_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SchoolClassEnrollment" (
    "id" TEXT NOT NULL,
    "scheduleSlotId" TEXT NOT NULL,
    "studentMembershipId" TEXT NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "enrolledAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "unenrolledAt" TIMESTAMP(3),

    CONSTRAINT "SchoolClassEnrollment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SchoolBooking" (
    "id" TEXT NOT NULL,
    "schoolId" TEXT NOT NULL,
    "scheduleSlotId" TEXT NOT NULL,
    "teacherMembershipId" TEXT NOT NULL,
    "startsAt" TIMESTAMP(3) NOT NULL,
    "endsAt" TIMESTAMP(3) NOT NULL,
    "meetUrl" TEXT,
    "googleEventId" TEXT,
    "completionNotesMd" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SchoolBooking_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SchoolBookingAttendee" (
    "id" TEXT NOT NULL,
    "schoolBookingId" TEXT NOT NULL,
    "studentMembershipId" TEXT NOT NULL,
    "attended" BOOLEAN,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SchoolBookingAttendee_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SchoolLessonPricing" (
    "id" TEXT NOT NULL,
    "schoolId" TEXT NOT NULL,
    "lessonLevel" TEXT,
    "lessonType" TEXT,
    "durationMin" INTEGER NOT NULL,
    "priceYen" INTEGER NOT NULL,
    "isGroup" BOOLEAN NOT NULL DEFAULT false,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SchoolLessonPricing_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TimeOffRequest" (
    "id" TEXT NOT NULL,
    "schoolId" TEXT NOT NULL,
    "teacherMembershipId" TEXT NOT NULL,
    "startDate" TIMESTAMP(3) NOT NULL,
    "endDate" TIMESTAMP(3) NOT NULL,
    "reason" TEXT,
    "status" "TimeOffRequestStatus" NOT NULL DEFAULT 'PENDING',
    "reviewedByUserId" TEXT,
    "reviewedAt" TIMESTAMP(3),
    "reviewNote" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TimeOffRequest_pkey" PRIMARY KEY ("id")
);

-- AlterTable: Add optional schoolId FK to Course
ALTER TABLE "Course" ADD COLUMN "schoolId" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "Organization_slug_key" ON "Organization"("slug");
CREATE UNIQUE INDEX "Organization_customDomain_key" ON "Organization"("customDomain");

CREATE UNIQUE INDEX "School_customDomain_key" ON "School"("customDomain");
CREATE UNIQUE INDEX "School_organizationId_slug_key" ON "School"("organizationId", "slug");
CREATE INDEX "School_organizationId_idx" ON "School"("organizationId");

CREATE UNIQUE INDEX "OrganizationMembership_inviteToken_key" ON "OrganizationMembership"("inviteToken");
CREATE UNIQUE INDEX "OrganizationMembership_organizationId_userId_schoolId_key" ON "OrganizationMembership"("organizationId", "userId", "schoolId");
CREATE INDEX "OrganizationMembership_userId_idx" ON "OrganizationMembership"("userId");
CREATE INDEX "OrganizationMembership_organizationId_orgRole_idx" ON "OrganizationMembership"("organizationId", "orgRole");
CREATE INDEX "OrganizationMembership_schoolId_idx" ON "OrganizationMembership"("schoolId");

CREATE INDEX "SchoolScheduleSlot_schoolId_active_idx" ON "SchoolScheduleSlot"("schoolId", "active");

CREATE UNIQUE INDEX "SchoolScheduleSkip_scheduleSlotId_startsAtIso_key" ON "SchoolScheduleSkip"("scheduleSlotId", "startsAtIso");

CREATE UNIQUE INDEX "SchoolClassEnrollment_scheduleSlotId_studentMembershipId_key" ON "SchoolClassEnrollment"("scheduleSlotId", "studentMembershipId");
CREATE INDEX "SchoolClassEnrollment_studentMembershipId_idx" ON "SchoolClassEnrollment"("studentMembershipId");

CREATE INDEX "SchoolBooking_schoolId_startsAt_idx" ON "SchoolBooking"("schoolId", "startsAt");
CREATE INDEX "SchoolBooking_teacherMembershipId_startsAt_idx" ON "SchoolBooking"("teacherMembershipId", "startsAt");

CREATE UNIQUE INDEX "SchoolBookingAttendee_schoolBookingId_studentMembershipId_key" ON "SchoolBookingAttendee"("schoolBookingId", "studentMembershipId");

CREATE INDEX "SchoolLessonPricing_schoolId_active_idx" ON "SchoolLessonPricing"("schoolId", "active");

CREATE INDEX "TimeOffRequest_schoolId_status_idx" ON "TimeOffRequest"("schoolId", "status");
CREATE INDEX "TimeOffRequest_teacherMembershipId_idx" ON "TimeOffRequest"("teacherMembershipId");

CREATE INDEX "Course_schoolId_idx" ON "Course"("schoolId");

-- AddForeignKey
ALTER TABLE "School" ADD CONSTRAINT "School_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "OrganizationMembership" ADD CONSTRAINT "OrganizationMembership_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "OrganizationMembership" ADD CONSTRAINT "OrganizationMembership_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "OrganizationMembership" ADD CONSTRAINT "OrganizationMembership_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "School"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "SchoolScheduleSlot" ADD CONSTRAINT "SchoolScheduleSlot_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "School"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "SchoolScheduleSlot" ADD CONSTRAINT "SchoolScheduleSlot_assignedTeacherMembershipId_fkey" FOREIGN KEY ("assignedTeacherMembershipId") REFERENCES "OrganizationMembership"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "SchoolScheduleSkip" ADD CONSTRAINT "SchoolScheduleSkip_scheduleSlotId_fkey" FOREIGN KEY ("scheduleSlotId") REFERENCES "SchoolScheduleSlot"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "SchoolClassEnrollment" ADD CONSTRAINT "SchoolClassEnrollment_scheduleSlotId_fkey" FOREIGN KEY ("scheduleSlotId") REFERENCES "SchoolScheduleSlot"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "SchoolClassEnrollment" ADD CONSTRAINT "SchoolClassEnrollment_studentMembershipId_fkey" FOREIGN KEY ("studentMembershipId") REFERENCES "OrganizationMembership"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "SchoolBooking" ADD CONSTRAINT "SchoolBooking_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "School"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "SchoolBooking" ADD CONSTRAINT "SchoolBooking_scheduleSlotId_fkey" FOREIGN KEY ("scheduleSlotId") REFERENCES "SchoolScheduleSlot"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "SchoolBooking" ADD CONSTRAINT "SchoolBooking_teacherMembershipId_fkey" FOREIGN KEY ("teacherMembershipId") REFERENCES "OrganizationMembership"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "SchoolBookingAttendee" ADD CONSTRAINT "SchoolBookingAttendee_schoolBookingId_fkey" FOREIGN KEY ("schoolBookingId") REFERENCES "SchoolBooking"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "SchoolBookingAttendee" ADD CONSTRAINT "SchoolBookingAttendee_studentMembershipId_fkey" FOREIGN KEY ("studentMembershipId") REFERENCES "OrganizationMembership"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "SchoolLessonPricing" ADD CONSTRAINT "SchoolLessonPricing_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "School"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "TimeOffRequest" ADD CONSTRAINT "TimeOffRequest_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "School"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "TimeOffRequest" ADD CONSTRAINT "TimeOffRequest_teacherMembershipId_fkey" FOREIGN KEY ("teacherMembershipId") REFERENCES "OrganizationMembership"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "Course" ADD CONSTRAINT "Course_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "School"("id") ON DELETE SET NULL ON UPDATE CASCADE;
