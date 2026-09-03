import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import { BookingStatus, LessonTier } from "@/generated/prisma/client";

const { authMock, prismaMock } = vi.hoisted(() => ({
  authMock: vi.fn(),
  prismaMock: {
    lessonProduct: { findFirst: vi.fn() },
    teacherProfile: { findFirst: vi.fn() },
    teacherRosterEntry: { findFirst: vi.fn() },
    chatThread: { findUnique: vi.fn() },
    booking: { findFirst: vi.fn() },
    groupLessonSession: { findUnique: vi.fn() },
    schoolScheduleSlot: { findMany: vi.fn() },
    teacherStudentLessonRate: { findUnique: vi.fn() },
    freeTrialRedemption: { findUnique: vi.fn(), create: vi.fn() },
    user: { findUnique: vi.fn() },
    $transaction: vi.fn(),
  },
}));

vi.mock("@/auth", () => ({ auth: authMock }));
vi.mock("@/lib/prisma", () => ({ prisma: prismaMock }));
vi.mock("@/lib/notifications", () => ({ createUserNotification: vi.fn() }));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));

import { POST } from "@/app/api/bookings/route";

const BOOKING_NOW = new Date("2026-07-01T00:00:00.000Z");
/** 10:30 JST on a Sunday, matching the seeded slot. */
const SLOT_START = "2026-07-05T01:30:00.000Z";

/** Captures what the transaction was asked to do, so seats can be asserted. */
let txSpies: {
  createMany: ReturnType<typeof vi.fn>;
  findUnique: ReturnType<typeof vi.fn>;
  count: ReturnType<typeof vi.fn>;
  bookingCreate: ReturnType<typeof vi.fn>;
};

function seatTransaction({
  taken = 0,
  session = { id: "sess-1", capacity: 3, cancelledAt: null },
}: {
  taken?: number;
  session?: { id: string; capacity: number; cancelledAt: Date | null } | null;
} = {}) {
  txSpies = {
    createMany: vi.fn().mockResolvedValue({ count: 1 }),
    findUnique: vi.fn().mockResolvedValue(session),
    count: vi.fn().mockResolvedValue(taken),
    bookingCreate: vi.fn().mockResolvedValue({
      id: "booking-1",
      status: BookingStatus.PENDING_PAYMENT,
      quotedPriceYen: 3000,
      lessonProduct: { nameEn: "Group 60", nameJa: "グループ 60" },
      teacher: { user: { email: "teacher@example.com" } },
    }),
  };

  prismaMock.$transaction.mockImplementation(async (cb: (tx: unknown) => Promise<unknown>) =>
    cb({
      studentProfile: { findUnique: vi.fn().mockResolvedValue({ userId: "student-1" }) },
      groupLessonSession: {
        createMany: txSpies.createMany,
        findUnique: txSpies.findUnique,
      },
      booking: { count: txSpies.count, create: txSpies.bookingCreate },
      teacherRosterEntry: {
        upsert: vi.fn().mockResolvedValue({}),
        deleteMany: vi.fn().mockResolvedValue({ count: 0 }),
      },
      user: { findUnique: vi.fn().mockResolvedValue({ email: "student@example.com" }) },
    }),
  );
}

function bookSeat() {
  return POST(
    new Request("http://localhost/api/bookings", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        lessonProductId: "lp-60",
        teacherProfileId: "teacher-profile-1",
        teacherLessonOfferingId: "offer-group",
        startsAt: SLOT_START,
      }),
    }),
  );
}

describe("POST /api/bookings group seats", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
    vi.setSystemTime(BOOKING_NOW);
    authMock.mockResolvedValue({ user: { id: "student-1", role: "STUDENT" } });
    prismaMock.lessonProduct.findFirst.mockResolvedValue({
      id: "lp-60",
      tier: LessonTier.STANDARD,
      active: true,
      durationMin: 60,
      nameEn: "Group 60",
      nameJa: "グループ 60",
    });
    prismaMock.teacherProfile.findFirst.mockResolvedValue({
      id: "teacher-profile-1",
      userId: "teacher-user-1",
      offersFreeTrial: true,
      marketplaceHidden: false,
      rateYen: 3000,
      user: { email: "teacher@example.com", organizationMemberships: [] },
      lessonOfferings: [
        {
          id: "offer-group",
          durationMin: 60,
          // What ONE student pays. The teacher asked ¥9,000 for the class.
          rateYen: 3000,
          groupTotalRateYen: 9000,
          isGroup: true,
          groupSize: 3,
          active: true,
          classTypeId: "ty-conv",
          classType: null,
        },
      ],
      availabilitySlots: [
        {
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
          teacherLessonOfferingId: "offer-group",
          assignedStudentId: null,
        },
      ],
      availabilityOccurrenceSkips: [],
    });
    prismaMock.teacherRosterEntry.findFirst.mockResolvedValue(null);
    prismaMock.chatThread.findUnique.mockResolvedValue(null);
    prismaMock.booking.findFirst.mockResolvedValue(null);
    prismaMock.groupLessonSession.findUnique.mockResolvedValue(null);
    prismaMock.schoolScheduleSlot.findMany.mockResolvedValue([]);
    prismaMock.teacherStudentLessonRate.findUnique.mockResolvedValue(null);
    prismaMock.freeTrialRedemption.findUnique.mockResolvedValue(null);
    prismaMock.user.findUnique.mockResolvedValue({
      id: "student-1",
      email: "student@example.com",
      studentProfile: { timezone: "Asia/Tokyo" },
    });
    seatTransaction();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  test("seats the first student and hangs the booking off the class", async () => {
    const res = await bookSeat();

    expect(res.status).toBe(200);
    expect(txSpies.createMany).toHaveBeenCalled();
    expect(txSpies.bookingCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ groupLessonSessionId: "sess-1" }),
      }),
    );
  });

  test("charges the per-student share, not the price of the whole class", async () => {
    await bookSeat();

    const [args] = txSpies.bookingCreate.mock.calls[0] as [
      { data: { quotedPriceYen: number } },
    ];
    expect(args.data.quotedPriceYen).toBe(3000);
  });

  test("seats a second student in the class the first one opened", async () => {
    prismaMock.groupLessonSession.findUnique.mockResolvedValue({ id: "sess-1" });
    seatTransaction({ taken: 1 });

    const res = await bookSeat();
    expect(res.status).toBe(200);
  });

  test("refuses the student who would take a seat past capacity", async () => {
    seatTransaction({ taken: 3 });

    const res = await bookSeat();
    expect(res.status).toBe(409);
    await expect(res.json()).resolves.toEqual({ error: "This class is full." });
  });

  // The whole point: the classmates already booked overlap this booking, and
  // must not read as the teacher being double-booked.
  test("forgives the classmates already seated when checking the calendar", async () => {
    prismaMock.groupLessonSession.findUnique.mockResolvedValue({ id: "sess-1" });
    seatTransaction({ taken: 1 });

    await bookSeat();

    const [args] = prismaMock.booking.findFirst.mock.calls[0] as [
      { where: { AND?: Array<{ OR?: Array<Record<string, unknown>> }> } },
    ];
    const forgiveness = args.where.AND?.find((entry) =>
      entry.OR?.some((branch) => "groupLessonSessionId" in branch),
    );
    expect(forgiveness?.OR).toContainEqual({ groupLessonSessionId: { not: "sess-1" } });
  });

  test("a private lesson at that time still blocks the class", async () => {
    prismaMock.groupLessonSession.findUnique.mockResolvedValue({ id: "sess-1" });
    prismaMock.booking.findFirst.mockResolvedValue({ id: "private-lesson" });

    const res = await bookSeat();
    expect(res.status).toBe(409);
    expect(prismaMock.$transaction).not.toHaveBeenCalled();
  });

  test("refuses a student who already holds a seat in this class", async () => {
    prismaMock.groupLessonSession.findUnique.mockResolvedValue({ id: "sess-1" });
    seatTransaction({ taken: 1 });
    // What the partial unique index raises for a second live seat.
    txSpies.bookingCreate.mockRejectedValue(
      Object.assign(new Error("Unique constraint failed"), { code: "P2002" }),
    );

    const res = await bookSeat();
    expect(res.status).toBe(409);
    await expect(res.json()).resolves.toEqual({
      error: "You already have a seat in this class.",
    });
  });

  test("a private offering never opens a class", async () => {
    const teacher = await prismaMock.teacherProfile.findFirst();
    prismaMock.teacherProfile.findFirst.mockResolvedValue({
      ...teacher,
      lessonOfferings: [
        { ...teacher.lessonOfferings[0], isGroup: false, groupSize: null, rateYen: 5000 },
      ],
    });

    await bookSeat();

    expect(prismaMock.groupLessonSession.findUnique).not.toHaveBeenCalled();
    expect(txSpies.createMany).not.toHaveBeenCalled();
    const [args] = txSpies.bookingCreate.mock.calls[0] as [
      { data: { groupLessonSessionId: string | null } },
    ];
    expect(args.data.groupLessonSessionId).toBeNull();
  });
});
