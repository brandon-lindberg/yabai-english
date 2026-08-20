import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import { getBookingPaymentFlow } from "@/lib/payment-flow";

describe("getBookingPaymentFlow", () => {
  test("free trial skips payment", () => {
    expect(
      getBookingPaymentFlow({
        lessonTier: "FREE_TRIAL",
        trialAlreadyUsed: false,
      }),
    ).toEqual({
      status: "CONFIRMED",
      requiresPayment: false,
    });
  });

  test("standard lesson requires payment", () => {
    expect(
      getBookingPaymentFlow({
        lessonTier: "STANDARD",
        trialAlreadyUsed: false,
      }),
    ).toEqual({
      status: "PENDING_PAYMENT",
      requiresPayment: true,
    });
  });

  describe("BOOKING_AUTO_CONFIRM env flag (outside production)", () => {
    const original = process.env.BOOKING_AUTO_CONFIRM;
    const originalNodeEnv = process.env.NODE_ENV;
    beforeEach(() => {
      delete process.env.BOOKING_AUTO_CONFIRM;
      vi.stubEnv("NODE_ENV", "development");
    });
    afterEach(() => {
      vi.unstubAllEnvs();
      vi.stubEnv("NODE_ENV", originalNodeEnv ?? "test");
      vi.unstubAllEnvs();
      if (original === undefined) {
        delete process.env.BOOKING_AUTO_CONFIRM;
      } else {
        process.env.BOOKING_AUTO_CONFIRM = original;
      }
    });

    test("when set to 'true', any tier auto-confirms without payment", () => {
      process.env.BOOKING_AUTO_CONFIRM = "true";
      expect(
        getBookingPaymentFlow({
          lessonTier: "STANDARD",
          trialAlreadyUsed: false,
        }),
      ).toEqual({ status: "CONFIRMED", requiresPayment: false });
    });

    test("when set to 'true', a re-used free trial also auto-confirms", () => {
      process.env.BOOKING_AUTO_CONFIRM = "true";
      expect(
        getBookingPaymentFlow({
          lessonTier: "FREE_TRIAL",
          trialAlreadyUsed: true,
        }),
      ).toEqual({ status: "CONFIRMED", requiresPayment: false });
    });

    test("when set to '1', behaves the same as 'true'", () => {
      process.env.BOOKING_AUTO_CONFIRM = "1";
      expect(
        getBookingPaymentFlow({
          lessonTier: "STANDARD",
          trialAlreadyUsed: false,
        }),
      ).toEqual({ status: "CONFIRMED", requiresPayment: false });
    });

    test("when set to 'false' or anything else, normal payment flow runs", () => {
      process.env.BOOKING_AUTO_CONFIRM = "false";
      expect(
        getBookingPaymentFlow({
          lessonTier: "STANDARD",
          trialAlreadyUsed: false,
        }),
      ).toEqual({ status: "PENDING_PAYMENT", requiresPayment: true });
    });
  });

  // The flag exists to let us exercise confirmed-only paths without a payment
  // integration. In production that is not a convenience, it is giving paid
  // lessons away — every other dev escape hatch in the codebase is guarded the
  // same way.
  describe("BOOKING_AUTO_CONFIRM is inert in production", () => {
    const original = process.env.BOOKING_AUTO_CONFIRM;
    afterEach(() => {
      vi.unstubAllEnvs();
      if (original === undefined) {
        delete process.env.BOOKING_AUTO_CONFIRM;
      } else {
        process.env.BOOKING_AUTO_CONFIRM = original;
      }
    });

    test.each(["true", "1", "TRUE"])(
      "a paid lesson still requires payment when the flag is %s",
      (value) => {
        vi.stubEnv("NODE_ENV", "production");
        process.env.BOOKING_AUTO_CONFIRM = value;

        expect(
          getBookingPaymentFlow({ lessonTier: "STANDARD", trialAlreadyUsed: false }),
        ).toEqual({ status: "PENDING_PAYMENT", requiresPayment: true });
      },
    );

    test("an eligible free trial is still free in production", () => {
      vi.stubEnv("NODE_ENV", "production");
      process.env.BOOKING_AUTO_CONFIRM = "true";

      expect(
        getBookingPaymentFlow({ lessonTier: "FREE_TRIAL", trialAlreadyUsed: false }),
      ).toEqual({ status: "CONFIRMED", requiresPayment: false });
    });
  });
});
