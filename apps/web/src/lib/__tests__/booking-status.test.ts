import { describe, expect, test } from "vitest";
import { bookingStatusKey } from "@/lib/booking-status";

describe("bookingStatusKey", () => {
  test("maps pending payment status", () => {
    expect(bookingStatusKey("PENDING_PAYMENT")).toBe("statusPendingPayment");
  });

  test("maps confirmed status", () => {
    expect(bookingStatusKey("CONFIRMED")).toBe("statusConfirmed");
  });
});
