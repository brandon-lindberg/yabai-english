-- Backfill labelEn from label where labelEn is missing, then make labelEn required
-- and drop the redundant `label` column. Display falls back to labelEn (and ja
-- to labelEn when labelJa is null).

UPDATE "SchoolClassLevel" SET "labelEn" = "label" WHERE "labelEn" IS NULL;
UPDATE "SchoolClassType"  SET "labelEn" = "label" WHERE "labelEn" IS NULL;

ALTER TABLE "SchoolClassLevel" ALTER COLUMN "labelEn" SET NOT NULL;
ALTER TABLE "SchoolClassType"  ALTER COLUMN "labelEn" SET NOT NULL;

ALTER TABLE "SchoolClassLevel" DROP COLUMN "label";
ALTER TABLE "SchoolClassType"  DROP COLUMN "label";
