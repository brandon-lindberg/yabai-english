-- AlterTable
ALTER TABLE "TeacherProfile" ADD COLUMN     "marketplaceHidden" BOOLEAN NOT NULL DEFAULT false;

-- CreateTable
CREATE TABLE "TeacherRosterEntry" (
    "id" TEXT NOT NULL,
    "teacherId" TEXT NOT NULL,
    "studentId" TEXT,
    "invitedEmail" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TeacherRosterEntry_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "TeacherRosterEntry_teacherId_idx" ON "TeacherRosterEntry"("teacherId");

-- CreateIndex
CREATE INDEX "TeacherRosterEntry_studentId_idx" ON "TeacherRosterEntry"("studentId");

-- CreateIndex
CREATE UNIQUE INDEX "TeacherRosterEntry_teacherId_studentId_key" ON "TeacherRosterEntry"("teacherId", "studentId");

-- CreateIndex
CREATE UNIQUE INDEX "TeacherRosterEntry_teacherId_invitedEmail_key" ON "TeacherRosterEntry"("teacherId", "invitedEmail");

-- AddForeignKey
ALTER TABLE "TeacherRosterEntry" ADD CONSTRAINT "TeacherRosterEntry_teacherId_fkey" FOREIGN KEY ("teacherId") REFERENCES "TeacherProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TeacherRosterEntry" ADD CONSTRAINT "TeacherRosterEntry_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
