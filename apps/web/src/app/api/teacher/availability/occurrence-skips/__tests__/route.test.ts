import { beforeEach, describe, expect, test, vi } from "vitest";

const { authMock, profileFindUniqueMock, skipCreateMock } = vi.hoisted(() => ({
  authMock: vi.fn(),
  profileFindUniqueMock: vi.fn(),
  skipCreateMock: vi.fn(),
}));

vi.mock("@/auth", () => ({ auth: authMock }));
vi.mock("@/lib/prisma", () => ({
  prisma: {
    teacherProfile: { findUnique: profileFindUniqueMock },
    availabilityOccurrenceSkip: { create: skipCreateMock },
  },
}));

import { POST } from "@/app/api/teacher/availability/occurrence-skips/route";

function postRequest(body: unknown): Request {
  return new Request("http://localhost/api/teacher/availability/occurrence-skips", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

describe("POST /api/teacher/availability/occurrence-skips", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    authMock.mockResolvedValue({ user: { id: "teacher-user-1", role: "TEACHER" } });
    profileFindUniqueMock.mockResolvedValue({
      id: "tp-1",
      paymentPolicyAcceptedAt: new Date("2026-05-01T00:00:00.000Z"),
      paymentAccounts: [
        {
          id: "payacct-1",
          provider: "STRIPE",
          providerAccountId: "acct_local_teacher-profile-1",
          status: "ENABLED",
          chargesEnabled: true,
          payoutsEnabled: true,
          methods: [{ method: "CARD", enabled: true }],
        },
      ],
      availabilitySlots: [
        {
          id: "slot-1",
          dayOfWeek: 1,
          startMin: 600,
          endMin: 660,
          timezone: "Asia/Tokyo",
          recurrence: "WEEKLY",
          startsOn: null,
          endsOn: null,
          classLevelId: "lvl-int",
          classTypeId: "ty-conv",
        },
      ],
    });
  });

  test("blocks occurrence skips until Stripe setup is complete", async () => {
    const previousStripeSecret = process.env.STRIPE_SECRET_KEY;
    const previousDevBypass = process.env.DEV_AUTH_BYPASS;
    process.env.STRIPE_SECRET_KEY = "sk_test";
    delete process.env.DEV_AUTH_BYPASS;

    const res = await POST(
      postRequest({
        slotId: "slot-1",
        startsAtIso: "2026-05-19T01:00:00.000Z",
      }),
    );

    expect(res.status).toBe(409);
    await expect(res.json()).resolves.toEqual({
      error: "Finish Stripe setup and accept the payment policy before publishing availability.",
    });
    expect(skipCreateMock).not.toHaveBeenCalled();

    if (previousStripeSecret === undefined) {
      delete process.env.STRIPE_SECRET_KEY;
    } else {
      process.env.STRIPE_SECRET_KEY = previousStripeSecret;
    }
    if (previousDevBypass === undefined) {
      delete process.env.DEV_AUTH_BYPASS;
    } else {
      process.env.DEV_AUTH_BYPASS = previousDevBypass;
    }
  });
});
