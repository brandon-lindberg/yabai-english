-- CreateEnum
CREATE TYPE "SchoolSlotRecurrence" AS ENUM ('WEEKLY', 'DAILY', 'ONE_OFF');

-- AlterTable
ALTER TABLE "SchoolScheduleSlot" ADD COLUMN     "daysOfWeek" INTEGER[] DEFAULT ARRAY[]::INTEGER[],
ADD COLUMN     "endsOn" TIMESTAMP(3),
ADD COLUMN     "recurrence" "SchoolSlotRecurrence" NOT NULL DEFAULT 'WEEKLY',
ADD COLUMN     "startsOn" TIMESTAMP(3);
