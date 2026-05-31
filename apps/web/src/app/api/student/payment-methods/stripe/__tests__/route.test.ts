import { beforeEach, describe, expect, test, vi } from "vitest";

const {
  authMock,
  prismaMock,
  createCustomerMock,
  createSetupCheckoutMock,
  listCardSummaryMock,
} = vi.hoisted(() => ({
  authMock: vi.fn(),
  prismaMock: {
    studentProfile: { findUnique: vi.fn(), update: vi.fn() },
  },
  createCustomerMock: vi.fn(),
  createSetupCheckoutMock: vi.fn(),
  listCardSummaryMock: vi.fn(),
}));

vi.mock("@/auth", () => ({ auth: authMock }));
vi.mock("@/lib/prisma", () => ({ prisma: prismaMock }));
vi.mock("@/lib/stripe/stripe-connect", () => ({
  stripeConnectConfigured: () => true,
  createStripePlatformCustomer: createCustomerMock,
  createStripeSetupCheckoutSession: createSetupCheckoutMock,
  listStripeCustomerCardSummary: listCardSummaryMock,
}));

import { GET } from "@/app/api/student/payment-methods/stripe/route";
import { POST } from "@/app/api/student/payment-methods/stripe/setup/route";

describe("student Stripe payment methods", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.NEXT_PUBLIC_APP_URL = "http://localhost:3000";
    authMock.mockResolvedValue({
      user: { id: "student-user-1", role: "STUDENT", email: "student@example.com", name: "Student" },
    });
    prismaMock.studentProfile.findUnique.mockResolvedValue({
      id: "student-profile-1",
      stripeCustomerId: "cus_123",
    });
    listCardSummaryMock.mockResolvedValue({ brand: "visa", last4: "4242", expMonth: 12, expYear: 2030 });
  });

  test("GET returns saved card summary when a platform customer exists", async () => {
    const res = await GET();

    expect(res.status).toBe(200);
    await expect(res.json()).resolves.toEqual({
      ok: true,
      hasCustomer: true,
      savedCard: { brand: "visa", last4: "4242", expMonth: 12, expYear: 2030 },
    });
  });

  test("POST creates setup checkout for saving a payment method", async () => {
    createSetupCheckoutMock.mockResolvedValue({ url: "https://checkout.stripe.com/setup/test" });

    const res = await POST();

    expect(res.status).toBe(200);
    expect(createSetupCheckoutMock).toHaveBeenCalledWith(
      expect.objectContaining({
        customerId: "cus_123",
        successUrl: "http://localhost:3000/dashboard/settings?tab=payments&stripeSetup=return",
      }),
    );
    await expect(res.json()).resolves.toEqual({
      ok: true,
      setupUrl: "https://checkout.stripe.com/setup/test",
    });
  });

  test("POST creates a platform customer when the student has none yet", async () => {
    prismaMock.studentProfile.findUnique.mockResolvedValue({
      id: "student-profile-1",
      stripeCustomerId: null,
    });
    createCustomerMock.mockResolvedValue({ id: "cus_new" });
    prismaMock.studentProfile.update.mockResolvedValue({
      id: "student-profile-1",
      stripeCustomerId: "cus_new",
    });
    createSetupCheckoutMock.mockResolvedValue({ url: "https://checkout.stripe.com/setup/new" });

    const res = await POST();

    expect(res.status).toBe(200);
    expect(createCustomerMock).toHaveBeenCalledWith({
      email: "student@example.com",
      name: "Student",
    });
    expect(prismaMock.studentProfile.update).toHaveBeenCalled();
  });
});
