-- DropIndex
DROP INDEX "OrganizationMembership_inviteToken_idx";

-- DropIndex
DROP INDEX "OrganizationMembership_inviteToken_key";

-- AlterTable
ALTER TABLE "OrganizationMembership" DROP COLUMN "applicationNote",
DROP COLUMN "inviteExpiresAt",
DROP COLUMN "inviteToken",
DROP COLUMN "reviewNote",
ALTER COLUMN "userId" DROP NOT NULL;

-- AlterTable
ALTER TABLE "School" DROP COLUMN "applicationFlowEnabled",
DROP COLUMN "selfEnrollmentEnabled";

-- CreateIndex
CREATE INDEX "OrganizationMembership_inviteEmail_idx" ON "OrganizationMembership"("inviteEmail");

-- CreateIndex
CREATE UNIQUE INDEX "OrganizationMembership_organizationId_inviteEmail_schoolId_key" ON "OrganizationMembership"("organizationId", "inviteEmail", "schoolId");
