import { beforeEach, expect, test, vi } from "vitest";
const mocks = vi.hoisted(() => ({ booking: vi.fn(), notify: vi.fn() }));
vi.mock("@/lib/prisma", () => ({ prisma: { booking: { findUnique: mocks.booking } } }));
vi.mock("@/lib/notifications", () => ({ createUserNotification: mocks.notify }));
import { notifyPrivateBookingEvent } from "../private-booking-notifications";

beforeEach(() => {
  vi.clearAllMocks();
  mocks.booking.mockResolvedValue({ id: "booking", studentId: "student", learningLanguage: "JAPANESE", startsAt: new Date("2026-12-01T02:00:00Z"),
    lessonProduct: { nameEn: "Eikaiwa", nameJa: "英会話", tier: "EIKAWA", durationMin: 60 },
    student: { studentProfile: { timezone: "Asia/Tokyo" } }, teacher: { userId: "teacher", availabilitySlots: [{ timezone: "Europe/London" }] },
  });
});

test.each(["cancelled", "reschedule_requested", "rescheduled"] as const)("%s reaches both participants with subject, local time and a usable destination", async event => {
  await notifyPrivateBookingEvent({ bookingId: "booking", event, previousStartsAt: new Date("2026-11-30T02:00:00Z"), startsAt: new Date("2026-12-01T02:00:00Z") });
  expect(mocks.notify.mock.calls.map(([arg]) => arg.userId).sort()).toEqual(["student", "teacher"]);
  for (const [arg] of mocks.notify.mock.calls) {
    expect(arg.bodyEn).toContain("Japanese conversation");
    expect(arg.bodyEn).not.toContain("Eikaiwa");
    expect(arg.href).toBe("/dashboard/schedule");
    expect(arg.deduplicationKey).toContain(event);
  }
  expect(mocks.notify.mock.calls.find(([arg]) => arg.userId === "student")![0].bodyEn).toContain("11:00");
  expect(mocks.notify.mock.calls.find(([arg]) => arg.userId === "teacher")![0].bodyEn).toContain("02:00");
});

test.each(["SUCCEEDED", "PENDING", "PENDING_RECOVERY"] as const)("refund status %s is described truthfully for both participants", async status => {
  await notifyPrivateBookingEvent({ bookingId: "booking", event: "refund", refund: { id: "refund", status, amountYen: 5000 } });
  expect(mocks.notify).toHaveBeenCalledTimes(2);
  for (const [arg] of mocks.notify.mock.calls) {
    expect(arg.titleEn).toBe(status === "SUCCEEDED" ? "Lesson refunded" : "Lesson refund pending");
    expect(arg.bodyEn).toContain("5,000");
    expect(arg.href).toBe("/dashboard/schedule/refunded");
    if (status !== "SUCCEEDED") expect(arg.bodyEn).not.toContain("has been refunded");
  }
});

test("notification keys distinguish moves and refund state transitions", async () => {
  await notifyPrivateBookingEvent({ bookingId: "booking", event: "rescheduled", previousStartsAt: new Date("2026-11-30T02:00:00Z"), startsAt: new Date("2026-12-01T02:00:00Z") });
  const key = mocks.notify.mock.calls[0][0].deduplicationKey;
  mocks.notify.mockClear();
  await notifyPrivateBookingEvent({ bookingId: "booking", event: "rescheduled", previousStartsAt: new Date("2026-12-01T02:00:00Z"), startsAt: new Date("2026-12-02T02:00:00Z") });
  expect(mocks.notify.mock.calls[0][0].deduplicationKey).not.toBe(key);
});

test("a later repeated A-to-B move is a new transition rather than a retry", async () => {
  const move = { bookingId: "booking", event: "rescheduled" as const, startsAt: new Date("2026-12-01T02:00:00Z") };
  await notifyPrivateBookingEvent({ ...move, transitionId: "revision-one" });
  const first = mocks.notify.mock.calls[0][0].deduplicationKey;
  mocks.notify.mockClear();
  await notifyPrivateBookingEvent({ ...move, transitionId: "revision-three" });
  expect(mocks.notify.mock.calls[0][0].deduplicationKey).not.toBe(first);
});
