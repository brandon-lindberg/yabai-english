import { beforeEach, describe, expect, test, vi } from "vitest";

const { authMock, prismaMock, retrieveAccountMock } = vi.hoisted(() => ({
  authMock: vi.fn(),
  prismaMock: {
    teacherProfile: { findUnique: vi.fn() },
    teacherPaymentAccount: { update: vi.fn() },
    teacherPaymentMethod: { upsert: vi.fn() },
  },
  retrieveAccountMock: vi.fn(),
}));

vi.mock("@/auth", () => ({ auth: authMock }));
vi.mock("@/lib/prisma", () => ({ prisma: prismaMock }));
vi.mock("@/lib/stripe/stripe-connect", () => ({
  retrieveStripeAccount: retrieveAccountMock,
  stripeConnectConfigured: () => true,
}));

import { POST } from "@/app/api/teacher/payment-accounts/stripe/sync/route";

describe("POST /api/teacher/payment-accounts/stripe/sync", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    authMock.mockResolvedValue({ user: { id: "teacher-user-1", role: "TEACHER" } });
    prismaMock.teacherProfile.findUnique.mockResolvedValue({
      id: "teacher-profile-1",
      paymentAccounts: [{ id: "payacct-1", providerAccountId: "acct_123" }],
    });
  });

  test("enables card method when Stripe account is ready", async () => {
    retrieveAccountMock.mockResolvedValue({
      id: "acct_123",
      charges_enabled: true,
      payouts_enabled: true,
      requirements: { currently_due: [], past_due: [] },
    });
    prismaMock.teacherPaymentAccount.update.mockResolvedValue({
      id: "payacct-1",
      provider: "STRIPE",
      providerAccountId: "acct_123",
      status: "ENABLED",
      chargesEnabled: true,
      payoutsEnabled: true,
      methods: [{ method: "CARD", enabled: true }],
    });

    const res = await POST();

    expect(res.status).toBe(200);
    expect(prismaMock.teacherPaymentAccount.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: "payacct-1" },
        data: expect.objectContaining({
          status: "ENABLED",
          chargesEnabled: true,
          payoutsEnabled: true,
        }),
      }),
    );
    expect(prismaMock.teacherPaymentMethod.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { accountId_method: { accountId: "payacct-1", method: "CARD" } },
        update: { enabled: true },
      }),
    );
  });

  test("does not expose card method when Stripe has requirements due", async () => {
    retrieveAccountMock.mockResolvedValue({
      id: "acct_123",
      charges_enabled: true,
      payouts_enabled: true,
      requirements: { currently_due: ["external_account"], past_due: [] },
    });
    prismaMock.teacherPaymentAccount.update.mockResolvedValue({
      id: "payacct-1",
      provider: "STRIPE",
      providerAccountId: "acct_123",
      status: "REQUIREMENTS_DUE",
      chargesEnabled: true,
      payoutsEnabled: true,
      methods: [{ method: "CARD", enabled: false }],
    });

    const res = await POST();

    expect(res.status).toBe(200);
    expect(prismaMock.teacherPaymentMethod.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        update: { enabled: false },
      }),
    );
  });

  test("does not sync a local dev Stripe account as a real Connect account", async () => {
    prismaMock.teacherProfile.findUnique.mockResolvedValue({
      id: "teacher-profile-1",
      paymentAccounts: [{ id: "payacct-1", providerAccountId: "acct_local_teacher-profile-1" }],
    });

    const res = await POST();

    expect(res.status).toBe(404);
    expect(retrieveAccountMock).not.toHaveBeenCalled();
  });
});
