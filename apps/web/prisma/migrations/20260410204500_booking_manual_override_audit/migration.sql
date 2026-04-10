ALTER TABLE "Booking"
ADD COLUMN IF NOT EXISTS "manualOverrideUsed" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN IF NOT EXISTS "manualOverrideReason" TEXT,
ADD COLUMN IF NOT EXISTS "manualOverrideByRole" "Role";
