-- A skip named only an instant, so cancelling one week of one rule cancelled
-- every rule's occurrence at that time. Existing rows keep the null, and with
-- it their original meaning; new skips name the rule they belong to.
ALTER TABLE "AvailabilityOccurrenceSkip" ADD COLUMN "slotId" TEXT;

DROP INDEX IF EXISTS "AvailabilityOccurrenceSkip_teacherProfileId_startsAtIso_key";

CREATE UNIQUE INDEX "AvailabilityOccurrenceSkip_teacherProfileId_slotId_startsAtIso_key"
  ON "AvailabilityOccurrenceSkip" ("teacherProfileId", "slotId", "startsAtIso");
