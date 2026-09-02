-- A teacher can reserve a recurring time for one student — "every Tuesday at
-- 7pm is Kana's". Null means the slot is open to everyone, which is what every
-- existing row is.
--
-- These lessons are private: a slot reserved for one student must not appear to
-- any other student at all, not even as a taken time. Enforcement is in the
-- queries and the booking endpoints, not only in the calendar.
ALTER TABLE "AvailabilitySlot"
  ADD COLUMN "assignedStudentId" TEXT;

ALTER TABLE "AvailabilitySlot"
  ADD CONSTRAINT "AvailabilitySlot_assignedStudentId_fkey"
  FOREIGN KEY ("assignedStudentId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Every student-facing availability read filters on this.
CREATE INDEX "AvailabilitySlot_assignedStudentId_idx"
  ON "AvailabilitySlot"("assignedStudentId");
