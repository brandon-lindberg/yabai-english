import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import { BookingStatus } from "@/generated/prisma/client";

const {
  authMock,
  findFirstMock,
  findUniqueMock,
  findManyMock,
  updateMock,
  patchMeetLessonEventMock,
  revalidatePathMock,
} = vi.hoisted(() => ({
  authMock: vi.fn(),
  findFirstMock: vi.fn(),
  findUniqueMock: vi.fn(),
  findManyMock: vi.fn(),
  updateMock: vi.fn(),
  patchMeetLessonEventMock: vi.fn(),
  revalidatePathMock: vi.fn(),
}));

vi.mock("@/auth", () => ({
  auth: authMock,
}));

vi.mock("@/lib/prisma", () => ({
  prisma: {
    booking: {
      findUnique: findUniqueMock,
      findFirst: findFirstMock,
      update: updateMock,
    },
    schoolScheduleSlot: {
      findMany: findManyMock,
    },
  },
}));

vi.mock("@/lib/google-calendar", () => ({
  patchMeetLessonEvent: patchMeetLessonEventMock,
}));

vi.mock("next/cache", () => ({
  revalidatePath: revalidatePathMock,
}));

import { PATCH } from "@/app/api/bookings/[bookingId]/route";

const now = new Date("2026-05-10T12:00:00.000Z");

function baseBooking(overrides: Partial<Record<string, unknown>> = {}) {
  return {
    id: "booking-1",
    studentId: "student-user-1",
    startsAt: new Date("2026-05-24T01:00:00.000Z"),
    endsAt: new Date("2026-05-24T01:40:00.000Z"),
    status: BookingStatus.CONFIRMED,
    googleEventId: "evt-teacher",
    googleCalendarId: "primary",
    studentGoogleEventId: "evt-student",
    lessonProduct: { durationMin: 40 },
    teacher: {
      id: "tp-1",
      userId: "teacher-user-1",
      googleCalendarRefreshToken: "enc-teacher",
      calendarId: "primary",
    },
    ...overrides,
  };
}

describe("PATCH /api/bookings/[bookingId]", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
    vi.setSystemTime(now);
    patchMeetLessonEventMock.mockResolvedValue(true);
    findManyMock.mockResolvedValue([]);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  test("returns 401 when not signed in", async () => {
    authMock.mockResolvedValue(null);
    findUniqueMock.mockResolvedValue(baseBooking());

    const res = await PATCH(
      new Request("http://localhost/api/bookings/booking-1", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ startsAt: "2026-05-24T01:30:00.000Z" }),
      }),
      { params: Promise.resolve({ bookingId: "booking-1" }) },
    );

    expect(res.status).toBe(401);
    expect(updateMock).not.toHaveBeenCalled();
  });

  test("returns 404 when booking missing", async () => {
    authMock.mockResolvedValue({ user: { id: "teacher-user-1", role: "TEACHER" } });
    findUniqueMock.mockResolvedValue(null);

    const res = await PATCH(
      new Request("http://localhost/api/bookings/missing", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ startsAt: "2026-05-24T01:30:00.000Z" }),
      }),
      { params: Promise.resolve({ bookingId: "missing" }) },
    );

    expect(res.status).toBe(404);
    expect(updateMock).not.toHaveBeenCalled();
  });

  test("returns 403 for students", async () => {
    authMock.mockResolvedValue({ user: { id: "student-user-1", role: "STUDENT" } });
    findUniqueMock.mockResolvedValue(baseBooking());

    const res = await PATCH(
      new Request("http://localhost/api/bookings/booking-1", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ startsAt: "2026-05-24T01:30:00.000Z" }),
      }),
      { params: Promise.resolve({ bookingId: "booking-1" }) },
    );

    expect(res.status).toBe(403);
    expect(updateMock).not.toHaveBeenCalled();
  });

  test("returns 403 when teacher is not the booking teacher", async () => {
    authMock.mockResolvedValue({ user: { id: "other-teacher", role: "TEACHER" } });
    findUniqueMock.mockResolvedValue(baseBooking());

    const res = await PATCH(
      new Request("http://localhost/api/bookings/booking-1", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ startsAt: "2026-05-24T01:30:00.000Z" }),
      }),
      { params: Promise.resolve({ bookingId: "booking-1" }) },
    );

    expect(res.status).toBe(403);
    expect(updateMock).not.toHaveBeenCalled();
  });

  test("returns 400 for invalid JSON body", async () => {
    authMock.mockResolvedValue({ user: { id: "teacher-user-1", role: "TEACHER" } });
    findUniqueMock.mockResolvedValue(baseBooking());

    const res = await PATCH(
      new Request("http://localhost/api/bookings/booking-1", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: "not-json",
      }),
      { params: Promise.resolve({ bookingId: "booking-1" }) },
    );

    expect(res.status).toBe(400);
  });

  test("returns 409 when booking is not reschedulable", async () => {
    authMock.mockResolvedValue({ user: { id: "teacher-user-1", role: "TEACHER" } });
    findUniqueMock.mockResolvedValue(
      baseBooking({ status: BookingStatus.CANCELLED }),
    );

    const res = await PATCH(
      new Request("http://localhost/api/bookings/booking-1", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ startsAt: "2026-05-24T01:30:00.000Z" }),
      }),
      { params: Promise.resolve({ bookingId: "booking-1" }) },
    );

    expect(res.status).toBe(409);
    expect(updateMock).not.toHaveBeenCalled();
  });

  test("returns 409 when another booking overlaps", async () => {
    authMock.mockResolvedValue({ user: { id: "teacher-user-1", role: "TEACHER" } });
    findUniqueMock.mockResolvedValue(baseBooking());
    findFirstMock.mockResolvedValue({ id: "other-booking" });

    const res = await PATCH(
      new Request("http://localhost/api/bookings/booking-1", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ startsAt: "2026-05-24T01:30:00.000Z" }),
      }),
      { params: Promise.resolve({ bookingId: "booking-1" }) },
    );

    expect(res.status).toBe(409);
    expect(updateMock).not.toHaveBeenCalled();
  });

  test("returns 200 without DB update when time is unchanged", async () => {
    authMock.mockResolvedValue({ user: { id: "teacher-user-1", role: "TEACHER" } });
    findUniqueMock.mockResolvedValue(baseBooking());

    const res = await PATCH(
      new Request("http://localhost/api/bookings/booking-1", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ startsAt: "2026-05-24T01:00:00.000Z" }),
      }),
      { params: Promise.resolve({ bookingId: "booking-1" }) },
    );

    expect(res.status).toBe(200);
    expect(updateMock).not.toHaveBeenCalled();
    expect(patchMeetLessonEventMock).not.toHaveBeenCalled();
    const body = (await res.json()) as { calendarUpdated?: boolean };
    expect(body.calendarUpdated).toBe(true);
  });

  test("returns 409 when new start is not in the future", async () => {
    authMock.mockResolvedValue({ user: { id: "teacher-user-1", role: "TEACHER" } });
    findUniqueMock.mockResolvedValue(baseBooking());

    const res = await PATCH(
      new Request("http://localhost/api/bookings/booking-1", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ startsAt: "2026-05-10T10:00:00.000Z" }),
      }),
      { params: Promise.resolve({ bookingId: "booking-1" }) },
    );

    expect(res.status).toBe(409);
    expect(updateMock).not.toHaveBeenCalled();
  });

  test("updates booking and patches both calendar events when allowed", async () => {
    authMock.mockResolvedValue({ user: { id: "teacher-user-1", role: "TEACHER" } });
    findUniqueMock.mockResolvedValue(baseBooking());
    findFirstMock.mockResolvedValue(null);
    const newStart = new Date("2026-05-24T01:30:00.000Z");
    const newEnd = new Date("2026-05-24T02:10:00.000Z");
    updateMock.mockResolvedValue({
      id: "booking-1",
      startsAt: newStart,
      endsAt: newEnd,
      status: BookingStatus.CONFIRMED,
      googleEventId: "evt-teacher",
      googleCalendarId: "primary",
      studentGoogleEventId: "evt-student",
      studentId: "student-user-1",
    });

    const res = await PATCH(
      new Request("http://localhost/api/bookings/booking-1", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ startsAt: "2026-05-24T01:30:00.000Z" }),
      }),
      { params: Promise.resolve({ bookingId: "booking-1" }) },
    );

    expect(res.status).toBe(200);
    expect(updateMock).toHaveBeenCalledWith({
      where: { id: "booking-1" },
      data: { startsAt: newStart, endsAt: newEnd },
      select: expect.any(Object),
    });
    expect(patchMeetLessonEventMock).toHaveBeenCalledWith(
      expect.objectContaining({
        organizerUserId: "teacher-user-1",
        eventId: "evt-teacher",
        start: newStart,
        end: newEnd,
      }),
    );
    expect(patchMeetLessonEventMock).toHaveBeenCalledWith(
      expect.objectContaining({
        organizerUserId: "student-user-1",
        eventId: "evt-student",
        start: newStart,
        end: newEnd,
      }),
    );
    expect(revalidatePathMock).toHaveBeenCalled();
  });

  test("SUPER_ADMIN may reschedule another teacher booking", async () => {
    authMock.mockResolvedValue({ user: { id: "admin-1", role: "SUPER_ADMIN" } });
    findUniqueMock.mockResolvedValue(baseBooking());
    findFirstMock.mockResolvedValue(null);
    updateMock.mockResolvedValue({
      id: "booking-1",
      startsAt: new Date("2026-05-24T01:30:00.000Z"),
      endsAt: new Date("2026-05-24T02:10:00.000Z"),
      status: BookingStatus.CONFIRMED,
      googleEventId: "evt-teacher",
      googleCalendarId: "primary",
      studentGoogleEventId: "evt-student",
      studentId: "student-user-1",
    });

    const res = await PATCH(
      new Request("http://localhost/api/bookings/booking-1", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ startsAt: "2026-05-24T01:30:00.000Z" }),
      }),
      { params: Promise.resolve({ bookingId: "booking-1" }) },
    );

    expect(res.status).toBe(200);
    expect(updateMock).toHaveBeenCalled();
  });
});
