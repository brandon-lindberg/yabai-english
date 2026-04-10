-- Drop credit / Stripe bookkeeping
ALTER TABLE "CreditTransaction" DROP CONSTRAINT IF EXISTS "CreditTransaction_userId_fkey";
DROP TABLE IF EXISTS "CreditTransaction";

DROP TABLE IF EXISTS "StripeWebhookEvent";

DROP TYPE IF EXISTS "CreditTransactionType";

ALTER TABLE "Booking" DROP COLUMN IF EXISTS "stripePaymentIntentId";

ALTER TABLE "LessonProduct" DROP COLUMN IF EXISTS "creditCost";
ALTER TABLE "LessonProduct" DROP COLUMN IF EXISTS "stripePriceId";

ALTER TABLE "StudentProfile" DROP COLUMN IF EXISTS "lessonCredits";
ALTER TABLE "StudentProfile" DROP COLUMN IF EXISTS "stripeCustomerId";
