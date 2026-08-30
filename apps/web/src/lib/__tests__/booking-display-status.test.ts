import { describe, expect, test } from "vitest";
import {
  bookingStatusKey,
  bookingStatusTone,
  resolveBookingDisplayStatus,
} from "@/lib/booking-status";

const NOW = new Date("2026-09-01T13:30:00.000Z");

describe("resolveBookingDisplayStatus", () => {
  test("an unpaid booking past its hold reads as expired, not pending", () => {
    expect(
      resolveBookingDisplayStatus(
        { status: "PENDING_PAYMENT", holdExpiresAt: new Date("2026-09-01T13:00:00.000Z") },
        NOW,
      ),
    ).toBe("EXPIRED");
  });

  test("an unpaid booking inside its hold is still pending", () => {
    expect(
      resolveBookingDisplayStatus(
        { status: "PENDING_PAYMENT", holdExpiresAt: new Date("2026-09-01T14:00:00.000Z") },
        NOW,
      ),
    ).toBe("PENDING_PAYMENT");
  });

  test("every other status is reported as stored", () => {
    for (const status of ["CONFIRMED", "COMPLETED", "CANCELLED"] as const) {
      expect(
        resolveBookingDisplayStatus({ status, holdExpiresAt: null }, NOW),
      ).toBe(status);
    }
  });
});

describe("expired bookings in the status vocabulary", () => {
  test("reads as its own label rather than borrowing pending's", () => {
    expect(bookingStatusKey("EXPIRED")).toBe("statusExpired");
    expect(bookingStatusKey("PENDING_PAYMENT")).toBe("statusPendingPayment");
  });

  test("is spent, not mid-transformation", () => {
    expect(bookingStatusTone("EXPIRED")).toBe("spent");
  });
});
