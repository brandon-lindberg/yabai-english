import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import { BookingStatus } from "@prisma/client";

const { authMock, findUniqueMock, updateMock, deleteMeetLessonEventMock, revalidatePathMock } =
  vi.hoisted(() => ({
    authMock: vi.fn(),
    findUniqueMock: vi.fn(),
    updateMock: vi.fn(),
    deleteMeetLessonEventMock: vi.fn(),
    revalidatePathMock: vi.fn(),
  }));

vi.mock("@/auth", () => ({
  auth: authMock,
}));

vi.mock("@/lib/prisma", () => ({
  prisma: {
    booking: {
      findUnique: findUniqueMock,
      update: updateMock,
    },
  },
}));

vi.mock("@/lib/google-calendar", () => ({
  deleteMeetLessonEvent: deleteMeetLessonEventMock,
}));

vi.mock("next/cache", () => ({
  revalidatePath: revalidatePathMock,
}));

import { POST } from "@/app/api/bookings/[bookingId]/cancel/route";

const t0 = new Date("2026-04-10T12:00:00.000Z");

function baseBooking(overrides: Partial<Record<string, unknown>> = {}) {
  return {
    id: "booking-1",
    studentId: "student-user-1",
    teacherId: "teacher-profile-1",
    startsAt: new Date("2026-04-20T12:00:00.000Z"),
    endsAt: new Date("2026-04-20T13:00:00.000Z"),
    status: BookingStatus.CONFIRMED,
    googleEventId: null as string | null,
    googleCalendarId: null as string | null,
    studentGoogleEventId: null as string | null,
    teacher: {
      userId: "teacher-user-1",
      googleCalendarRefreshToken: null as string | null,
      calendarId: "primary",
    },
    ...overrides,
  };
}

describe("POST /api/bookings/[bookingId]/cancel", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
    vi.setSystemTime(t0);
    deleteMeetLessonEventMock.mockResolvedValue(true);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  test("returns 401 when not signed in", async () => {
    authMock.mockResolvedValue(null);
    findUniqueMock.mockResolvedValue(baseBooking());

    const res = await POST(new Request("http://localhost/api/bookings/booking-1/cancel"), {
      params: Promise.resolve({ bookingId: "booking-1" }),
    });

    expect(res.status).toBe(401);
    expect(updateMock).not.toHaveBeenCalled();
  });

  test("returns 404 when booking does not exist", async () => {
    authMock.mockResolvedValue({ user: { id: "student-user-1", role: "STUDENT" } });
    findUniqueMock.mockResolvedValue(null);

    const res = await POST(new Request("http://localhost/api/bookings/missing/cancel"), {
      params: Promise.resolve({ bookingId: "missing" }),
    });

    expect(res.status).toBe(404);
    expect(updateMock).not.toHaveBeenCalled();
  });

  test("returns 404 when another student attempts to cancel", async () => {
    authMock.mockResolvedValue({ user: { id: "other-student", role: "STUDENT" } });
    findUniqueMock.mockResolvedValue(baseBooking());

    const res = await POST(new Request("http://localhost/api/bookings/booking-1/cancel"), {
      params: Promise.resolve({ bookingId: "booking-1" }),
    });

    expect(res.status).toBe(404);
    expect(updateMock).not.toHaveBeenCalled();
  });

  test("returns 403 when teacher is not assigned to the booking", async () => {
    authMock.mockResolvedValue({ user: { id: "wrong-teacher", role: "TEACHER" } });
    findUniqueMock.mockResolvedValue(baseBooking());

    const res = await POST(new Request("http://localhost/api/bookings/booking-1/cancel"), {
      params: Promise.resolve({ bookingId: "booking-1" }),
    });

    expect(res.status).toBe(403);
    expect(updateMock).not.toHaveBeenCalled();
  });

  test("returns 409 when booking is already cancelled", async () => {
    authMock.mockResolvedValue({ user: { id: "student-user-1", role: "STUDENT" } });
    findUniqueMock.mockResolvedValue(
      baseBooking({ status: BookingStatus.CANCELLED }),
    );

    const res = await POST(new Request("http://localhost/api/bookings/booking-1/cancel"), {
      params: Promise.resolve({ bookingId: "booking-1" }),
    });

    expect(res.status).toBe(409);
    expect(updateMock).not.toHaveBeenCalled();
  });

  test("cancels for the owning student and returns policy flags", async () => {
    authMock.mockResolvedValue({ user: { id: "student-user-1", role: "STUDENT" } });
    const booking = baseBooking({
      startsAt: new Date("2026-04-12T12:00:00.000Z"),
    });
    findUniqueMock.mockResolvedValue(booking);
    updateMock.mockImplementation(async ({ data }: { data: { status: BookingStatus } }) => ({
      ...booking,
      ...data,
    }));

    const res = await POST(new Request("http://localhost/api/bookings/booking-1/cancel"), {
      params: Promise.resolve({ bookingId: "booking-1" }),
    });

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.ok).toBe(true);
    expect(body.booking.status).toBe(BookingStatus.CANCELLED);
    expect(body.policy).toEqual({
      allowed: true,
      refundEligible: true,
      rescheduleOffered: false,
      studentCompensationFreeLesson: false,
    });
    expect(updateMock).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: "booking-1" },
        data: { status: BookingStatus.CANCELLED },
      }),
    );
    expect(revalidatePathMock).toHaveBeenCalledWith("/ja/dashboard");
    expect(revalidatePathMock).toHaveBeenCalledWith("/en/dashboard");
  });

  test("lets assigned teacher cancel with short-notice compensation flag", async () => {
    authMock.mockResolvedValue({ user: { id: "teacher-user-1", role: "TEACHER" } });
    const booking = baseBooking({
      startsAt: new Date("2026-04-11T11:00:00.000Z"),
    });
    findUniqueMock.mockResolvedValue(booking);
    updateMock.mockImplementation(async ({ data }: { data: { status: BookingStatus } }) => ({
      ...booking,
      ...data,
    }));

    const res = await POST(new Request("http://localhost/api/bookings/booking-1/cancel"), {
      params: Promise.resolve({ bookingId: "booking-1" }),
    });

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.policy.studentCompensationFreeLesson).toBe(true);
    expect(body.policy.refundEligible).toBe(true);
  });

  test("lets admin cancel any booking", async () => {
    authMock.mockResolvedValue({ user: { id: "admin-1", role: "ADMIN" } });
    const booking = baseBooking();
    findUniqueMock.mockResolvedValue(booking);
    updateMock.mockImplementation(async ({ data }: { data: { status: BookingStatus } }) => ({
      ...booking,
      ...data,
    }));

    const res = await POST(new Request("http://localhost/api/bookings/booking-1/cancel"), {
      params: Promise.resolve({ bookingId: "booking-1" }),
    });

    expect(res.status).toBe(200);
    expect(updateMock).toHaveBeenCalled();
  });

  test("attempts to delete Google events when ids are present", async () => {
    authMock.mockResolvedValue({ user: { id: "teacher-user-1", role: "TEACHER" } });
    const booking = baseBooking({
      googleEventId: "evt-teacher",
      googleCalendarId: "cal-1",
      studentGoogleEventId: "evt-student",
    });
    findUniqueMock.mockResolvedValue(booking);
    updateMock.mockImplementation(async ({ data }: { data: { status: BookingStatus } }) => ({
      ...booking,
      ...data,
    }));

    const res = await POST(new Request("http://localhost/api/bookings/booking-1/cancel"), {
      params: Promise.resolve({ bookingId: "booking-1" }),
    });

    expect(res.status).toBe(200);
    expect(deleteMeetLessonEventMock).toHaveBeenCalledTimes(2);
    expect(deleteMeetLessonEventMock).toHaveBeenCalledWith(
      expect.objectContaining({
        organizerUserId: "teacher-user-1",
        eventId: "evt-teacher",
      }),
    );
    expect(deleteMeetLessonEventMock).toHaveBeenCalledWith(
      expect.objectContaining({
        organizerUserId: "student-user-1",
        eventId: "evt-student",
      }),
    );
  });
});
