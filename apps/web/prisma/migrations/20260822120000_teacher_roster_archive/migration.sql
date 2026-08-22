-- Let a teacher archive a student who no longer studies with them, so a
-- full-time roster's completed-lesson history stays scannable. Purely a
-- visibility state: no booking, invoice or lesson note is touched, and
-- clearing the column restores the student exactly as they were.
ALTER TABLE "TeacherRosterEntry"
  ADD COLUMN "archivedAt" TIMESTAMP(3);

-- Both the roster list and the lesson history filter on this per teacher.
CREATE INDEX "TeacherRosterEntry_teacherId_archivedAt_idx"
  ON "TeacherRosterEntry"("teacherId", "archivedAt");
