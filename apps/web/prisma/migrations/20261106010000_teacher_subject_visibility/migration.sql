ALTER TABLE "TeacherProfile" ADD COLUMN "japaneseMarketplaceHidden" BOOLEAN NOT NULL DEFAULT false;

-- Existing private profiles keep their privacy on both paths.
UPDATE "TeacherProfile" SET "japaneseMarketplaceHidden" = true WHERE "marketplaceHidden" = true;
