-- Per-teacher class-level / class-type taxonomy. Mirrors the per-school version.
-- This migration adds the new tables, backfills FKs from legacy lessonLevel/lessonType
-- strings, and then drops the legacy columns. Idempotent within a single transaction.

-- 1. New taxonomy tables
CREATE TABLE "TeacherClassLevel" (
    "id" TEXT NOT NULL,
    "teacherId" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "labelEn" TEXT NOT NULL,
    "labelJa" TEXT,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "TeacherClassLevel_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "TeacherClassType" (
    "id" TEXT NOT NULL,
    "teacherId" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "labelEn" TEXT NOT NULL,
    "labelJa" TEXT,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "TeacherClassType_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "TeacherClassLevel_teacherId_active_idx" ON "TeacherClassLevel"("teacherId", "active");
CREATE UNIQUE INDEX "TeacherClassLevel_teacherId_code_key" ON "TeacherClassLevel"("teacherId", "code");
CREATE INDEX "TeacherClassType_teacherId_active_idx" ON "TeacherClassType"("teacherId", "active");
CREATE UNIQUE INDEX "TeacherClassType_teacherId_code_key" ON "TeacherClassType"("teacherId", "code");

ALTER TABLE "TeacherClassLevel" ADD CONSTRAINT "TeacherClassLevel_teacherId_fkey"
  FOREIGN KEY ("teacherId") REFERENCES "TeacherProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "TeacherClassType" ADD CONSTRAINT "TeacherClassType_teacherId_fkey"
  FOREIGN KEY ("teacherId") REFERENCES "TeacherProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- 2. New nullable FK columns (added before backfill)
ALTER TABLE "AvailabilitySlot" ADD COLUMN "classLevelId" TEXT;
ALTER TABLE "AvailabilitySlot" ADD COLUMN "classTypeId" TEXT;
ALTER TABLE "TeacherLessonOffering" ADD COLUMN "classTypeId" TEXT;

-- 3. Seed default taxonomy for every existing teacher.
-- Levels: Beginner / Intermediate / Advanced. Types: Conversation / Grammar / Reading
-- / Writing / Pronunciation / Business. Codes match legacy lessonLevel / lessonType
-- enum strings so the FK backfill below can match by code.
INSERT INTO "TeacherClassLevel" ("id", "teacherId", "code", "labelEn", "labelJa", "sortOrder")
SELECT
  'cl_' || substr(md5(random()::text || tp.id || level.code), 1, 22),
  tp.id,
  level.code,
  level.label_en,
  level.label_ja,
  level.sort_order
FROM "TeacherProfile" tp
CROSS JOIN (
  VALUES
    ('beginner',     'Beginner',     '初級', 0),
    ('intermediate', 'Intermediate', '中級', 1),
    ('advanced',     'Advanced',     '上級', 2)
) AS level(code, label_en, label_ja, sort_order)
ON CONFLICT ("teacherId", "code") DO NOTHING;

INSERT INTO "TeacherClassType" ("id", "teacherId", "code", "labelEn", "labelJa", "sortOrder")
SELECT
  'ct_' || substr(md5(random()::text || tp.id || ty.code), 1, 22),
  tp.id,
  ty.code,
  ty.label_en,
  ty.label_ja,
  ty.sort_order
FROM "TeacherProfile" tp
CROSS JOIN (
  VALUES
    ('conversation',  'Conversation',  '会話',         0),
    ('grammar',       'Grammar',       '文法',         1),
    ('reading',       'Reading',       'リーディング', 2),
    ('writing',       'Writing',       'ライティング', 3),
    ('pronunciation', 'Pronunciation', '発音',         4),
    ('business',      'Business',      'ビジネス',     5)
) AS ty(code, label_en, label_ja, sort_order)
ON CONFLICT ("teacherId", "code") DO NOTHING;

-- 4. Backfill FKs on AvailabilitySlot from legacy strings.
UPDATE "AvailabilitySlot" s
SET "classLevelId" = lvl.id
FROM "TeacherClassLevel" lvl
WHERE lvl."teacherId" = s."teacherId"
  AND lvl.code = s."lessonLevel";

UPDATE "AvailabilitySlot" s
SET "classTypeId" = ty.id
FROM "TeacherClassType" ty
WHERE ty."teacherId" = s."teacherId"
  AND ty.code = s."lessonType"
  AND s."lessonType" <> 'custom';

-- For "custom" lessonType rows, materialize a TeacherClassType per (teacher, custom label).
INSERT INTO "TeacherClassType" ("id", "teacherId", "code", "labelEn", "labelJa", "sortOrder")
SELECT DISTINCT
  'ct_' || substr(md5(s."teacherId" || coalesce(s."lessonTypeCustom", '')), 1, 22),
  s."teacherId",
  -- Slug-safe fallback when custom label is empty.
  coalesce(
    nullif(regexp_replace(lower(coalesce(s."lessonTypeCustom", '')), '[^a-z0-9]+', '-', 'g'), ''),
    'custom'
  ),
  coalesce(nullif(s."lessonTypeCustom", ''), 'Custom'),
  NULL,
  100
FROM "AvailabilitySlot" s
WHERE s."lessonType" = 'custom'
ON CONFLICT ("teacherId", "code") DO NOTHING;

UPDATE "AvailabilitySlot" s
SET "classTypeId" = ty.id
FROM "TeacherClassType" ty
WHERE ty."teacherId" = s."teacherId"
  AND s."lessonType" = 'custom'
  AND ty.code = coalesce(
    nullif(regexp_replace(lower(coalesce(s."lessonTypeCustom", '')), '[^a-z0-9]+', '-', 'g'), ''),
    'custom'
  );

-- 5. Backfill FK on TeacherLessonOffering.
UPDATE "TeacherLessonOffering" o
SET "classTypeId" = ty.id
FROM "TeacherClassType" ty
WHERE ty."teacherId" = o."teacherId"
  AND ty.code = o."lessonType"
  AND o."lessonType" IS NOT NULL
  AND o."lessonType" <> 'custom';

UPDATE "TeacherLessonOffering" o
SET "classTypeId" = ty.id
FROM "TeacherClassType" ty
WHERE ty."teacherId" = o."teacherId"
  AND o."lessonType" = 'custom'
  AND ty.code = coalesce(
    nullif(regexp_replace(lower(coalesce(o."lessonTypeCustom", '')), '[^a-z0-9]+', '-', 'g'), ''),
    'custom'
  );

-- 6. Indexes + FK constraints on the new columns.
CREATE INDEX "AvailabilitySlot_classLevelId_idx" ON "AvailabilitySlot"("classLevelId");
CREATE INDEX "AvailabilitySlot_classTypeId_idx" ON "AvailabilitySlot"("classTypeId");
CREATE INDEX "TeacherLessonOffering_classTypeId_idx" ON "TeacherLessonOffering"("classTypeId");

ALTER TABLE "AvailabilitySlot" ADD CONSTRAINT "AvailabilitySlot_classLevelId_fkey"
  FOREIGN KEY ("classLevelId") REFERENCES "TeacherClassLevel"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "AvailabilitySlot" ADD CONSTRAINT "AvailabilitySlot_classTypeId_fkey"
  FOREIGN KEY ("classTypeId") REFERENCES "TeacherClassType"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "TeacherLessonOffering" ADD CONSTRAINT "TeacherLessonOffering_classTypeId_fkey"
  FOREIGN KEY ("classTypeId") REFERENCES "TeacherClassType"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- 7. Drop legacy columns now that data has been migrated.
ALTER TABLE "AvailabilitySlot" DROP COLUMN "lessonLevel";
ALTER TABLE "AvailabilitySlot" DROP COLUMN "lessonType";
ALTER TABLE "AvailabilitySlot" DROP COLUMN "lessonTypeCustom";
ALTER TABLE "TeacherLessonOffering" DROP COLUMN "lessonType";
ALTER TABLE "TeacherLessonOffering" DROP COLUMN "lessonTypeCustom";
