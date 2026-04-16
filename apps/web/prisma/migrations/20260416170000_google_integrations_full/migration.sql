-- CreateEnum
CREATE TYPE "GoogleIntegrationFeature" AS ENUM ('CALENDAR', 'DRIVE', 'MEET');

-- CreateTable
CREATE TABLE "GoogleIntegrationAccount" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "provider" TEXT NOT NULL DEFAULT 'google',
    "providerAccountId" TEXT NOT NULL,
    "accessToken" TEXT,
    "refreshToken" TEXT,
    "expiresAt" TIMESTAMP(3),
    "grantedScopes" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "tokenMetadataJson" JSONB,
    "revoked" BOOLEAN NOT NULL DEFAULT false,
    "disconnectedAt" TIMESTAMP(3),
    "lastErrorCode" TEXT,
    "lastErrorMessage" TEXT,
    "lastSyncedAt" TIMESTAMP(3),
    "revocationSource" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "GoogleIntegrationAccount_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "GoogleIntegrationSettings" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "calendarConnected" BOOLEAN NOT NULL DEFAULT false,
    "driveConnected" BOOLEAN NOT NULL DEFAULT false,
    "meetConnected" BOOLEAN NOT NULL DEFAULT false,
    "preferredCalendarId" TEXT DEFAULT 'primary',
    "defaultNotesFolderId" TEXT,
    "autoCreateMeetLink" BOOLEAN NOT NULL DEFAULT true,
    "autoShareNotesWithAttendees" BOOLEAN NOT NULL DEFAULT true,
    "artifactSyncEnabled" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "GoogleIntegrationSettings_pkey" PRIMARY KEY ("id")
);

-- AlterTable
ALTER TABLE "Booking"
ADD COLUMN "googleCalendarId" TEXT,
ADD COLUMN "meetCode" TEXT,
ADD COLUMN "meetConferenceId" TEXT,
ADD COLUMN "notesDocId" TEXT,
ADD COLUMN "recordingIds" TEXT[] DEFAULT ARRAY[]::TEXT[],
ADD COLUMN "smartNotesIds" TEXT[] DEFAULT ARRAY[]::TEXT[],
ADD COLUMN "transcriptArtifactIds" TEXT[] DEFAULT ARRAY[]::TEXT[];

-- CreateIndex
CREATE UNIQUE INDEX "GoogleIntegrationAccount_userId_key" ON "GoogleIntegrationAccount"("userId");
CREATE UNIQUE INDEX "GoogleIntegrationAccount_provider_providerAccountId_key" ON "GoogleIntegrationAccount"("provider", "providerAccountId");
CREATE INDEX "GoogleIntegrationAccount_userId_revoked_idx" ON "GoogleIntegrationAccount"("userId", "revoked");
CREATE UNIQUE INDEX "GoogleIntegrationSettings_userId_key" ON "GoogleIntegrationSettings"("userId");

-- AddForeignKey
ALTER TABLE "GoogleIntegrationAccount" ADD CONSTRAINT "GoogleIntegrationAccount_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "GoogleIntegrationSettings" ADD CONSTRAINT "GoogleIntegrationSettings_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Backfill from teacher calendar legacy fields.
INSERT INTO "GoogleIntegrationSettings" (
  "id",
  "userId",
  "calendarConnected",
  "preferredCalendarId",
  "createdAt",
  "updatedAt"
)
SELECT
  'gis_' || substr(md5(random()::text || clock_timestamp()::text), 1, 24),
  tp."userId",
  (tp."googleCalendarRefreshToken" IS NOT NULL),
  COALESCE(tp."calendarId", 'primary'),
  CURRENT_TIMESTAMP,
  CURRENT_TIMESTAMP
FROM "TeacherProfile" tp
WHERE tp."googleCalendarRefreshToken" IS NOT NULL
ON CONFLICT ("userId") DO NOTHING;

INSERT INTO "GoogleIntegrationAccount" (
  "id",
  "userId",
  "provider",
  "providerAccountId",
  "refreshToken",
  "grantedScopes",
  "createdAt",
  "updatedAt"
)
SELECT
  'gia_' || substr(md5(random()::text || clock_timestamp()::text), 1, 24),
  tp."userId",
  'google',
  tp."userId",
  tp."googleCalendarRefreshToken",
  ARRAY['https://www.googleapis.com/auth/calendar.events', 'https://www.googleapis.com/auth/calendar.readonly']::TEXT[],
  CURRENT_TIMESTAMP,
  CURRENT_TIMESTAMP
FROM "TeacherProfile" tp
WHERE tp."googleCalendarRefreshToken" IS NOT NULL
ON CONFLICT ("userId") DO NOTHING;
