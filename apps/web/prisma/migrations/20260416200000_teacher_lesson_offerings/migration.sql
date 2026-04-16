CREATE TABLE "TeacherLessonOffering" (
  "id" TEXT NOT NULL,
  "teacherId" TEXT NOT NULL,
  "durationMin" INTEGER NOT NULL,
  "rateYen" INTEGER NOT NULL,
  "isGroup" BOOLEAN NOT NULL DEFAULT false,
  "groupSize" INTEGER,
  "active" BOOLEAN NOT NULL DEFAULT true,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "TeacherLessonOffering_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "TeacherLessonOffering_teacherId_isGroup_active_idx"
ON "TeacherLessonOffering"("teacherId", "isGroup", "active");

ALTER TABLE "TeacherLessonOffering"
ADD CONSTRAINT "TeacherLessonOffering_teacherId_fkey"
FOREIGN KEY ("teacherId") REFERENCES "TeacherProfile"("id")
ON DELETE CASCADE ON UPDATE CASCADE;

INSERT INTO "TeacherLessonOffering" (
  "id",
  "teacherId",
  "durationMin",
  "rateYen",
  "isGroup",
  "groupSize",
  "active",
  "createdAt",
  "updatedAt"
)
SELECT
  'tlo_' || substr(md5(random()::text || clock_timestamp()::text), 1, 24),
  tp."id",
  30,
  COALESCE(tp."rateYen", 3000),
  false,
  NULL,
  true,
  CURRENT_TIMESTAMP,
  CURRENT_TIMESTAMP
FROM "TeacherProfile" tp
WHERE tp."rateYen" IS NOT NULL;
