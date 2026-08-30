import { describe, expect, test } from "vitest";
import {
  PENDING_PAYMENT_HOLD_MS,
  newHoldExpiry,
  isHoldExpired,
  slotHoldingBookingWhere,
} from "@/lib/pending-booking-hold";

describe("newHoldExpiry", () => {
  test("holds the slot for three hours from the server's clock", () => {
    expect(PENDING_PAYMENT_HOLD_MS).toBe(3 * 60 * 60 * 1000);
    expect(newHoldExpiry(new Date("2026-09-01T10:00:00.000Z")).toISOString()).toBe(
      "2026-09-01T13:00:00.000Z",
    );
  });
});

describe("isHoldExpired", () => {
  const expiresAt = new Date("2026-09-01T13:00:00.000Z");

  test("still held a minute before the deadline", () => {
    expect(isHoldExpired(expiresAt, new Date("2026-09-01T12:59:00.000Z"))).toBe(false);
  });

  test("released once the deadline passes", () => {
    expect(isHoldExpired(expiresAt, new Date("2026-09-01T13:00:01.000Z"))).toBe(true);
  });

  test("the exact deadline still counts as held", () => {
    expect(isHoldExpired(expiresAt, expiresAt)).toBe(false);
  });

  test("a booking with no deadline is not holding anything", () => {
    expect(isHoldExpired(null)).toBe(true);
  });
});

describe("slotHoldingBookingWhere", () => {
  test("confirmed bookings hold their slot regardless of age", () => {
    const where = slotHoldingBookingWhere(new Date("2026-09-01T20:00:00.000Z"));
    expect(where.OR?.[0]).toEqual({ status: "CONFIRMED" });
  });

  test("unpaid bookings hold their slot only until their stored deadline", () => {
    const now = new Date("2026-09-01T13:30:00.000Z");
    // Read from the row the server wrote, never recomputed from createdAt and
    // never from a client clock.
    expect(slotHoldingBookingWhere(now).OR?.[1]).toEqual({
      status: "PENDING_PAYMENT",
      holdExpiresAt: { gte: now },
    });
  });
});
