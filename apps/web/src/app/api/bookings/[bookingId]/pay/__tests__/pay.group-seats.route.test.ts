import { beforeEach, describe, expect, test, vi } from "vitest";
import { BookingStatus } from "@/generated/prisma/client";

/**
 * Every seat in a group class is treated as an individual lesson: its own
 * payment, its own platform fee at the teacher's tier, its own rung on the
 * monthly volume ladder.
 *
 * This is a characterization test. Nothing in `platform-fees.ts` or the pay
 * route was written for group classes — one booking and one payment per seat
 * already produces all of it. The test exists so it stays that way, and so
 * nobody later "optimises" group checkout into a single charge that skips the
 * fee. `platform-fees` is deliberately NOT mocked here: the real tier ladder
 * runs, or this proves nothing.
 */
const { authMock, prismaMock, createCheckoutMock } = vi.hoisted(() => ({
  authMock: vi.fn(),
  prismaMock: {
    $transaction: vi.fn(),
    booking: { findUnique: vi.fn(), update: vi.fn() },
    payment: { update: vi.fn(), count: vi.fn() },
    paymentLedgerEntry: { deleteMany: vi.fn(), createMany: vi.fn() },
    studentProfile: { upsert: vi.fn() },
    teacherTierState: { findUnique: vi.fn() },
  },
  createCheckoutMock: vi.fn(),
}));

vi.mock("@/auth", () => ({ auth: authMock }));
vi.mock("@/lib/prisma", () => ({ prisma: prismaMock }));
vi.mock("@/lib/stripe/stripe-connect", () => ({
  createStripeCheckoutSessionDirectCharge: createCheckoutMock,
  stripeConnectConfigured: () => true,
}));

import { POST } from "@/app/api/bookings/[bookingId]/pay/route";

/** The teacher asked ¥9,000 for a three-seat class; one seat is ¥3,000. */
const SEAT_YEN = 3000;
const CLASS_TOTAL_YEN = 9000;

function groupSeatBooking() {
  const startsAt = new Date("2026-05-02T00:00:00Z");
  return {
    id: "booking-1",
    studentId: "student-1",
    teacherId: "teacher-profile-1",
    status: BookingStatus.PENDING_PAYMENT,
    groupLessonSessionId: "sess-1",
    holdExpiresAt: new Date(Date.now() + 60 * 60 * 1000),
    startsAt,
    endsAt: new Date(startsAt.getTime() + 60 * 60 * 1000),
    quotedPriceYen: SEAT_YEN,
    lessonProduct: { nameEn: "Group 60", nameJa: "グループ 60" },
    teacher: {
      id: "teacher-profile-1",
      userId: "teacher-user-1",
      calendarId: "primary",
      googleCalendarRefreshToken: null,
      availabilitySlots: [{ timezone: "Asia/Tokyo" }],
      user: { email: "teacher@example.com" },
    },
    student: { id: "student-1", email: "student@example.com", name: "Bob" },
    payments: [
      {
        id: "payment-1",
        bookingId: "booking-1",
        teacherId: "teacher-profile-1",
        teacherPaymentAccountId: "payacct-1",
        provider: "STRIPE",
        method: "CARD",
        amountYen: SEAT_YEN,
        currency: "JPY",
        status: "CREATED",
        providerCheckoutId: null,
        providerPaymentId: null,
        checkoutUrl: "/book/checkout/booking-1",
        metadataJson: null,
        teacherPaymentAccount: {
          id: "payacct-1",
          provider: "STRIPE",
          providerAccountId: "acct_123",
        },
      },
    ],
  };
}

function payForSeat() {
  return POST(
    new Request("http://localhost/api/bookings/booking-1/pay", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ acceptedMarketplaceTerms: true }),
    }),
    { params: Promise.resolve({ bookingId: "booking-1" }) },
  );
}

function feeCharged() {
  const [args] = createCheckoutMock.mock.calls[0] as [
    { amountYen: number; applicationFeeAmountYen: number },
  ];
  return args;
}

describe("POST /api/bookings/[bookingId]/pay — group seats", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    authMock.mockResolvedValue({ user: { id: "student-1", role: "STUDENT" } });
    const booking = groupSeatBooking();
    prismaMock.booking.findUnique.mockResolvedValue(booking);
    prismaMock.booking.update.mockResolvedValue(booking);
    prismaMock.payment.update.mockImplementation(async ({ data }: { data: unknown }) => ({
      ...booking.payments[0],
      ...(data as object),
    }));
    prismaMock.payment.count.mockResolvedValue(0);
    prismaMock.teacherTierState.findUnique.mockResolvedValue({
      calculatedTier: "TIER_1",
      overrideTier: null,
      overrideStartsAt: null,
      overrideExpiresAt: null,
    });
    prismaMock.paymentLedgerEntry.deleteMany.mockResolvedValue({ count: 0 });
    prismaMock.paymentLedgerEntry.createMany.mockResolvedValue({ count: 2 });
    prismaMock.studentProfile.upsert.mockResolvedValue({ id: "student-profile-1" });
    prismaMock.$transaction.mockImplementation(
      async (cb: (tx: typeof prismaMock) => Promise<unknown>) => cb(prismaMock),
    );
    createCheckoutMock.mockResolvedValue({
      id: "cs_test_1",
      url: "https://checkout.stripe.test/cs_test_1",
      payment_intent: "pi_test_1",
    });
  });

  test("takes the fee on the seat's share, not on the price of the class", async () => {
    await payForSeat();

    // TIER_1, first paid lesson of the month: 20%.
    expect(feeCharged()).toMatchObject({
      amountYen: SEAT_YEN,
      applicationFeeAmountYen: 600,
    });
    // What it must never be: 20% of the whole class.
    expect(feeCharged().applicationFeeAmountYen).not.toBe(CLASS_TOTAL_YEN * 0.2);
  });

  test("writes a fee and a net entry for this seat alone", async () => {
    await payForSeat();

    const [args] = prismaMock.paymentLedgerEntry.createMany.mock.calls[0] as [
      { data: Array<{ paymentId: string; type: string; amountYen: number }> },
    ];
    expect(args.data).toEqual([
      { paymentId: "payment-1", type: "PLATFORM_FEE", amountYen: 600 },
      { paymentId: "payment-1", type: "TEACHER_NET", amountYen: SEAT_YEN - 600 },
    ]);
  });

  test("counts the seat toward the ladder like any other lesson", async () => {
    await payForSeat();

    const [args] = prismaMock.payment.count.mock.calls[0] as [
      { where: Record<string, unknown> },
    ];
    // No group exemption of any kind: seats are counted, full stop. This is
    // the decision — a five-seat class advances the teacher five rungs.
    expect(args.where).toMatchObject({
      teacherId: "teacher-profile-1",
      status: "SUCCEEDED",
    });
    expect(JSON.stringify(args.where)).not.toContain("groupLessonSession");
  });

  test("follows the teacher down the ladder as the month fills up", async () => {
    // Ordinal 6 in a TIER_1 month is the 15% band.
    prismaMock.payment.count.mockResolvedValue(5);
    await payForSeat();

    expect(feeCharged().applicationFeeAmountYen).toBe(450);
  });

  // The documented consequence of counting per payment: the ordinal advances
  // between classmates, so two seats in one class can bill at different rates.
  test("bills two seats of one class differently across a band edge", async () => {
    prismaMock.payment.count.mockResolvedValue(4);
    await payForSeat();
    const fifthSeat = feeCharged().applicationFeeAmountYen;

    vi.clearAllMocks();
    createCheckoutMock.mockResolvedValue({
      id: "cs_test_2",
      url: "https://checkout.stripe.test/cs_test_2",
      payment_intent: "pi_test_2",
    });
    prismaMock.payment.count.mockResolvedValue(5);
    await payForSeat();
    const sixthSeat = feeCharged().applicationFeeAmountYen;

    expect(fifthSeat).toBe(600); // 20%
    expect(sixthSeat).toBe(450); // 15%
  });

  test("honours a teacher on the lowest tier", async () => {
    prismaMock.teacherTierState.findUnique.mockResolvedValue({
      calculatedTier: "TIER_3",
      overrideTier: null,
      overrideStartsAt: null,
      overrideExpiresAt: null,
    });
    await payForSeat();

    expect(feeCharged().applicationFeeAmountYen).toBe(300); // flat 10%
  });

  test("records the tier it billed against on the seat's payment", async () => {
    await payForSeat();

    const [args] = prismaMock.payment.update.mock.calls[0] as [
      { data: { metadataJson: Record<string, unknown> } },
    ];
    expect(args.data.metadataJson).toMatchObject({
      effectiveTier: "TIER_1",
      rateBps: 2000,
      applicationFeeAmountYen: 600,
      paidLessonOrdinal: 1,
    });
  });
});
