import { beforeEach, describe, expect, test, vi } from "vitest";
import { BookingStatus } from "@/generated/prisma/client";

const {
  authMock,
  findUniqueMock,
  updateMock,
  bookingFindFirstMock,
  patchMeetMock,
  revalidatePathMock,
} = vi.hoisted(() => ({
  authMock: vi.fn(),
  findUniqueMock: vi.fn(),
  updateMock: vi.fn(),
  bookingFindFirstMock: vi.fn(),
  patchMeetMock: vi.fn(),
  revalidatePathMock: vi.fn(),
}));

vi.mock("@/auth", () => ({ auth: authMock }));
vi.mock("@/lib/prisma", () => ({
  prisma: {
    booking: {
      findUnique: findUniqueMock,
      update: updateMock,
      findFirst: bookingFindFirstMock,
    },
    groupLessonSession: { findUnique: vi.fn().mockResolvedValue(null) },
    // Taking a group seat and moving the booking onto it happen together, so
    // the update now runs inside a transaction.
    $transaction: (cb: (tx: unknown) => Promise<unknown>) =>
      cb({
        booking: { update: updateMock },
        groupLessonSession: { createMany: vi.fn(), findUnique: vi.fn() },
      }),
  },
}));
vi.mock("@/lib/google-calendar", () => ({
  patchMeetLessonEvent: patchMeetMock,
  addMeetLessonEventAttendee: vi.fn(),
  removeMeetLessonEventAttendee: vi.fn(),
}));
vi.mock("next/cache", () => ({ revalidatePath: revalidatePathMock }));

import { POST } from "@/app/api/bookings/[bookingId]/reschedule/route";

// Dates are derived from "now" rather than hardcoded, so the suite does not
// start failing the moment these times fall into the past.
// 02:00 UTC is 11:00 in Asia/Tokyo on the same calendar day, which is where the
// teacher's slot below sits (startMin 660).
function atTokyoElevenAm(daysFromNow: number): Date {
  const d = new Date(Date.now() + daysFromNow * 24 * 60 * 60 * 1000);
  d.setUTCHours(2, 0, 0, 0);
  return d;
}

const CURRENT_START = atTokyoElevenAm(30);
const NEW_START = atTokyoElevenAm(37); // same weekday, one week later
const SLOT_DAY_OF_WEEK = NEW_START.getUTCDay();
const OFF_SCHEDULE_START = atTokyoElevenAm(36); // a different weekday

function booking(overrides: Record<string, unknown> = {}) {
  return {
    id: "booking-1",
    studentId: "student-user-1",
    status: BookingStatus.CONFIRMED,
    startsAt: CURRENT_START,
    endsAt: new Date(CURRENT_START.getTime() + 30 * 60 * 1000),
    rescheduleCount: 0,
    quotedPriceYen: 5000,
    googleEventId: "gcal-1",
    googleCalendarId: null,
    studentGoogleEventId: null,
    lessonProduct: { durationMin: 30 },
    student: { studentProfile: { timezone: "Asia/Tokyo" } },
    teacher: {
      id: "teacher-profile-1",
      userId: "teacher-user-1",
      calendarId: "primary",
      googleCalendarRefreshToken: "token",
      availabilitySlots: [
        {
          id: "slot-1",
          dayOfWeek: SLOT_DAY_OF_WEEK,
          startMin: 660,
          endMin: 690,
          timezone: "Asia/Tokyo",
          recurrence: "WEEKLY",
          startsOn: null,
          endsOn: null,
          classLevelId: null,
          classTypeId: null,
        },
      ],
      availabilityOccurrenceSkips: [],
    },
    ...overrides,
  };
}

function request(body: Record<string, unknown>) {
  return new Request("http://localhost/api/bookings/booking-1/reschedule", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

const params = { params: Promise.resolve({ bookingId: "booking-1" }) };

describe("POST /api/bookings/[bookingId]/reschedule", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    authMock.mockResolvedValue({ user: { id: "student-user-1", role: "STUDENT" } });
    findUniqueMock.mockResolvedValue(booking());
    bookingFindFirstMock.mockResolvedValue(null);
    patchMeetMock.mockResolvedValue(true);
    updateMock.mockImplementation(async ({ data }: { data: Record<string, unknown> }) => ({
      ...booking(),
      ...data,
    }));
  });

  test("moves the lesson and leaves the payment alone", async () => {
    const res = await POST(request({ startsAt: NEW_START.toISOString() }), params);

    expect(res.status).toBe(200);
    const call = updateMock.mock.calls[0][0];
    expect(call.where).toEqual({ id: "booking-1" });
    expect(call.data.startsAt).toEqual(NEW_START);
    // The whole point: no refund, no re-charge, same booking row.
    expect(Object.keys(call.data)).not.toContain("quotedPriceYen");
    expect(Object.keys(call.data)).not.toContain("status");
  });

  test("counts the move so the cap can be enforced next time", async () => {
    await POST(request({ startsAt: NEW_START.toISOString() }), params);

    expect(updateMock.mock.calls[0][0].data.rescheduleCount).toBe(1);
  });

  test("moves the calendar event with it", async () => {
    await POST(request({ startsAt: NEW_START.toISOString() }), params);

    expect(patchMeetMock).toHaveBeenCalledWith(
      expect.objectContaining({ eventId: "gcal-1", start: NEW_START }),
    );
  });

  test("refuses a student who does not own the booking", async () => {
    authMock.mockResolvedValue({ user: { id: "someone-else", role: "STUDENT" } });

    const res = await POST(request({ startsAt: NEW_START.toISOString() }), params);

    expect(res.status).toBe(404);
    expect(updateMock).not.toHaveBeenCalled();
  });

  test("refuses once the student has used their reschedule", async () => {
    findUniqueMock.mockResolvedValue(booking({ rescheduleCount: 1 }));

    const res = await POST(request({ startsAt: NEW_START.toISOString() }), params);

    expect(res.status).toBe(409);
    expect((await res.json()).reason).toBe("LIMIT_REACHED");
    expect(updateMock).not.toHaveBeenCalled();
  });

  test("refuses an unpaid booking", async () => {
    findUniqueMock.mockResolvedValue(booking({ status: BookingStatus.PENDING_PAYMENT }));

    const res = await POST(request({ startsAt: NEW_START.toISOString() }), params);

    expect(res.status).toBe(409);
    expect((await res.json()).reason).toBe("NOT_CONFIRMED");
  });

  // The new time must be a slot the teacher actually published, which is what
  // makes this safe to do without asking the teacher to approve it.
  test("refuses a time outside the teacher's availability", async () => {
    const res = await POST(
      request({ startsAt: OFF_SCHEDULE_START.toISOString() }),
      params,
    );

    expect(res.status).toBe(409);
    expect(updateMock).not.toHaveBeenCalled();
  });

  test("refuses a time the teacher is already booked for", async () => {
    bookingFindFirstMock.mockResolvedValue({ id: "other-booking" });

    const res = await POST(request({ startsAt: NEW_START.toISOString() }), params);

    expect(res.status).toBe(409);
    expect(updateMock).not.toHaveBeenCalled();
  });

  test("rejects a malformed time", async () => {
    const res = await POST(request({ startsAt: "not-a-date" }), params);

    expect(res.status).toBe(400);
    expect(updateMock).not.toHaveBeenCalled();
  });
});
