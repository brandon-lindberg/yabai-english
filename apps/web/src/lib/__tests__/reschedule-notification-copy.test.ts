import { describe, expect, test } from "vitest";
import {
  schoolClassRescheduleRequestPendingForAdmins,
  schoolClassRescheduleRequestRejectedForTeacher,
  schoolClassRescheduledNotification,
} from "@/lib/reschedule-notification-copy";

describe("schoolClassRescheduledNotification", () => {
  test("includes school name in bodies", () => {
    const n = schoolClassRescheduledNotification({ schoolName: "Tokyo Academy" });
    expect(n.bodyEn).toContain("Tokyo Academy");
    expect(n.bodyJa).toContain("Tokyo Academy");
  });
});

describe("schoolClassRescheduleRequestPendingForAdmins", () => {
  test("mentions school in bodies", () => {
    const n = schoolClassRescheduleRequestPendingForAdmins({ schoolName: "Tokyo Academy" });
    expect(n.bodyEn).toContain("Tokyo Academy");
    expect(n.titleEn).toContain("reschedule");
  });
});

describe("schoolClassRescheduleRequestRejectedForTeacher", () => {
  test("includes optional reason in English body", () => {
    const n = schoolClassRescheduleRequestRejectedForTeacher({
      schoolName: "Tokyo Academy",
      rejectReason: "Room booked",
    });
    expect(n.bodyEn).toContain("Room booked");
    expect(n.bodyJa).toContain("Room booked");
  });
});
