-- An unpaid booking holds its slot for a fixed window. Storing the deadline
-- rather than deriving it from createdAt gives one server-written source of
-- truth: nothing recomputes it, and no client clock can move it. It also lets
-- the window be refreshed when a student actually starts checkout, so a
-- reservation cannot lapse out from under someone mid-payment.
ALTER TABLE "Booking"
  ADD COLUMN "holdExpiresAt" TIMESTAMP(3);

-- Existing unpaid bookings keep the window they would have had under the old
-- derived rule, so nothing that is currently held is released by this deploy.
UPDATE "Booking"
  SET "holdExpiresAt" = "createdAt" + INTERVAL '3 hours'
  WHERE "status" = 'PENDING_PAYMENT';

-- Every slot-availability query pairs this with the teacher and the time range.
CREATE INDEX "Booking_status_holdExpiresAt_idx"
  ON "Booking"("status", "holdExpiresAt");
