import { describe, expect, it } from "vitest";
import { evaluateBookingCancellationPolicy } from "@/lib/booking-policy";

describe("evaluateBookingCancellationPolicy", () => {
  const t0 = new Date("2026-04-10T12:00:00.000Z");

  describe("student", () => {
    it("returns refund when cancelling at least 48h before lesson", () => {
      const lessonStartsAt = new Date("2026-04-12T12:00:00.000Z"); // exactly 48h later
      const r = evaluateBookingCancellationPolicy({
        actor: "STUDENT",
        bookingStatus: "CONFIRMED",
        lessonStartsAt,
        now: t0,
      });
      expect(r.allowed).toBe(true);
      expect(r.refundEligible).toBe(true);
      expect(r.rescheduleOffered).toBe(false);
      expect(r.studentCompensationFreeLesson).toBe(false);
    });

    it("returns no refund and reschedule when cancelling under 48h before lesson", () => {
      const lessonStartsAt = new Date("2026-04-11T11:59:00.000Z"); // 23h59m after t0
      const r = evaluateBookingCancellationPolicy({
        actor: "STUDENT",
        bookingStatus: "CONFIRMED",
        lessonStartsAt,
        now: t0,
      });
      expect(r.allowed).toBe(true);
      expect(r.refundEligible).toBe(false);
      expect(r.rescheduleOffered).toBe(true);
      expect(r.studentCompensationFreeLesson).toBe(false);
    });
  });

  describe("teacher", () => {
    it("returns refund plus free lesson credit when teacher cancels under 24h before lesson", () => {
      const lessonStartsAt = new Date("2026-04-11T11:00:00.000Z"); // 23h after t0
      const r = evaluateBookingCancellationPolicy({
        actor: "TEACHER",
        bookingStatus: "CONFIRMED",
        lessonStartsAt,
        now: t0,
      });
      expect(r.allowed).toBe(true);
      expect(r.refundEligible).toBe(true);
      expect(r.studentCompensationFreeLesson).toBe(true);
      expect(r.rescheduleOffered).toBe(false);
    });

    it("returns refund without free lesson when teacher cancels at least 24h before lesson", () => {
      const lessonStartsAt = new Date("2026-04-11T12:00:00.000Z"); // exactly 24h after t0
      const r = evaluateBookingCancellationPolicy({
        actor: "TEACHER",
        bookingStatus: "CONFIRMED",
        lessonStartsAt,
        now: t0,
      });
      expect(r.allowed).toBe(true);
      expect(r.refundEligible).toBe(true);
      expect(r.studentCompensationFreeLesson).toBe(false);
    });
  });

  it("disallows cancel when booking already cancelled or completed", () => {
    for (const status of ["CANCELLED", "COMPLETED"] as const) {
      const r = evaluateBookingCancellationPolicy({
        actor: "STUDENT",
        bookingStatus: status,
        lessonStartsAt: new Date("2026-04-20T12:00:00.000Z"),
        now: t0,
      });
      expect(r.allowed).toBe(false);
      expect(r.refundEligible).toBe(false);
      expect(r.rescheduleOffered).toBe(false);
      expect(r.studentCompensationFreeLesson).toBe(false);
    }
  });

  it("treats ADMIN like TEACHER for compensation timing", () => {
    const soon = new Date("2026-04-10T13:00:00.000Z"); // 1h after t0
    const r = evaluateBookingCancellationPolicy({
      actor: "ADMIN",
      bookingStatus: "CONFIRMED",
      lessonStartsAt: soon,
      now: t0,
    });
    expect(r.allowed).toBe(true);
    expect(r.refundEligible).toBe(true);
    expect(r.studentCompensationFreeLesson).toBe(true);
  });
});
