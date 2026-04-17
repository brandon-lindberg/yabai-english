import { describe, expect, it } from "vitest";
import { isTeacherCalendarReady } from "../teacher-calendar-status";

describe("isTeacherCalendarReady", () => {
  it("is true when calendarConnected is true", () => {
    expect(
      isTeacherCalendarReady({
        calendarConnected: true,
        legacyRefreshTokenPresent: false,
      }),
    ).toBe(true);
  });

  it("is true when legacy refresh token exists even if flag false", () => {
    expect(
      isTeacherCalendarReady({
        calendarConnected: false,
        legacyRefreshTokenPresent: true,
      }),
    ).toBe(true);
  });

  it("is false when neither integration nor legacy token", () => {
    expect(
      isTeacherCalendarReady({
        calendarConnected: false,
        legacyRefreshTokenPresent: false,
      }),
    ).toBe(false);
  });

  it("treats undefined calendarConnected as not connected unless legacy", () => {
    expect(
      isTeacherCalendarReady({
        calendarConnected: undefined,
        legacyRefreshTokenPresent: false,
      }),
    ).toBe(false);
  });
});
