import { beforeEach, describe, expect, test, vi } from "vitest";
import { BookingStatus } from "@/generated/prisma/client";

const { authMock, prismaMock } = vi.hoisted(
  () => ({
    authMock: vi.fn(),
    prismaMock: {
      booking: { findUnique: vi.fn() },
      payment: { update: vi.fn() },
    },
  }),
);

vi.mock("@/auth", () => ({ auth: authMock }));
vi.mock("@/lib/prisma", () => ({ prisma: prismaMock }));

import { POST } from "@/app/api/bookings/[bookingId]/pay/route";

describe("POST /api/bookings/[bookingId]/pay", () => {
  const startsAt = new Date("2026-05-02T00:00:00Z");

  beforeEach(() => {
    vi.clearAllMocks();
    authMock.mockResolvedValue({ user: { id: "student-1", role: "STUDENT" } });
    const baseBooking = {
      id: "booking-1",
      studentId: "student-1",
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
      },
      payments: [
        {
          id: "payment-1",
          provider: "STRIPE",
          method: "CARD",
          providerCheckoutId: null,
          checkoutUrl: "/book/checkout/booking-1",
        },
      ],
    };
    prismaMock.booking.findUnique.mockResolvedValue(baseBooking);
    prismaMock.payment.update.mockImplementation(async ({ data }: { data: unknown }) => ({
      ...baseBooking.payments[0],
      ...(data as object),
    }));
  });

  test("starts checkout without confirming the booking", async () => {
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
        checkoutUrl: "/book/checkout/booking-1",
      }),
    );
    expect(prismaMock.payment.update).toHaveBeenCalledWith({
      where: { id: "payment-1" },
      data: expect.objectContaining({
        status: "REQUIRES_ACTION",
        providerCheckoutId: "stripe_checkout_payment-1",
      }),
    });
  });
});
