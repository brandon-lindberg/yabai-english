import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";

const { authMock, prismaMock, createConnectAccountMock, createAccountLinkMock } = vi.hoisted(() => ({
  authMock: vi.fn(),
  prismaMock: {
    teacherProfile: { findUnique: vi.fn() },
    teacherPaymentAccount: { upsert: vi.fn() },
  },
  createConnectAccountMock: vi.fn(),
  createAccountLinkMock: vi.fn(),
}));

vi.mock("@/auth", () => ({ auth: authMock }));
vi.mock("@/lib/prisma", () => ({ prisma: prismaMock }));
vi.mock("@/lib/stripe/stripe-connect", () => ({
  createStripeStandardAccount: createConnectAccountMock,
  createStripeAccountOnboardingLink: createAccountLinkMock,
  stripeConnectConfigured: () => true,
}));

import { POST } from "@/app/api/teacher/payment-accounts/stripe/connect/route";

afterEach(() => vi.unstubAllEnvs());
describe("POST /api/teacher/payment-accounts/stripe/connect", () => {
  test("Japanese domain keeps Stripe onboarding on that domain and reuses the account", async () => {
    vi.stubEnv("LEARNING_SITES_ENABLED", "true");
    vi.stubEnv("ENGLISH_SITE_URL", "https://englishstudiojapan.com");
    vi.stubEnv("JAPANESE_SITE_URL", "https://japanesestudio.love");
    prismaMock.teacherProfile.findUnique.mockResolvedValue({ id: "teacher-profile-1", paymentAccounts: [{ providerAccountId: "acct_existing" }] });
    expect((await POST(new Request("https://japanesestudio.love/api/teacher/payment-accounts/stripe/connect"))).status).toBe(200);
    expect(createConnectAccountMock).not.toHaveBeenCalled();
    expect(createAccountLinkMock).toHaveBeenCalledWith(expect.objectContaining({
      accountId: "acct_existing", returnUrl: "https://japanesestudio.love/dashboard/settings?tab=payments&stripe=return",
      refreshUrl: "https://japanesestudio.love/dashboard/settings?tab=payments&stripe=refresh",
    }));
  });
  test.each(["ENGLISH", "JAPANESE"])("%s reuses the teacher's existing connected account", async learningLanguage => {
    authMock.mockResolvedValue({ user: { id: "teacher-user-1", role: "TEACHER", learningLanguage } });
    prismaMock.teacherProfile.findUnique.mockResolvedValue({ id: "teacher-profile-1", paymentAccounts: [{ providerAccountId: "acct_existing" }] });
    expect((await POST()).status).toBe(200);
    expect(createConnectAccountMock).not.toHaveBeenCalled();
    expect(createAccountLinkMock).toHaveBeenCalledWith(expect.objectContaining({ accountId: "acct_existing" }));
    expect(prismaMock.teacherPaymentAccount.upsert.mock.calls[0][0].where).toEqual({ teacherId_provider: { teacherId: "teacher-profile-1", provider: "STRIPE" } });
  });
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.NEXT_PUBLIC_APP_URL = "http://localhost:3000";
    authMock.mockResolvedValue({ user: { id: "teacher-user-1", role: "TEACHER", email: "teacher@example.com" } });
    prismaMock.teacherProfile.findUnique.mockResolvedValue({ id: "teacher-profile-1" });
    createConnectAccountMock.mockResolvedValue({ id: "acct_123" });
    prismaMock.teacherPaymentAccount.upsert.mockResolvedValue({
      id: "payacct-1",
      provider: "STRIPE",
      providerAccountId: "acct_123",
      status: "PENDING",
      chargesEnabled: false,
      payoutsEnabled: false,
      methods: [],
    });
    createAccountLinkMock.mockResolvedValue({ url: "https://connect.stripe.com/setup/s/acct_123" });
  });

  test("creates a Standard connected account and onboarding link", async () => {
    const res = await POST();

    expect(res.status).toBe(200);
    expect(createConnectAccountMock).toHaveBeenCalledWith({ email: "teacher@example.com" });
    expect(prismaMock.teacherPaymentAccount.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { teacherId_provider: { teacherId: "teacher-profile-1", provider: "STRIPE" } },
        create: expect.objectContaining({
          teacherId: "teacher-profile-1",
          provider: "STRIPE",
          providerAccountId: "acct_123",
          status: "PENDING",
        }),
      }),
    );
    expect(createAccountLinkMock).toHaveBeenCalledWith(
      expect.objectContaining({
        accountId: "acct_123",
        refreshUrl: "http://localhost:3000/dashboard/settings?tab=payments&stripe=refresh",
        returnUrl: "http://localhost:3000/dashboard/settings?tab=payments&stripe=return",
      }),
    );
    await expect(res.json()).resolves.toEqual(
      expect.objectContaining({
        ok: true,
        onboardingUrl: "https://connect.stripe.com/setup/s/acct_123",
      }),
    );
  });

  test("returns 502 with the Stripe message when Stripe rejects account creation", async () => {
    const consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    const stripeError = Object.assign(
      new Error(
        "You can only create new accounts if you've signed up for Connect, which you can do at https://dashboard.stripe.com/connect.",
      ),
      { type: "StripeInvalidRequestError" },
    );
    createConnectAccountMock.mockRejectedValue(stripeError);

    const res = await POST();

    expect(res.status).toBe(502);
    await expect(res.json()).resolves.toEqual({
      error:
        "Stripe rejected the request: You can only create new accounts if you've signed up for Connect, which you can do at https://dashboard.stripe.com/connect.",
    });
    expect(prismaMock.teacherPaymentAccount.upsert).not.toHaveBeenCalled();
    // Logs a single concise line, not the full Stripe error object.
    expect(consoleErrorSpy).toHaveBeenCalledWith(
      "Stripe Connect onboarding failed:",
      stripeError.message,
    );
    consoleErrorSpy.mockRestore();
  });

  test("does not reuse a local dev Stripe account for real Connect onboarding", async () => {
    prismaMock.teacherProfile.findUnique.mockResolvedValue({
      id: "teacher-profile-1",
      paymentAccounts: [{ providerAccountId: "acct_local_teacher-profile-1" }],
    });

    const res = await POST();

    expect(res.status).toBe(200);
    expect(createConnectAccountMock).toHaveBeenCalledWith({ email: "teacher@example.com" });
    expect(createAccountLinkMock).toHaveBeenCalledWith(
      expect.objectContaining({ accountId: "acct_123" }),
    );
  });
});
