ALTER TABLE "Booking"
ADD COLUMN IF NOT EXISTS "quotedPriceYen" INTEGER NOT NULL DEFAULT 0;

CREATE TABLE IF NOT EXISTS "Invoice" (
  "id" TEXT NOT NULL,
  "bookingId" TEXT NOT NULL,
  "studentId" TEXT NOT NULL,
  "amountYen" INTEGER NOT NULL,
  "invoiceNo" TEXT NOT NULL,
  "paidAt" TIMESTAMP(3) NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "Invoice_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "Invoice_bookingId_key" ON "Invoice"("bookingId");
CREATE UNIQUE INDEX IF NOT EXISTS "Invoice_invoiceNo_key" ON "Invoice"("invoiceNo");
CREATE INDEX IF NOT EXISTS "Invoice_studentId_createdAt_idx" ON "Invoice"("studentId", "createdAt");

DO $$ BEGIN
  ALTER TABLE "Invoice"
  ADD CONSTRAINT "Invoice_bookingId_fkey"
  FOREIGN KEY ("bookingId") REFERENCES "Booking"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE "Invoice"
  ADD CONSTRAINT "Invoice_studentId_fkey"
  FOREIGN KEY ("studentId") REFERENCES "User"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
