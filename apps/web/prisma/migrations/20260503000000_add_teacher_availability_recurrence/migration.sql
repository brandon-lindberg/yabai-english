CREATE TYPE "AvailabilitySlotRecurrence" AS ENUM ('WEEKLY', 'ONE_OFF');

ALTER TABLE "AvailabilitySlot"
ADD COLUMN     "endsOn" TIMESTAMP(3),
ADD COLUMN     "recurrence" "AvailabilitySlotRecurrence" NOT NULL DEFAULT 'WEEKLY',
ADD COLUMN     "startsOn" TIMESTAMP(3);
