import { beforeEach, describe, expect, test, vi } from "vitest";

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
