-- AlterTable
ALTER TABLE "Booking" ADD COLUMN     "groupLessonSessionId" TEXT;

-- AlterTable
ALTER TABLE "TeacherLessonOffering" ADD COLUMN     "groupTotalRateYen" INTEGER;

-- CreateTable
CREATE TABLE "GroupLessonSession" (
    "id" TEXT NOT NULL,
    "teacherId" TEXT NOT NULL,
    "availabilitySlotId" TEXT,
    "teacherLessonOfferingId" TEXT,
    "startsAt" TIMESTAMP(3) NOT NULL,
    "endsAt" TIMESTAMP(3) NOT NULL,
    "capacity" INTEGER NOT NULL,
    "meetUrl" TEXT,
    "googleEventId" TEXT,
    "googleCalendarId" TEXT,
    "meetCode" TEXT,
    "cancelledAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "GroupLessonSession_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "GroupLessonSession_teacherId_startsAt_idx" ON "GroupLessonSession"("teacherId", "startsAt");

-- CreateIndex
CREATE INDEX "GroupLessonSession_teacherLessonOfferingId_idx" ON "GroupLessonSession"("teacherLessonOfferingId");

-- CreateIndex
CREATE UNIQUE INDEX "GroupLessonSession_availabilitySlotId_startsAt_key" ON "GroupLessonSession"("availabilitySlotId", "startsAt");

-- CreateIndex
CREATE INDEX "Booking_groupLessonSessionId_idx" ON "Booking"("groupLessonSessionId");

-- AddForeignKey
ALTER TABLE "GroupLessonSession" ADD CONSTRAINT "GroupLessonSession_teacherId_fkey" FOREIGN KEY ("teacherId") REFERENCES "TeacherProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GroupLessonSession" ADD CONSTRAINT "GroupLessonSession_availabilitySlotId_fkey" FOREIGN KEY ("availabilitySlotId") REFERENCES "AvailabilitySlot"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GroupLessonSession" ADD CONSTRAINT "GroupLessonSession_teacherLessonOfferingId_fkey" FOREIGN KEY ("teacherLessonOfferingId") REFERENCES "TeacherLessonOffering"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Booking" ADD CONSTRAINT "Booking_groupLessonSessionId_fkey" FOREIGN KEY ("groupLessonSessionId") REFERENCES "GroupLessonSession"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- RenameIndex
ALTER INDEX "AvailabilityOccurrenceSkip_teacherProfileId_slotId_startsAtIso_" RENAME TO "AvailabilityOccurrenceSkip_teacherProfileId_slotId_startsAt_key";

-- One student may hold at most one live seat in a class. Partial, because a
-- cancelled seat is a real row that must not block the same student rebooking.
-- Prisma has no syntax for a partial index, so this is written by hand.
CREATE UNIQUE INDEX "Booking_one_live_seat_per_group_session"
    ON "Booking" ("groupLessonSessionId", "studentId")
    WHERE "groupLessonSessionId" IS NOT NULL
      AND "status" IN ('PENDING_PAYMENT', 'CONFIRMED');
