-- Distinguish "Stripe is reviewing this account" from "onboarding was never
-- finished". Both leave charges disabled, so without these columns the teacher
-- UI told a teacher under review to go finish setup they had already completed.
ALTER TABLE "TeacherPaymentAccount"
  ADD COLUMN "detailsSubmitted" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN "pendingVerification" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  ADD COLUMN "disabledReason" TEXT;

-- Existing enabled accounts have necessarily submitted their details; backfill
-- so they are not briefly reclassified before their next sync.
UPDATE "TeacherPaymentAccount"
  SET "detailsSubmitted" = true
  WHERE "status" = 'ENABLED';
