import { beforeEach, describe, expect, test, vi } from "vitest";
import { BookingStatus } from "@/generated/prisma/client";

const {
  authMock,
  prismaMock,
  deleteEventMock,
  issueRefundMock,
  notifyStuckRefundMock,
  notifyUserMock,
} = vi.hoisted(() => ({
  authMock: vi.fn(),
  prismaMock: {
    groupLessonSession: { findUnique: vi.fn(), update: vi.fn() },
    booking: { update: vi.fn() },
  },
  deleteEventMock: vi.fn(),
  issueRefundMock: vi.fn(),
  notifyStuckRefundMock: vi.fn(),
  notifyUserMock: vi.fn(),
}));

vi.mock("@/auth", () => ({ auth: authMock }));
vi.mock("@/lib/prisma", () => ({ prisma: prismaMock }));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
vi.mock("@/lib/google-calendar", () => ({ deleteMeetLessonEvent: deleteEventMock }));
vi.mock("@/lib/payment-refunds", () => ({
  issueAutomaticRefundForBooking: issueRefundMock,
}));
vi.mock("@/lib/refund-notifications", () => ({
  notifySuperAdminsOfStuckRefund: notifyStuckRefundMock,
}));
vi.mock("@/lib/notifications", () => ({ createUserNotification: notifyUserMock }));

import { POST } from "@/app/api/group-lesson-sessions/[sessionId]/cancel/route";

const NOW = new Date("2026-07-01T00:00:00.000Z");

function seat(id: string, studentId: string) {
  return {
    id,
    studentId,
    status: BookingStatus.CONFIRMED,
    startsAt: new Date("2026-07-05T01:30:00.000Z"),
    quotedPriceYen: 3000,
    student: { id: studentId, name: `Student ${studentId}` },
    payments: [
      {
        id: `pay-${id}`,
        provider: "STRIPE",
        amountYen: 3000,
        status: "SUCCEEDED",
        providerPaymentId: `pi-${id}`,
        teacherPaymentAccount: { providerAccountId: "acct_123" },
      },
    ],
  };
}

function groupSession(overrides: Record<string, unknown> = {}) {
  return {
    id: "sess-1",
    cancelledAt: null,
    googleEventId: "evt-class",
    googleCalendarId: "primary",
    teacher: {
      userId: "teacher-user-1",
      calendarId: "primary",
      googleCalendarRefreshToken: null,
    },
    bookings: [seat("bk-1", "stu-1"), seat("bk-2", "stu-2"), seat("bk-3", "stu-3")],
    ...overrides,
  };
}

function cancelClass() {
  return POST(new Request("http://localhost/api/group-lesson-sessions/sess-1/cancel"), {
    params: Promise.resolve({ sessionId: "sess-1" }),
  });
}

describe("POST /api/group-lesson-sessions/[sessionId]/cancel", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
    vi.setSystemTime(NOW);
    authMock.mockResolvedValue({ user: { id: "teacher-user-1", role: "TEACHER" } });
    prismaMock.groupLessonSession.findUnique.mockResolvedValue(groupSession());
    prismaMock.groupLessonSession.update.mockResolvedValue({});
    prismaMock.booking.update.mockResolvedValue({});
    deleteEventMock.mockResolvedValue(true);
    issueRefundMock.mockResolvedValue({ id: "refund-1", status: "SUCCEEDED", amountYen: 3000 });
  });

  test("cancels every seat in the class", async () => {
    const res = await cancelClass();

    expect(res.status).toBe(200);
    await expect(res.json()).resolves.toMatchObject({ ok: true, cancelledSeats: 3 });
    expect(prismaMock.booking.update).toHaveBeenCalledTimes(3);
    for (const [args] of prismaMock.booking.update.mock.calls) {
      expect(args).toMatchObject({ data: { status: BookingStatus.CANCELLED } });
    }
  });

  test("refunds every student, one seat at a time", async () => {
    await cancelClass();

    expect(issueRefundMock).toHaveBeenCalledTimes(3);
    const bookingIds = issueRefundMock.mock.calls.map(
      ([, args]) => (args as { booking: { id: string } }).booking.id,
    );
    expect(bookingIds).toEqual(["bk-1", "bk-2", "bk-3"]);
  });

  // A teacher calling off a class refunds in full however close it lands, so
  // nobody is left paying for a lesson that will not happen.
  test("refunds in full even inside the student cancellation window", async () => {
    prismaMock.groupLessonSession.findUnique.mockResolvedValue(
      groupSession({
        bookings: [
          { ...seat("bk-late", "stu-1"), startsAt: new Date("2026-07-01T02:00:00.000Z") },
        ],
      }),
    );

    await cancelClass();

    const [, args] = issueRefundMock.mock.calls[0] as [
      unknown,
      { policy: { refundEligible: boolean }; actor: string },
    ];
    expect(args.policy.refundEligible).toBe(true);
    expect(args.actor).toBe("TEACHER");
  });

  test("closes the class so no one can take a seat being emptied", async () => {
    await cancelClass();

    expect(prismaMock.groupLessonSession.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: "sess-1" },
        data: { cancelledAt: expect.any(Date) },
      }),
    );
    // Closed before the seats are emptied, not after.
    expect(
      prismaMock.groupLessonSession.update.mock.invocationCallOrder[0]!,
    ).toBeLessThan(prismaMock.booking.update.mock.invocationCallOrder[0]!);
  });

  test("tells every student the class is off", async () => {
    await cancelClass();

    expect(notifyUserMock).toHaveBeenCalledTimes(3);
    const userIds = notifyUserMock.mock.calls.map(
      ([args]) => (args as { userId: string }).userId,
    );
    expect(userIds).toEqual(["stu-1", "stu-2", "stu-3"]);
  });

  // The one place deleting the shared event is right: the class really is off.
  test("takes the class off the calendar", async () => {
    await cancelClass();

    expect(deleteEventMock).toHaveBeenCalledWith(
      expect.objectContaining({ eventId: "evt-class" }),
    );
  });

  // One failed refund must not leave the other students cancelled and unpaid.
  test("carries on refunding after one seat fails", async () => {
    issueRefundMock
      .mockRejectedValueOnce(new Error("Stripe said no"))
      .mockResolvedValue({ id: "refund-2", status: "SUCCEEDED", amountYen: 3000 });

    const res = await cancelClass();

    expect(res.status).toBe(200);
    expect(issueRefundMock).toHaveBeenCalledTimes(3);
    expect(prismaMock.booking.update).toHaveBeenCalledTimes(3);
    expect(notifyStuckRefundMock).toHaveBeenCalledWith(
      expect.objectContaining({ note: "Stripe said no" }),
    );
  });

  test("refuses a class belonging to another teacher", async () => {
    authMock.mockResolvedValue({ user: { id: "someone-else", role: "TEACHER" } });

    const res = await cancelClass();

    expect(res.status).toBe(403);
    expect(prismaMock.booking.update).not.toHaveBeenCalled();
  });

  test("refuses students outright", async () => {
    authMock.mockResolvedValue({ user: { id: "stu-1", role: "STUDENT" } });

    const res = await cancelClass();

    expect(res.status).toBe(403);
  });

  test("refuses to cancel a class twice", async () => {
    prismaMock.groupLessonSession.findUnique.mockResolvedValue(
      groupSession({ cancelledAt: new Date("2026-06-30T00:00:00.000Z") }),
    );

    const res = await cancelClass();

    expect(res.status).toBe(409);
    expect(issueRefundMock).not.toHaveBeenCalled();
  });
});
