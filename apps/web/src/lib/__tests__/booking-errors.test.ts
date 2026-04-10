import { describe, expect, test } from "vitest";
import { mapBookingApiError } from "@/lib/booking-errors";

describe("mapBookingApiError", () => {
  test("maps slot taken conflicts to user-friendly message", () => {
    expect(mapBookingApiError("That slot was just booked by another student.")).toBe(
      "This slot was just booked by another student. Please choose another time.",
    );
  });

  test("passes through other messages", () => {
    expect(mapBookingApiError("Free trial lesson already used")).toBe(
      "Free trial lesson already used",
    );
  });
});
