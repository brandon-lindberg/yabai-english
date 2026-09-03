import { beforeEach, describe, expect, test, vi } from "vitest";
import { BookingStatus } from "@/generated/prisma/client";

const {
  authMock,
  prismaMock,
  patchMeetMock,
  addAttendeeMock,
  removeAttendeeMock,
  reserveSeatMock,
  GroupClassFullErrorStub,
} = vi.hoisted(() => {
  class GroupClassFullErrorStub extends Error {
    constructor(message = "This class is full.") {
      super(message);
      this.name = "GroupClassFullError";
    }
  }
  return {
    authMock: vi.fn(),
    prismaMock: {
      booking: { findUnique: vi.fn(), findFirst: vi.fn(), update: vi.fn() },
      groupLessonSession: { findUnique: vi.fn() },
      $transaction: vi.fn(),
    },
    patchMeetMock: vi.fn(),
    addAttendeeMock: vi.fn(),
    removeAttendeeMock: vi.fn(),
    reserveSeatMock: vi.fn(),
    GroupClassFullErrorStub,
  };
});

vi.mock("@/auth", () => ({ auth: authMock }));
vi.mock("@/lib/prisma", () => ({ prisma: prismaMock }));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
vi.mock("@/lib/google-calendar", () => ({
  patchMeetLessonEvent: patchMeetMock,
  addMeetLessonEventAttendee: addAttendeeMock,
  removeMeetLessonEventAttendee: removeAttendeeMock,
}));
vi.mock("@/lib/group-lesson-session", () => ({
  reserveGroupSeat: reserveSeatMock,
  GroupClassFullError: GroupClassFullErrorStub,
}));

import { POST } from "@/app/api/bookings/[bookingId]/reschedule/route";

const NOW = new Date("2026-06-25T00:00:00.000Z");
/** 10:30 JST on a Sunday, matching the seeded slot. */
const NEW_START = "2026-07-05T01:30:00.000Z";

const teacherSlot = {
  id: "slot-1",
  dayOfWeek: 0,
  startMin: 10 * 60 + 30,
  endMin: 11 * 60 + 30,
  timezone: "Asia/Tokyo",
  recurrence: "WEEKLY",
  startsOn: new Date("2026-06-20T15:00:00.000Z"),
  endsOn: null,
  classLevelId: null,
  classTypeId: "ty-conv",
  assignedStudentId: null,
  teacherLessonOfferingId: "offer-group",
  teacherLessonOffering: { id: "offer-group", isGroup: true, groupSize: 4 },
};

function seatBooking(overrides: Record<string, unknown> = {}) {
  return {
    id: "booking-seat-1",
    studentId: "student-1",
    status: BookingStatus.CONFIRMED,
    startsAt: new Date("2026-06-28T01:30:00.000Z"),
    endsAt: new Date("2026-06-28T02:30:00.000Z"),
    rescheduleCount: 0,
    groupLessonSessionId: "sess-old",
    googleEventId: "evt-class-old",
    googleCalendarId: "primary",
    studentGoogleEventId: "evt-student-mirror",
    lessonProduct: { durationMin: 60 },
    student: {
      email: "bob@example.com",
      studentProfile: { timezone: "Asia/Tokyo" },
    },
    teacher: {
      id: "teacher-profile-1",
      userId: "teacher-user-1",
      calendarId: "primary",
      googleCalendarRefreshToken: null,
      availabilitySlots: [teacherSlot],
      availabilityOccurrenceSkips: [],
    },
    ...overrides,
  };
}

function reschedule() {
  return POST(
    new Request("http://localhost/api/bookings/booking-seat-1/reschedule", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ startsAt: NEW_START }),
    }),
    { params: Promise.resolve({ bookingId: "booking-seat-1" }) },
  );
}

describe("POST /api/bookings/[bookingId]/reschedule — a seat in a group class", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
    vi.setSystemTime(NOW);
    authMock.mockResolvedValue({ user: { id: "student-1", role: "STUDENT" } });
    prismaMock.booking.findUnique.mockResolvedValue(seatBooking());
    prismaMock.booking.update.mockResolvedValue({
      id: "booking-seat-1",
      startsAt: new Date(NEW_START),
      endsAt: new Date("2026-07-05T02:30:00.000Z"),
      rescheduleCount: 1,
    });
    prismaMock.booking.findFirst.mockResolvedValue(null);
    prismaMock.groupLessonSession.findUnique.mockResolvedValue(null);
    prismaMock.$transaction.mockImplementation(
      async (cb: (tx: unknown) => Promise<unknown>) => cb(prismaMock),
    );
    patchMeetMock.mockResolvedValue(true);
    addAttendeeMock.mockResolvedValue(true);
    removeAttendeeMock.mockResolvedValue(true);
    reserveSeatMock.mockResolvedValue("sess-new");
  });

  test("takes a seat in the class it is moving into", async () => {
    const res = await reschedule();

    expect(res.status).toBe(200);
    expect(reserveSeatMock).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({
        availabilitySlotId: "slot-1",
        capacity: 4,
        startsAt: new Date(NEW_START),
      }),
    );
  });

  test("moves the booking onto the new class", async () => {
    await reschedule();

    expect(prismaMock.booking.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ groupLessonSessionId: "sess-new" }),
      }),
    );
  });

  test("refuses to move into a class that is already full", async () => {
    reserveSeatMock.mockRejectedValue(new GroupClassFullErrorStub());

    const res = await reschedule();

    expect(res.status).toBe(409);
    await expect(res.json()).resolves.toEqual({ error: "This class is full." });
  });

  // Moving one student must not drag their classmates to a new time.
  test("never moves the old class's event", async () => {
    await reschedule();

    const patchedEventIds = patchMeetMock.mock.calls.map(
      ([args]) => (args as { eventId: string }).eventId,
    );
    expect(patchedEventIds).not.toContain("evt-class-old");
  });

  test("leaves the old class and joins the new one on the calendar", async () => {
    await reschedule();

    expect(removeAttendeeMock).toHaveBeenCalledWith(
      expect.objectContaining({
        eventId: "evt-class-old",
        attendeeEmail: "bob@example.com",
      }),
    );
  });

  // Their own mirrored copy is theirs, so that one does move.
  test("still moves the student's own copy of the lesson", async () => {
    await reschedule();

    expect(patchMeetMock).toHaveBeenCalledWith(
      expect.objectContaining({ eventId: "evt-student-mirror" }),
    );
  });

  test("a private lesson still moves its own event", async () => {
    prismaMock.booking.findUnique.mockResolvedValue(
      seatBooking({ groupLessonSessionId: null, googleEventId: "evt-private" }),
    );

    await reschedule();

    expect(patchMeetMock).toHaveBeenCalledWith(
      expect.objectContaining({ eventId: "evt-private" }),
    );
    expect(removeAttendeeMock).not.toHaveBeenCalled();
  });
});
