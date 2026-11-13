import { beforeEach, describe, expect, test, vi } from "vitest";
import { conversationProduct, lessonSubjectCases } from "../../../test/lesson-subject-fixture";

const { revalidatePathMock, syncRosterMock } = vi.hoisted(() => ({
  revalidatePathMock: vi.fn(),
  syncRosterMock: vi.fn(),
}));

vi.mock("next/cache", () => ({
  revalidatePath: revalidatePathMock,
}));

vi.mock("@/i18n/routing", () => ({
  routing: { locales: ["en", "ja"] },
}));

vi.mock("@/lib/sync-teacher-roster-after-student-booking", () => ({
  syncTeacherRosterAfterStudentBooking: syncRosterMock,
}));

vi.mock("@/lib/prisma", () => ({
  prisma: {
    booking: {
      findUnique: vi.fn(),
      update: vi.fn(),
    },
    invoice: { upsert: vi.fn() },
    googleIntegrationSettings: { findUnique: vi.fn() },
    googleIntegrationAccount: { findUnique: vi.fn() },
  },
}));

vi.mock("@/lib/google-calendar", () => ({
  createMeetLessonEvent: vi.fn().mockResolvedValue({ meetUrl: null, googleEventId: null }),
}));

vi.mock("@/lib/notifications", () => ({
  createUserNotification: vi.fn(),
}));

vi.mock("@/lib/chat-threads", () => ({
  ensureStudentTeacherThread: vi.fn(),
}));

vi.mock("@/lib/teacher-tiers", () => ({
  initializeTeacherTierStateFromHistory: vi.fn(),
}));

import { prisma } from "@/lib/prisma";
import { createMeetLessonEvent } from "@/lib/google-calendar";
import { confirmPaidBookingFromPayment } from "@/lib/booking-payment-confirmation";

const booking = {
  id: "booking-1",
  status: "PENDING_PAYMENT",
  studentId: "student-1",
  quotedPriceYen: 5000,
  startsAt: new Date("2026-07-10T01:00:00Z"),
  endsAt: new Date("2026-07-10T01:30:00Z"),
  meetUrl: null,
  googleEventId: null,
  lessonProduct: { nameEn: "Standard 30" },
  teacher: {
    id: "teacher-1",
    userId: "teacher-user-1",
    calendarId: "primary",
    googleCalendarRefreshToken: null,
    availabilitySlots: [{ timezone: "Asia/Tokyo" }],
    user: { email: "teacher@example.com" },
  },
  student: { email: "student@example.com", name: "Student" },
};

describe("confirmPaidBookingFromPayment", () => {
  test.each(lessonSubjectCases)("the existing paid $learningLanguage confirmation uses one teacher Meet and a correctly named student mirror", async ({ learningLanguage, otherLanguage, nameEn }) => {
    const source = { ...booking, learningLanguage, lessonProduct: conversationProduct, student: { ...booking.student, learningLanguage: otherLanguage } };
    vi.mocked(prisma.booking.findUnique).mockResolvedValue(source as never);
    vi.mocked(prisma.booking.update).mockResolvedValue({ ...source, status: "CONFIRMED" } as never);
    vi.mocked(prisma.googleIntegrationSettings.findUnique).mockResolvedValue({ calendarConnected: true } as never);
    vi.mocked(prisma.googleIntegrationAccount.findUnique).mockResolvedValue({ refreshToken: "test-token", revoked: false } as never);
    vi.mocked(createMeetLessonEvent).mockResolvedValueOnce({ meetUrl: "https://meet.google.com/test-room", googleEventId: "teacher-event" }).mockResolvedValueOnce({ meetUrl: null, googleEventId: "student-event" });
    const result = await confirmPaidBookingFromPayment(booking.id);
    expect(result.ok).toBe(true);
    expect(createMeetLessonEvent).toHaveBeenNthCalledWith(1, expect.objectContaining({ organizerUserId: "teacher-user-1", summary: `Lesson — ${nameEn}`, attendeeEmails: ["student@example.com", "teacher@example.com"] }));
    expect(createMeetLessonEvent).toHaveBeenNthCalledWith(2, expect.objectContaining({ organizerUserId: "student-1", summary: `Lesson — ${nameEn}`, createMeetLink: false }));
    expect(prisma.invoice.upsert).toHaveBeenCalledWith(expect.objectContaining({ create: expect.objectContaining({ bookingId: booking.id, amountYen: 5000 }) }));
    expect(prisma.booking.update).not.toHaveBeenCalledWith(expect.objectContaining({ data: expect.objectContaining({ learningLanguage: expect.anything() }) }));
  });
  beforeEach(() => {
    vi.clearAllMocks();
    syncRosterMock.mockResolvedValue(undefined);
    vi.mocked(prisma.booking.findUnique).mockResolvedValue(booking as never);
    vi.mocked(prisma.booking.update).mockResolvedValue({
      ...booking,
      status: "CONFIRMED",
    } as never);
    vi.mocked(prisma.invoice.upsert).mockResolvedValue({ id: "invoice-1" } as never);
    vi.mocked(prisma.googleIntegrationSettings.findUnique).mockResolvedValue({
      calendarConnected: false,
    } as never);
    vi.mocked(prisma.googleIntegrationAccount.findUnique).mockResolvedValue(null);
  });

  test("revalidates teacher roster paths by default", async () => {
    await confirmPaidBookingFromPayment("booking-1");

    expect(revalidatePathMock).toHaveBeenCalledWith("/en/dashboard/students");
    expect(revalidatePathMock).toHaveBeenCalledWith("/ja/dashboard/students");
  });

  test("skips roster revalidation when requested for page-render callers", async () => {
    await confirmPaidBookingFromPayment("booking-1", { revalidateRoster: false });

    expect(revalidatePathMock).not.toHaveBeenCalled();
  });

  test("does not mirror the lesson on the student calendar when Google is not connected", async () => {
    await confirmPaidBookingFromPayment("booking-1");

    expect(createMeetLessonEvent).toHaveBeenCalledTimes(1);
  });
});
