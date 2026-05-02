-- Drop legacy denormalized SchoolScheduleSlot.lessonLevel/lessonType.
-- Schools now rely exclusively on the per-school taxonomy
-- (SchoolClassLevel / SchoolClassType) via classLevelId / classTypeId FKs.
ALTER TABLE "SchoolScheduleSlot" DROP COLUMN "lessonLevel",
DROP COLUMN "lessonType";
