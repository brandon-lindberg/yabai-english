import { afterEach, beforeEach, describe, expect, test } from "vitest";
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

  describe("BOOKING_AUTO_CONFIRM env flag", () => {
    const original = process.env.BOOKING_AUTO_CONFIRM;
    beforeEach(() => {
      delete process.env.BOOKING_AUTO_CONFIRM;
    });
    afterEach(() => {
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
});
