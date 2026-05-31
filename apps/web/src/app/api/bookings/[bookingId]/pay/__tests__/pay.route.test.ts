import { beforeEach, describe, expect, test, vi } from "vitest";
import { BookingStatus } from "@/generated/prisma/client";

const { authMock, prismaMock, createCheckoutMock, calculateFeeMock } = vi.hoisted(
  () => ({
    authMock: vi.fn(),
    prismaMock: {
      booking: { findUnique: vi.fn() },
      payment: { update: vi.fn() },
      paymentLedgerEntry: { deleteMany: vi.fn(), createMany: vi.fn() },
    },
    createCheckoutMock: vi.fn(),
    calculateFeeMock: vi.fn(),
  }),
);

vi.mock("@/auth", () => ({ auth: authMock }));
vi.mock("@/lib/prisma", () => ({ prisma: prismaMock }));
vi.mock("@/lib/stripe/stripe-connect", () => ({
  createStripeCheckoutSessionDirectCharge: createCheckoutMock,
  stripeConnectConfigured: () => true,
}));
vi.mock("@/lib/platform-fees", () => ({
  calculateMonthlyPlatformFeeForTeacher: calculateFeeMock,
}));

import { POST } from "@/app/api/bookings/[bookingId]/pay/route";

describe("POST /api/bookings/[bookingId]/pay", () => {
  const startsAt = new Date("2026-05-02T00:00:00Z");

  beforeEach(() => {
    vi.clearAllMocks();
    authMock.mockResolvedValue({ user: { id: "student-1", role: "STUDENT" } });
    const baseBooking = {
      id: "booking-1",
      studentId: "student-1",
      teacherId: "teacher-profile-1",
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
        studentProfile: { stripeCustomerId: null },
      },
      payments: [
        {
          id: "payment-1",
          bookingId: "booking-1",
          teacherId: "teacher-profile-1",
          teacherPaymentAccountId: "payacct-1",
          provider: "STRIPE",
          method: "CARD",
          amountYen: 3500,
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
    prismaMock.booking.findUnique.mockResolvedValue(baseBooking);
    prismaMock.payment.update.mockImplementation(async ({ data }: { data: unknown }) => ({
      ...baseBooking.payments[0],
      ...(data as object),
    }));
    prismaMock.paymentLedgerEntry.deleteMany.mockResolvedValue({ count: 0 });
    prismaMock.paymentLedgerEntry.createMany.mockResolvedValue({ count: 2 });
    calculateFeeMock.mockResolvedValue({
      feePolicyVersion: "teacher-tiered-monthly-volume-v1",
      calculatedTier: "TIER_1",
      effectiveTier: "TIER_2",
      teacherTier: "TIER_2",
      overrideActive: true,
      periodTimeZone: "Asia/Tokyo",
      periodStart: new Date("2026-04-30T15:00:00.000Z"),
      periodEnd: new Date("2026-05-31T15:00:00.000Z"),
      paidLessonOrdinal: 6,
      rateBps: 1500,
      applicationFeeAmountYen: 525,
    });
    createCheckoutMock.mockResolvedValue({
      id: "cs_test_123",
      url: "https://checkout.stripe.com/c/pay/cs_test_123",
      payment_intent: "pi_test_123",
    });
  });

  test("starts direct-charge Stripe checkout without confirming the booking", async () => {
    const res = await POST(
      new Request("http://localhost/api/bookings/booking-1/pay", { method: "POST" }),
      { params: Promise.resolve({ bookingId: "booking-1" }) },
    );

    expect(res.status).toBe(200);
    await expect(res.json()).resolves.toEqual(
      expect.objectContaining({
        ok: true,
        paymentId: "payment-1",
        provider: "STRIPE",
        method: "CARD",
        checkoutUrl: "https://checkout.stripe.com/c/pay/cs_test_123",
      }),
    );
    expect(calculateFeeMock).toHaveBeenCalledWith(
      expect.anything(),
      {
        teacherId: "teacher-profile-1",
        amountYen: 3500,
        at: expect.any(Date),
      },
    );
    expect(createCheckoutMock).toHaveBeenCalledWith(
      expect.objectContaining({
        connectedAccountId: "acct_123",
        paymentId: "payment-1",
        bookingId: "booking-1",
        amountYen: 3500,
        applicationFeeAmountYen: 525,
        customerEmail: "student@example.com",
        savePaymentMethod: true,
      }),
    );
    expect(prismaMock.payment.update).toHaveBeenCalledWith({
      where: { id: "payment-1" },
      data: expect.objectContaining({
        status: "REQUIRES_ACTION",
        providerCheckoutId: "cs_test_123",
        providerPaymentId: "pi_test_123",
        checkoutUrl: "https://checkout.stripe.com/c/pay/cs_test_123",
        metadataJson: expect.objectContaining({
          chargeType: "DIRECT_CHARGE",
          feePolicyVersion: "teacher-tiered-monthly-volume-v1",
          calculatedTier: "TIER_1",
          effectiveTier: "TIER_2",
          teacherTier: "TIER_2",
          overrideActive: true,
          applicationFeeAmountYen: 525,
        }),
      }),
    });
    expect(prismaMock.paymentLedgerEntry.deleteMany).toHaveBeenCalledWith({
      where: {
        paymentId: "payment-1",
        type: { in: ["PLATFORM_FEE", "TEACHER_NET"] },
      },
    });
    expect(prismaMock.paymentLedgerEntry.createMany).toHaveBeenCalledWith({
      data: [
        { paymentId: "payment-1", type: "PLATFORM_FEE", amountYen: 525 },
        { paymentId: "payment-1", type: "TEACHER_NET", amountYen: 2975 },
      ],
    });
  });

  test("passes existing Stripe customer id and skips savePaymentMethod when student has one", async () => {
    const baseBooking = {
      id: "booking-1",
      studentId: "student-1",
      teacherId: "teacher-profile-1",
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
        studentProfile: { stripeCustomerId: "cus_existing" },
      },
      payments: [
        {
          id: "payment-1",
          bookingId: "booking-1",
          teacherId: "teacher-profile-1",
          teacherPaymentAccountId: "payacct-1",
          provider: "STRIPE",
          method: "CARD",
          amountYen: 3500,
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
    prismaMock.booking.findUnique.mockResolvedValue(baseBooking);

    const res = await POST(
      new Request("http://localhost/api/bookings/booking-1/pay", { method: "POST" }),
      { params: Promise.resolve({ bookingId: "booking-1" }) },
    );

    expect(res.status).toBe(200);
    expect(createCheckoutMock).toHaveBeenCalledWith(
      expect.objectContaining({
        customerId: "cus_existing",
        savePaymentMethod: false,
      }),
    );
  });
});
