-- CreateEnum
CREATE TYPE "SchoolBookingRescheduleRequestStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED');

-- CreateTable
CREATE TABLE "SchoolBookingRescheduleRequest" (
    "id" TEXT NOT NULL,
    "schoolBookingId" TEXT NOT NULL,
    "requesterMembershipId" TEXT NOT NULL,
    "proposedStartsAt" TIMESTAMP(3) NOT NULL,
    "proposedEndsAt" TIMESTAMP(3) NOT NULL,
    "status" "SchoolBookingRescheduleRequestStatus" NOT NULL DEFAULT 'PENDING',
    "reviewedByMembershipId" TEXT,
    "reviewedAt" TIMESTAMP(3),
    "rejectReason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SchoolBookingRescheduleRequest_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "SchoolBookingRescheduleRequest_schoolBookingId_status_idx" ON "SchoolBookingRescheduleRequest"("schoolBookingId", "status");

-- AddForeignKey
ALTER TABLE "SchoolBookingRescheduleRequest" ADD CONSTRAINT "SchoolBookingRescheduleRequest_schoolBookingId_fkey" FOREIGN KEY ("schoolBookingId") REFERENCES "SchoolBooking"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "SchoolBookingRescheduleRequest" ADD CONSTRAINT "SchoolBookingRescheduleRequest_requesterMembershipId_fkey" FOREIGN KEY ("requesterMembershipId") REFERENCES "OrganizationMembership"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "SchoolBookingRescheduleRequest" ADD CONSTRAINT "SchoolBookingRescheduleRequest_reviewedByMembershipId_fkey" FOREIGN KEY ("reviewedByMembershipId") REFERENCES "OrganizationMembership"("id") ON DELETE SET NULL ON UPDATE CASCADE;
