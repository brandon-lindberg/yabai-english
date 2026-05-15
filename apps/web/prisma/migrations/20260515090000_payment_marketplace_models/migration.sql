CREATE TYPE "PaymentProvider" AS ENUM ('STRIPE', 'KOMOJU');
CREATE TYPE "TeacherPaymentAccountStatus" AS ENUM ('PENDING', 'ENABLED', 'DISABLED', 'REQUIREMENTS_DUE');
CREATE TYPE "TeacherPaymentMethodType" AS ENUM ('CARD', 'PAYPAY');
CREATE TYPE "PaymentStatus" AS ENUM ('CREATED', 'REQUIRES_ACTION', 'SUCCEEDED', 'FAILED', 'EXPIRED', 'REFUNDED');
CREATE TYPE "PaymentLedgerEntryType" AS ENUM ('GROSS', 'PLATFORM_FEE', 'TEACHER_NET', 'PROCESSOR_FEE', 'REFUND', 'TRANSFER_REVERSAL');
CREATE TYPE "RefundStatus" AS ENUM ('PENDING', 'SUCCEEDED', 'FAILED', 'PENDING_RECOVERY');

CREATE TABLE "TeacherPaymentAccount" (
    "id" TEXT NOT NULL,
    "teacherId" TEXT NOT NULL,
    "provider" "PaymentProvider" NOT NULL,
    "providerAccountId" TEXT,
    "status" "TeacherPaymentAccountStatus" NOT NULL DEFAULT 'PENDING',
    "chargesEnabled" BOOLEAN NOT NULL DEFAULT false,
    "payoutsEnabled" BOOLEAN NOT NULL DEFAULT false,
    "requirementsDue" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "TeacherPaymentAccount_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "TeacherPaymentMethod" (
    "id" TEXT NOT NULL,
    "accountId" TEXT NOT NULL,
    "method" "TeacherPaymentMethodType" NOT NULL,
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "TeacherPaymentMethod_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "Payment" (
    "id" TEXT NOT NULL,
    "bookingId" TEXT,
    "studentId" TEXT NOT NULL,
    "teacherId" TEXT NOT NULL,
    "teacherPaymentAccountId" TEXT,
    "provider" "PaymentProvider" NOT NULL,
    "method" "TeacherPaymentMethodType" NOT NULL,
    "amountYen" INTEGER NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'JPY',
    "status" "PaymentStatus" NOT NULL DEFAULT 'CREATED',
    "providerCheckoutId" TEXT,
    "providerPaymentId" TEXT,
    "idempotencyKey" TEXT NOT NULL,
    "checkoutUrl" TEXT,
    "metadataJson" JSONB,
    "paidAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "Payment_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "PaymentLedgerEntry" (
    "id" TEXT NOT NULL,
    "paymentId" TEXT NOT NULL,
    "type" "PaymentLedgerEntryType" NOT NULL,
    "amountYen" INTEGER NOT NULL,
    "note" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "PaymentLedgerEntry_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "Refund" (
    "id" TEXT NOT NULL,
    "bookingId" TEXT NOT NULL,
    "paymentId" TEXT NOT NULL,
    "provider" "PaymentProvider" NOT NULL,
    "providerRefundId" TEXT,
    "amountYen" INTEGER NOT NULL,
    "status" "RefundStatus" NOT NULL DEFAULT 'PENDING',
    "actor" TEXT NOT NULL,
    "reason" TEXT NOT NULL,
    "policyJson" JSONB,
    "recoveryNote" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "Refund_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "PaymentWebhookEvent" (
    "id" TEXT NOT NULL,
    "provider" "PaymentProvider" NOT NULL,
    "providerEventId" TEXT NOT NULL,
    "eventType" TEXT NOT NULL,
    "processedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "payloadJson" JSONB,
    CONSTRAINT "PaymentWebhookEvent_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "TeacherPaymentAccount_teacherId_provider_key" ON "TeacherPaymentAccount"("teacherId", "provider");
CREATE INDEX "TeacherPaymentAccount_teacherId_status_idx" ON "TeacherPaymentAccount"("teacherId", "status");
CREATE UNIQUE INDEX "TeacherPaymentMethod_accountId_method_key" ON "TeacherPaymentMethod"("accountId", "method");
CREATE INDEX "TeacherPaymentMethod_method_enabled_idx" ON "TeacherPaymentMethod"("method", "enabled");
CREATE UNIQUE INDEX "Payment_bookingId_key" ON "Payment"("bookingId");
CREATE UNIQUE INDEX "Payment_idempotencyKey_key" ON "Payment"("idempotencyKey");
CREATE INDEX "Payment_studentId_createdAt_idx" ON "Payment"("studentId", "createdAt");
CREATE INDEX "Payment_teacherId_createdAt_idx" ON "Payment"("teacherId", "createdAt");
CREATE INDEX "Payment_provider_providerCheckoutId_idx" ON "Payment"("provider", "providerCheckoutId");
CREATE INDEX "Payment_provider_providerPaymentId_idx" ON "Payment"("provider", "providerPaymentId");
CREATE INDEX "PaymentLedgerEntry_paymentId_type_idx" ON "PaymentLedgerEntry"("paymentId", "type");
CREATE INDEX "Refund_bookingId_createdAt_idx" ON "Refund"("bookingId", "createdAt");
CREATE INDEX "Refund_paymentId_createdAt_idx" ON "Refund"("paymentId", "createdAt");
CREATE INDEX "Refund_provider_providerRefundId_idx" ON "Refund"("provider", "providerRefundId");
CREATE UNIQUE INDEX "PaymentWebhookEvent_provider_providerEventId_key" ON "PaymentWebhookEvent"("provider", "providerEventId");

ALTER TABLE "TeacherPaymentAccount" ADD CONSTRAINT "TeacherPaymentAccount_teacherId_fkey" FOREIGN KEY ("teacherId") REFERENCES "TeacherProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "TeacherPaymentMethod" ADD CONSTRAINT "TeacherPaymentMethod_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES "TeacherPaymentAccount"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Payment" ADD CONSTRAINT "Payment_bookingId_fkey" FOREIGN KEY ("bookingId") REFERENCES "Booking"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "Payment" ADD CONSTRAINT "Payment_teacherPaymentAccountId_fkey" FOREIGN KEY ("teacherPaymentAccountId") REFERENCES "TeacherPaymentAccount"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "PaymentLedgerEntry" ADD CONSTRAINT "PaymentLedgerEntry_paymentId_fkey" FOREIGN KEY ("paymentId") REFERENCES "Payment"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Refund" ADD CONSTRAINT "Refund_bookingId_fkey" FOREIGN KEY ("bookingId") REFERENCES "Booking"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Refund" ADD CONSTRAINT "Refund_paymentId_fkey" FOREIGN KEY ("paymentId") REFERENCES "Payment"("id") ON DELETE CASCADE ON UPDATE CASCADE;
