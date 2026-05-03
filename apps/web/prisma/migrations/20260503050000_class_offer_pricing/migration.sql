ALTER TABLE "TeacherLessonOffering"
ADD COLUMN IF NOT EXISTS "classLevelId" TEXT;

ALTER TABLE "AvailabilitySlot"
ADD COLUMN IF NOT EXISTS "teacherLessonOfferingId" TEXT;

CREATE TABLE IF NOT EXISTS "TeacherStudentLessonRate" (
  "id" TEXT NOT NULL,
  "teacherId" TEXT NOT NULL,
  "studentId" TEXT NOT NULL,
  "teacherLessonOfferingId" TEXT NOT NULL,
  "rateYen" INTEGER NOT NULL,
  "active" BOOLEAN NOT NULL DEFAULT true,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "TeacherStudentLessonRate_pkey" PRIMARY KEY ("id")
);

UPDATE "TeacherLessonOffering" offer
SET "classLevelId" = first_level."id"
FROM (
  SELECT DISTINCT ON ("teacherId") "teacherId", "id"
  FROM "TeacherClassLevel"
  WHERE "active" = true
  ORDER BY "teacherId", "sortOrder" ASC, "labelEn" ASC
) first_level
WHERE offer."classLevelId" IS NULL
  AND offer."teacherId" = first_level."teacherId";

UPDATE "AvailabilitySlot" slot
SET "teacherLessonOfferingId" = offer."id"
FROM "TeacherLessonOffering" offer
WHERE slot."teacherLessonOfferingId" IS NULL
  AND offer."teacherId" = slot."teacherId"
  AND offer."active" = true
  AND offer."isGroup" = false
  AND offer."classTypeId" = slot."classTypeId"
  AND (offer."classLevelId" = slot."classLevelId" OR offer."classLevelId" IS NULL);

DO $$ BEGIN
  ALTER TABLE "TeacherLessonOffering"
  ADD CONSTRAINT "TeacherLessonOffering_classLevelId_fkey"
  FOREIGN KEY ("classLevelId") REFERENCES "TeacherClassLevel"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE "AvailabilitySlot"
  ADD CONSTRAINT "AvailabilitySlot_teacherLessonOfferingId_fkey"
  FOREIGN KEY ("teacherLessonOfferingId") REFERENCES "TeacherLessonOffering"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE "TeacherStudentLessonRate"
  ADD CONSTRAINT "TeacherStudentLessonRate_teacherId_fkey"
  FOREIGN KEY ("teacherId") REFERENCES "TeacherProfile"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE "TeacherStudentLessonRate"
  ADD CONSTRAINT "TeacherStudentLessonRate_studentId_fkey"
  FOREIGN KEY ("studentId") REFERENCES "User"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE "TeacherStudentLessonRate"
  ADD CONSTRAINT "TeacherStudentLessonRate_teacherLessonOfferingId_fkey"
  FOREIGN KEY ("teacherLessonOfferingId") REFERENCES "TeacherLessonOffering"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE INDEX IF NOT EXISTS "TeacherLessonOffering_classLevelId_idx"
ON "TeacherLessonOffering"("classLevelId");

CREATE INDEX IF NOT EXISTS "AvailabilitySlot_teacherLessonOfferingId_idx"
ON "AvailabilitySlot"("teacherLessonOfferingId");

CREATE UNIQUE INDEX IF NOT EXISTS "TeacherStudentLessonRate_teacherLessonOfferingId_studentId_key"
ON "TeacherStudentLessonRate"("teacherLessonOfferingId", "studentId");

CREATE INDEX IF NOT EXISTS "TeacherStudentLessonRate_teacherId_studentId_active_idx"
ON "TeacherStudentLessonRate"("teacherId", "studentId", "active");
