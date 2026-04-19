import { beforeEach, describe, expect, test, vi } from "vitest";
import { BookingStatus } from "@/generated/prisma/client";

const { authMock, prismaMock, createUserNotificationMock, createMeetMock } = vi.hoisted(
  () => ({
    authMock: vi.fn(),
    prismaMock: {
      booking: { findUnique: vi.fn(), update: vi.fn() },
      invoice: { upsert: vi.fn() },
    },
    createUserNotificationMock: vi.fn(),
    createMeetMock: vi.fn(),
  }),
);

vi.mock("@/auth", () => ({ auth: authMock }));
vi.mock("@/lib/prisma", () => ({ prisma: prismaMock }));
vi.mock("@/lib/notifications", () => ({
  createUserNotification: createUserNotificationMock,
}));
vi.mock("@/lib/google-calendar", () => ({
  createMeetLessonEvent: createMeetMock,
}));
vi.mock("@/lib/chat-threads", () => ({
  ensureStudentTeacherThread: vi.fn(),
}));

import { POST } from "@/app/api/bookings/[bookingId]/pay/route";

describe("POST /api/bookings/[bookingId]/pay — teacher notification", () => {
  const startsAt = new Date("2026-05-02T00:00:00Z");

  beforeEach(() => {
    vi.clearAllMocks();
    authMock.mockResolvedValue({ user: { id: "student-1", role: "STUDENT" } });
    const baseBooking = {
      id: "booking-1",
      studentId: "student-1",
      status: BookingStatus.PENDING_PAYMENT,
      startsAt,
      endsAt: new Date(startsAt.getTime() + 30 * 60 * 1000),
      quotedPriceYen: 3500,
      meetUrl: null,
      googleEventId: null,
      lessonProduct: { nameEn: "Standard 30", nameJa: "標準 30" },
      teacher: {
        id: "teacher-profile-1",
        userId: "teacher-user-1",
        calendarId: "primary",
        googleCalendarRefreshToken: null,
        availabilitySlots: [{ timezone: "Asia/Tokyo" }],
        user: { email: "teacher@example.com" },
      },
      student: {
        id: "student-1",
        email: "student@example.com",
        name: "Bob Student",
      },
    };
    prismaMock.booking.findUnique.mockResolvedValue(baseBooking);
    prismaMock.booking.update.mockImplementation(async ({ data }: { data: unknown }) => ({
      ...baseBooking,
      ...(data as object),
      status: BookingStatus.CONFIRMED,
    }));
    prismaMock.invoice.upsert.mockResolvedValue({});
    createMeetMock.mockResolvedValue({ meetUrl: null, googleEventId: null });
  });

  test("notifies the teacher by name and lesson time once payment confirms the booking", async () => {
    const res = await POST(
      new Request("http://localhost/api/bookings/booking-1/pay", { method: "POST" }),
      { params: Promise.resolve({ bookingId: "booking-1" }) },
    );

    expect(res.status).toBe(200);

    const teacherCalls = createUserNotificationMock.mock.calls
      .map((c) => c[0] as { userId: string; titleEn: string; titleJa: string; bodyEn?: string; bodyJa?: string })
      .filter((c) => c.userId === "teacher-user-1");
    expect(teacherCalls).toHaveLength(1);
    const payload = teacherCalls[0];
    expect(payload.titleEn).toContain("Bob Student");
    expect(payload.bodyEn).toContain("Bob Student");
    expect(payload.bodyEn).toContain("09:00");
    expect(payload.titleJa).toContain("Bob Student");
  });
});
