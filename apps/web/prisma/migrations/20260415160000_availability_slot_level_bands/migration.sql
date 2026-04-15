-- Map legacy CEFR / "any" values to beginner | intermediate | advanced
UPDATE "AvailabilitySlot"
SET "lessonLevel" = CASE
  WHEN "lessonLevel" IN ('beginner', 'intermediate', 'advanced') THEN "lessonLevel"
  WHEN "lessonLevel" IN ('a1', 'a2') THEN 'beginner'
  WHEN "lessonLevel" IN ('b1', 'b2') THEN 'intermediate'
  WHEN "lessonLevel" IN ('c1', 'c2') THEN 'advanced'
  WHEN "lessonLevel" = 'any' THEN 'intermediate'
  ELSE 'intermediate'
END;

ALTER TABLE "AvailabilitySlot" ALTER COLUMN "lessonLevel" SET DEFAULT 'intermediate';
