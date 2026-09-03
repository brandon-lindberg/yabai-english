import { describe, expect, test } from "vitest";
import { bookingOwnsItsCalendarEvent } from "@/lib/booking-calendar-ownership";

describe("bookingOwnsItsCalendarEvent", () => {
  test("a private lesson owns its event", () => {
    expect(bookingOwnsItsCalendarEvent({ groupLessonSessionId: null })).toBe(true);
  });

  test("a booking with no group field at all owns its event", () => {
    expect(bookingOwnsItsCalendarEvent({})).toBe(true);
  });

  // The event on a group seat belongs to the class. One student cancelling
  // must not delete it, and one student moving must not drag everyone along.
  test("a seat in a class does not own the class's event", () => {
    expect(bookingOwnsItsCalendarEvent({ groupLessonSessionId: "sess-1" })).toBe(false);
  });
});
