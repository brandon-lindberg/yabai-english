import { describe, expect, test } from "vitest";
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
});
