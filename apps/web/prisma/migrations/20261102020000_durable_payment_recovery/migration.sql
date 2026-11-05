CREATE TYPE "PaymentRecoveryState" AS ENUM ('QUEUED', 'PROCESSING', 'WAITING', 'NEEDS_ATTENTION', 'COMPLETE');
ALTER TABLE "Booking" ADD COLUMN "cancelledFromStatus" "BookingStatus";

ALTER TABLE "Payment" ADD COLUMN "fulfillmentCompletedAt" TIMESTAMP(3), ADD COLUMN "fulfillmentLeaseToken" TEXT, ADD COLUMN "fulfillmentLeaseExpiresAt" TIMESTAMP(3);
-- Preserve completed historical fulfillment. Incomplete paid bookings remain retryable.
UPDATE "Payment" p SET "fulfillmentCompletedAt" = COALESCE(p."paidAt", p."updatedAt")
FROM "Booking" b, "Invoice" i WHERE p."bookingId" = b.id AND i."bookingId" = b.id AND p.status = 'SUCCEEDED' AND b.status = 'CONFIRMED';

ALTER TABLE "Refund" ADD COLUMN "providerAccountId" TEXT, ADD COLUMN "requestKey" TEXT;
CREATE UNIQUE INDEX "Refund_requestKey_key" ON "Refund"("requestKey");
-- NULL account values preserve legacy rows, including any historical duplicates.
CREATE UNIQUE INDEX "Refund_provider_providerAccountId_providerRefundId_key" ON "Refund"("provider", "providerAccountId", "providerRefundId");

CREATE TABLE "PaymentRecovery" (
  "paymentId" TEXT NOT NULL PRIMARY KEY REFERENCES "Payment"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  "refundId" TEXT UNIQUE REFERENCES "Refund"("id") ON DELETE SET NULL ON UPDATE CASCADE,
  "requestedAmountYen" INTEGER,
  "actor" TEXT NOT NULL DEFAULT 'STRIPE',
  "policyJson" JSONB,
  "connectedAccountId" TEXT,
  "paymentIntentId" TEXT,
  "state" "PaymentRecoveryState" NOT NULL DEFAULT 'QUEUED',
  "leaseToken" TEXT,
  "leaseExpiresAt" TIMESTAMP(3),
  "attempts" INTEGER NOT NULL DEFAULT 0,
  "revision" INTEGER NOT NULL DEFAULT 0,
  "nextAttemptAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "requestKey" TEXT,
  "requestAmountYen" INTEGER,
  "requestStartedAt" TIMESTAMP(3),
  "requestSequence" INTEGER NOT NULL DEFAULT 0,
  "applicationFeeId" TEXT,
  "feeRecoveryPending" BOOLEAN NOT NULL DEFAULT false,
  "lastError" TEXT,
  "completedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL
);
CREATE INDEX "PaymentRecovery_state_nextAttemptAt_idx" ON "PaymentRecovery"("state", "nextAttemptAt");
CREATE INDEX "PaymentRecovery_applicationFeeId_idx" ON "PaymentRecovery"("applicationFeeId");

ALTER TABLE "PaymentWebhookEvent"
  ADD COLUMN "state" "PaymentRecoveryState" NOT NULL DEFAULT 'QUEUED',
  ADD COLUMN "completedAt" TIMESTAMP(3),
  ADD COLUMN "leaseToken" TEXT,
  ADD COLUMN "leaseExpiresAt" TIMESTAMP(3),
  ADD COLUMN "attempts" INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN "nextAttemptAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  ADD COLUMN "lastError" TEXT;
-- Old receipts retain their prior meaning; no automatic historical replay.
UPDATE "PaymentWebhookEvent" SET "state" = 'COMPLETE', "completedAt" = "processedAt";
CREATE INDEX "PaymentWebhookEvent_state_nextAttemptAt_idx" ON "PaymentWebhookEvent"("state", "nextAttemptAt");
