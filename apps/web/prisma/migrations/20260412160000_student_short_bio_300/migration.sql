-- Shorten intro field to match app limit (truncate any legacy rows > 300 chars).
UPDATE "StudentProfile"
SET "shortBio" = LEFT("shortBio", 300)
WHERE "shortBio" IS NOT NULL AND char_length("shortBio") > 300;

ALTER TABLE "StudentProfile" ALTER COLUMN "shortBio" SET DATA TYPE VARCHAR(300);
