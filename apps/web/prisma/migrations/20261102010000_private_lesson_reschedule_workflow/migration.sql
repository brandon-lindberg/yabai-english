CREATE TYPE "PrivateRescheduleStatus" AS ENUM ('PENDING', 'RESCHEDULED', 'CLOSED', 'REFUND_REQUESTED');
ALTER TABLE "Booking"
  ADD COLUMN "privateRescheduleStatus" "PrivateRescheduleStatus",
  ADD COLUMN "rescheduleRequestedAt" TIMESTAMP(3),
  ADD COLUMN "rescheduleResolvedAt" TIMESTAMP(3);
CREATE INDEX "Booking_privateRescheduleStatus_teacherId_idx" ON "Booking"("privateRescheduleStatus", "teacherId");
CREATE INDEX "Booking_privateRescheduleStatus_studentId_idx" ON "Booking"("privateRescheduleStatus", "studentId");
