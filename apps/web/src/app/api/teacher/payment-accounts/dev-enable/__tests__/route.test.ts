import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";

const { authMock, profileFindUniqueMock, accountUpsertMock, methodUpsertMock } = vi.hoisted(() => ({
  authMock: vi.fn(),
  profileFindUniqueMock: vi.fn(),
  accountUpsertMock: vi.fn(),
  methodUpsertMock: vi.fn(),
}));

vi.mock("@/auth", () => ({ auth: authMock }));
vi.mock("@/lib/prisma", () => ({
  prisma: {
    teacherProfile: { findUnique: profileFindUniqueMock },
    teacherPaymentAccount: { upsert: accountUpsertMock },
    teacherPaymentMethod: { upsert: methodUpsertMock },
  },
}));

import { POST } from "@/app/api/teacher/payment-accounts/dev-enable/route";

describe("POST /api/teacher/payment-accounts/dev-enable", () => {
  const originalDevBypass = process.env.DEV_AUTH_BYPASS;

  beforeEach(() => {
    vi.clearAllMocks();
    process.env.DEV_AUTH_BYPASS = "true";
    authMock.mockResolvedValue({ user: { id: "teacher-user-1", role: "TEACHER" } });
    profileFindUniqueMock.mockResolvedValue({ id: "teacher-profile-1" });
    accountUpsertMock.mockResolvedValue({ id: "dev-payacct-1" });
    methodUpsertMock.mockResolvedValue({});
  });

  afterEach(() => {
    process.env.DEV_AUTH_BYPASS = originalDevBypass;
  });

  test("creates a local Stripe card method for teacher testing", async () => {
    const res = await POST();

    expect(res.status).toBe(200);
    expect(accountUpsertMock).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { teacherId_provider: { teacherId: "teacher-profile-1", provider: "STRIPE" } },
        create: expect.objectContaining({
          teacherId: "teacher-profile-1",
          provider: "STRIPE",
          status: "ENABLED",
          chargesEnabled: true,
          payoutsEnabled: true,
        }),
      }),
    );
    expect(methodUpsertMock).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { accountId_method: { accountId: "dev-payacct-1", method: "CARD" } },
      }),
    );
  });

  test("allows super admins who teach to create a local Stripe card method", async () => {
    authMock.mockResolvedValue({ user: { id: "admin-user-1", role: "SUPER_ADMIN" } });

    const res = await POST();

    expect(res.status).toBe(200);
    expect(profileFindUniqueMock).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { userId: "admin-user-1" },
      }),
    );
    expect(accountUpsertMock).toHaveBeenCalled();
  });

  test("is not available unless dev auth bypass is enabled", async () => {
    process.env.DEV_AUTH_BYPASS = "false";

    const res = await POST();

    expect(res.status).toBe(404);
    expect(accountUpsertMock).not.toHaveBeenCalled();
  });
});
