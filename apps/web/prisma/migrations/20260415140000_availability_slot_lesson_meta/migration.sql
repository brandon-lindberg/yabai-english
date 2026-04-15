-- AlterTable
ALTER TABLE "AvailabilitySlot" ADD COLUMN "lessonLevel" TEXT NOT NULL DEFAULT 'any';
ALTER TABLE "AvailabilitySlot" ADD COLUMN "lessonType" TEXT NOT NULL DEFAULT 'conversation';
ALTER TABLE "AvailabilitySlot" ADD COLUMN "lessonTypeCustom" TEXT;
