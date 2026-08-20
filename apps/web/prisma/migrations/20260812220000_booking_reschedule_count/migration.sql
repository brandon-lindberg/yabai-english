-- A student inside the 48-hour window is offered a reschedule instead of a
-- refund. The count caps how often a paid lesson can be moved.
-- AlterTable
ALTER TABLE "Booking" ADD COLUMN "rescheduleCount" INTEGER NOT NULL DEFAULT 0;
