import { describe, expect, test } from "vitest";
import { buildTeacherBookingConfirmedNotification } from "@/lib/booking-notifications";

describe("buildTeacherBookingConfirmedNotification", () => {
  const startsAt = new Date("2026-04-25T00:00:00Z"); // Sat 25 09:00 JST

  test("includes student name and formatted local date/time in both locales (Asia/Tokyo)", () => {
    const result = buildTeacherBookingConfirmedNotification({
      studentName: "Taro Yamada",
      startsAt,
      timezone: "Asia/Tokyo",
    });

    expect(result.titleJa).toContain("Taro Yamada");
    expect(result.titleEn).toContain("Taro Yamada");
    expect(result.bodyJa).toContain("09:00");
    expect(result.bodyEn).toContain("09:00");
    expect(result.bodyJa).toContain("2026");
    expect(result.bodyEn).toContain("Apr 25");
  });

  test("respects non-default teacher timezone when formatting the lesson time", () => {
    const result = buildTeacherBookingConfirmedNotification({
      studentName: "Student",
      startsAt,
      timezone: "Europe/Madrid",
    });

    // 2026-04-25T00:00:00Z in Madrid (CEST, UTC+2) is 02:00
    expect(result.bodyEn).toContain("02:00");
    expect(result.bodyJa).toContain("02:00");
  });

  test("falls back to a generic student label when no name is available", () => {
    const result = buildTeacherBookingConfirmedNotification({
      studentName: null,
      startsAt,
      timezone: "Asia/Tokyo",
    });

    expect(result.titleEn).toMatch(/student/i);
    expect(result.titleJa).toContain("生徒");
  });

  test("title phrases it as a new booking from the student (distinct from student-side notifications)", () => {
    const result = buildTeacherBookingConfirmedNotification({
      studentName: "Alice",
      startsAt,
      timezone: "Asia/Tokyo",
    });

    expect(result.titleEn.toLowerCase()).toContain("booking");
    expect(result.titleJa).toContain("予約");
  });
});
