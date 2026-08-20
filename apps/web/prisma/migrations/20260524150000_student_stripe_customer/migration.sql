-- Re-add platform Stripe Customer id for student saved payment methods.
ALTER TABLE "StudentProfile" ADD COLUMN IF NOT EXISTS "stripeCustomerId" TEXT;

CREATE UNIQUE INDEX IF NOT EXISTS "StudentProfile_stripeCustomerId_key"
  ON "StudentProfile"("stripeCustomerId");
