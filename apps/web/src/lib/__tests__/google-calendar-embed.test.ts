import { describe, expect, it } from "vitest";
import { buildGoogleCalendarEmbedSrc } from "../google-calendar-embed";

describe("buildGoogleCalendarEmbedSrc", () => {
  it("maps primary to user email", () => {
    const url = buildGoogleCalendarEmbedSrc({
      preferredCalendarId: "primary",
      userEmail: "teacher@example.com",
      timeZone: "Asia/Tokyo",
    });
    expect(url).toContain("calendar.google.com/calendar/embed");
    expect(url).toContain(encodeURIComponent("teacher@example.com"));
    expect(url).toContain(encodeURIComponent("Asia/Tokyo"));
  });

  it("uses explicit calendar id when not primary", () => {
    const url = buildGoogleCalendarEmbedSrc({
      preferredCalendarId: "abc123@group.calendar.google.com",
      userEmail: "x@y.com",
      timeZone: "America/New_York",
    });
    expect(url).toContain(encodeURIComponent("abc123@group.calendar.google.com"));
  });

  it("returns null when primary but no email", () => {
    expect(
      buildGoogleCalendarEmbedSrc({
        preferredCalendarId: "primary",
        userEmail: null,
        timeZone: "UTC",
      }),
    ).toBeNull();
  });
});
