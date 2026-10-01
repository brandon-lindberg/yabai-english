-- The payment methods each teacher's Stripe account offers at Checkout, read
-- from its payment method configuration, so students are shown what that
-- teacher actually accepts instead of a hardcoded list. Empty until the
-- account's next sync, which shows card alone in the meantime.
ALTER TABLE "TeacherPaymentAccount"
  ADD COLUMN "checkoutMethods" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[];
