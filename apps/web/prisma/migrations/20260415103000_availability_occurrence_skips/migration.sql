-- Hide single occurrences of weekly availability (teacher "delete this event only").
CREATE TABLE "AvailabilityOccurrenceSkip" (
    "id" TEXT NOT NULL,
    "teacherProfileId" TEXT NOT NULL,
    "startsAtIso" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AvailabilityOccurrenceSkip_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "AvailabilityOccurrenceSkip_teacherProfileId_startsAtIso_key"
    ON "AvailabilityOccurrenceSkip"("teacherProfileId", "startsAtIso");

CREATE INDEX "AvailabilityOccurrenceSkip_teacherProfileId_idx"
    ON "AvailabilityOccurrenceSkip"("teacherProfileId");

ALTER TABLE "AvailabilityOccurrenceSkip"
    ADD CONSTRAINT "AvailabilityOccurrenceSkip_teacherProfileId_fkey"
    FOREIGN KEY ("teacherProfileId") REFERENCES "TeacherProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;
