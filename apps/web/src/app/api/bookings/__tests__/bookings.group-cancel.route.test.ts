import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import { BookingStatus } from "@/generated/prisma/client";

const {
  authMock,
  findUniqueMock,
  updateMock,
  deleteMeetLessonEventMock,
  removeAttendeeMock,
  issueRefundMock,
} = vi.hoisted(() => ({
  authMock: vi.fn(),
  findUniqueMock: vi.fn(),
  updateMock: vi.fn(),
  deleteMeetLessonEventMock: vi.fn(),
  removeAttendeeMock: vi.fn(),
  issueRefundMock: vi.fn(),
}));

vi.mock("@/auth", () => ({ auth: authMock }));
vi.mock("@/lib/prisma", () => ({
  prisma: {
    freeTrialRedemption: { findUnique: vi.fn(), create: vi.fn() },
    booking: { findUnique: findUniqueMock, update: updateMock },
  },
}));
vi.mock("@/lib/google-calendar", () => ({
  deleteMeetLessonEvent: deleteMeetLessonEventMock,
  removeMeetLessonEventAttendee: removeAttendeeMock,
}));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
vi.mock("@/lib/payment-refunds", () => ({
  issueAutomaticRefundForBooking: issueRefundMock,
}));
vi.mock("@/lib/refund-notifications", () => ({
  notifySuperAdminsOfStuckRefund: vi.fn(),
}));

import { POST } from "@/app/api/bookings/[bookingId]/cancel/route";

const t0 = new Date("2026-04-10T12:00:00.000Z");

/** A seat in a class: its googleEventId is the CLASS's event, not its own. */
function seatBooking(overrides: Record<string, unknown> = {}) {
  return {
    id: "booking-seat-1",
    studentId: "student-user-1",
    teacherId: "teacher-profile-1",
    startsAt: new Date("2026-04-20T12:00:00.000Z"),
    endsAt: new Date("2026-04-20T13:00:00.000Z"),
    status: BookingStatus.CONFIRMED,
    groupLessonSessionId: "sess-1",
    googleEventId: "evt-class",
    googleCalendarId: "primary",
    studentGoogleEventId: "evt-student-mirror",
    quotedPriceYen: 3000,
    student: { name: "Bob", email: "bob@example.com" },
    teacher: {
      userId: "teacher-user-1",
      googleCalendarRefreshToken: null,
      calendarId: "primary",
    },
    payments: [],
    ...overrides,
  };
}

function cancelSeat() {
  return POST(new Request("http://localhost/api/bookings/booking-seat-1/cancel"), {
    params: Promise.resolve({ bookingId: "booking-seat-1" }),
  });
}

describe("POST /api/bookings/[bookingId]/cancel — a seat in a group class", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
    vi.setSystemTime(t0);
    authMock.mockResolvedValue({ user: { id: "student-user-1", role: "STUDENT" } });
    deleteMeetLessonEventMock.mockResolvedValue(true);
    removeAttendeeMock.mockResolvedValue(true);
    issueRefundMock.mockResolvedValue({ id: "refund-1", status: "SUCCEEDED" });
    updateMock.mockResolvedValue({
      id: "booking-seat-1",
      status: BookingStatus.CANCELLED,
      startsAt: new Date("2026-04-20T12:00:00.000Z"),
      endsAt: new Date("2026-04-20T13:00:00.000Z"),
    });
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  // The bug this phase exists to prevent: the event on a seat belongs to the
  // class, and deleting it takes the lesson off every classmate's calendar.
  test("never deletes the class's event", async () => {
    findUniqueMock.mockResolvedValue(seatBooking());

    await cancelSeat();

    const deletedEventIds = deleteMeetLessonEventMock.mock.calls.map(
      ([args]) => (args as { eventId: string }).eventId,
    );
    expect(deletedEventIds).not.toContain("evt-class");
  });

  test("takes the student off the class's guest list instead", async () => {
    findUniqueMock.mockResolvedValue(seatBooking());

    await cancelSeat();

    expect(removeAttendeeMock).toHaveBeenCalledWith(
      expect.objectContaining({
        eventId: "evt-class",
        attendeeEmail: "bob@example.com",
      }),
    );
  });

  // Their own mirrored copy is theirs to delete — only the class's is shared.
  test("still removes the student's own copy of the lesson", async () => {
    findUniqueMock.mockResolvedValue(seatBooking());

    await cancelSeat();

    expect(deleteMeetLessonEventMock).toHaveBeenCalledWith(
      expect.objectContaining({ eventId: "evt-student-mirror" }),
    );
  });

  test("frees the seat by cancelling the booking", async () => {
    findUniqueMock.mockResolvedValue(seatBooking());

    const res = await cancelSeat();

    expect(res.status).toBe(200);
    // Seats are counted from holding bookings, so CANCELLED frees one with
    // nothing else to update.
    expect(updateMock).toHaveBeenCalledWith(
      expect.objectContaining({
        data: { status: BookingStatus.CANCELLED },
      }),
    );
  });

  test("refunds only the cancelling student", async () => {
    findUniqueMock.mockResolvedValue(seatBooking());

    await cancelSeat();

    expect(issueRefundMock).toHaveBeenCalledTimes(1);
    // (prisma, payload) — the booking is on the second argument.
    const [, args] = issueRefundMock.mock.calls[0] as [unknown, { booking: { id: string } }];
    expect(args.booking.id).toBe("booking-seat-1");
  });

  test("a private lesson still deletes its own event", async () => {
    findUniqueMock.mockResolvedValue(
      seatBooking({ groupLessonSessionId: null, googleEventId: "evt-private" }),
    );

    await cancelSeat();

    expect(deleteMeetLessonEventMock).toHaveBeenCalledWith(
      expect.objectContaining({ eventId: "evt-private" }),
    );
    expect(removeAttendeeMock).not.toHaveBeenCalled();
  });
});
