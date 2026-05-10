import { describe, expect, test } from "vitest";
import {
  marketplaceBookingRescheduledNotification,
  schoolClassRescheduleRequestPendingForAdmins,
  schoolClassRescheduleRequestRejectedForTeacher,
  schoolClassRescheduledNotification,
} from "@/lib/reschedule-notification-copy";

describe("marketplaceBookingRescheduledNotification", () => {
  test("includes lesson names in bodies", () => {
    const n = marketplaceBookingRescheduledNotification({
      lessonNameJa: "英会話（40分）",
      lessonNameEn: "Conversation (40 min)",
    });
    expect(n.titleEn).toContain("lesson");
    expect(n.titleJa).toBeTruthy();
    expect(n.bodyEn).toContain("Conversation (40 min)");
    expect(n.bodyJa).toContain("英会話（40分）");
  });
});

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
