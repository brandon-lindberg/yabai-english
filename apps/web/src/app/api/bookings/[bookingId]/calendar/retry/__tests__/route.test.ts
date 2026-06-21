import { beforeEach, describe, expect, test, vi } from "vitest";
import { BookingStatus } from "@/generated/prisma/client";

const { authMock, prismaMock, createMeetMock } = vi.hoisted(() => ({
  authMock: vi.fn(),
  prismaMock: {
    booking: {
      findUnique: vi.fn(),
      update: vi.fn(),
    },
  },
  createMeetMock: vi.fn(),
}));

vi.mock("@/auth", () => ({ auth: authMock }));
vi.mock("@/lib/prisma", () => ({ prisma: prismaMock }));
vi.mock("@/lib/google-calendar", () => ({
  createMeetLessonEvent: createMeetMock,
}));

import { POST } from "@/app/api/bookings/[bookingId]/calendar/retry/route";

const baseBooking = {
  id: "booking-1",
  status: BookingStatus.CONFIRMED,
  startsAt: new Date("2026-07-04T16:30:00.000Z"),
  endsAt: new Date("2026-07-04T17:10:00.000Z"),
  meetUrl: null,
  googleEventId: null,
  lessonProduct: { nameEn: "Conversation", nameJa: "英会話" },
  student: { email: "student@example.com" },
  teacher: {
    id: "teacher-profile-1",
    userId: "teacher-user-1",
    googleCalendarRefreshToken: "enc-token",
    calendarId: "primary",
    user: { email: "teacher@example.com" },
  },
};

describe("POST /api/bookings/[bookingId]/calendar/retry", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    authMock.mockResolvedValue({ user: { id: "teacher-user-1", role: "TEACHER" } });
    prismaMock.booking.findUnique.mockResolvedValue(baseBooking);
    prismaMock.booking.update.mockResolvedValue({
      id: "booking-1",
      meetUrl: "https://meet.google.com/abc-defg-hij",
      googleEventId: "event-1",
      googleCalendarId: "primary",
    });
    createMeetMock.mockResolvedValue({
      meetUrl: "https://meet.google.com/abc-defg-hij",
      googleEventId: "event-1",
    });
  });

  test("creates the missing teacher-owned calendar invite for the booking teacher", async () => {
    const res = await POST(
      new Request("http://localhost/api/bookings/booking-1/calendar/retry", {
        method: "POST",
      }),
      { params: Promise.resolve({ bookingId: "booking-1" }) },
    );

    expect(res.status).toBe(200);
    expect(createMeetMock).toHaveBeenCalledWith(
      expect.objectContaining({
        organizerUserId: "teacher-user-1",
        attendeeEmails: ["student@example.com", "teacher@example.com"],
      }),
    );
    expect(prismaMock.booking.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: "booking-1" },
        data: expect.objectContaining({
          googleEventId: "event-1",
          meetUrl: "https://meet.google.com/abc-defg-hij",
        }),
      }),
    );
  });

  test("does not allow the student to create the teacher calendar invite", async () => {
    authMock.mockResolvedValue({ user: { id: "student-1", role: "STUDENT" } });

    const res = await POST(
      new Request("http://localhost/api/bookings/booking-1/calendar/retry", {
        method: "POST",
      }),
      { params: Promise.resolve({ bookingId: "booking-1" }) },
    );

    expect(res.status).toBe(403);
    expect(createMeetMock).not.toHaveBeenCalled();
  });

  test("returns a reconnectable failure when Google still does not create an event", async () => {
    createMeetMock.mockResolvedValue({
      meetUrl: null,
      googleEventId: null,
      errorCode: "GOOGLE_CALENDAR_NOT_CONNECTED",
      errorMessage: "Google Calendar is not connected.",
    });

    const res = await POST(
      new Request("http://localhost/api/bookings/booking-1/calendar/retry", {
        method: "POST",
      }),
      { params: Promise.resolve({ bookingId: "booking-1" }) },
    );

    expect(res.status).toBe(424);
    expect(prismaMock.booking.update).not.toHaveBeenCalled();
    await expect(res.json()).resolves.toEqual(
      expect.objectContaining({
        code: "GOOGLE_CALENDAR_NOT_CONNECTED",
      }),
    );
  });

  test("does not create calendar invites for bookings still pending payment", async () => {
    prismaMock.booking.findUnique.mockResolvedValue({
      ...baseBooking,
      status: BookingStatus.PENDING_PAYMENT,
    });

    const res = await POST(
      new Request("http://localhost/api/bookings/booking-1/calendar/retry", {
        method: "POST",
      }),
      { params: Promise.resolve({ bookingId: "booking-1" }) },
    );

    expect(res.status).toBe(409);
    expect(createMeetMock).not.toHaveBeenCalled();
  });
});
