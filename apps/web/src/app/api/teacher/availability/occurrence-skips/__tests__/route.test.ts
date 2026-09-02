import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";

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

/** Runs `fn` with these env vars set (undefined deletes), then puts them back. */
async function withEnv(vars: Record<string, string | undefined>, fn: () => Promise<void>) {
  const previous = Object.fromEntries(
    Object.keys(vars).map((key) => [key, process.env[key]]),
  );
  const apply = (values: Record<string, string | undefined>) => {
    for (const [key, value] of Object.entries(values)) {
      if (value === undefined) delete process.env[key];
      else process.env[key] = value;
    }
  };
  apply(vars);
  try {
    await fn();
  } finally {
    apply(previous);
  }
}

function postRequest(body: unknown): Request {
  return new Request("http://localhost/api/teacher/availability/occurrence-skips", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

describe("POST /api/teacher/availability/occurrence-skips", () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  beforeEach(() => {
    vi.clearAllMocks();
    // The mocked rule repeats Mondays 10:00 Asia/Tokyo; 2026-05-18 is the next one.
    vi.useFakeTimers({ now: new Date("2026-05-15T00:00:00.000Z") });
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

  // Without the rule's id the skip cancels everything starting at that instant,
  // including the one-off written to replace the occurrence being edited.
  test("records which rule the skipped occurrence belongs to", async () => {
    // The local dev Stripe account is only accepted while live Stripe is off.
    await withEnv({ DEV_AUTH_BYPASS: "true", STRIPE_SECRET_KEY: undefined }, async () => {
      const res = await POST(
        postRequest({ slotId: "slot-1", startsAtIso: "2026-05-18T01:00:00.000Z" }),
      );

      expect(res.status).toBe(200);
      expect(skipCreateMock).toHaveBeenCalledWith({
        data: expect.objectContaining({
          slotId: "slot-1",
          startsAtIso: "2026-05-18T01:00:00.000Z",
        }),
      });
    });
  });

  test("blocks occurrence skips until Stripe setup is complete", async () => {
    await withEnv({ STRIPE_SECRET_KEY: "sk_test", DEV_AUTH_BYPASS: undefined }, async () => {
      const res = await POST(
        postRequest({
          slotId: "slot-1",
          startsAtIso: "2026-05-18T01:00:00.000Z",
        }),
      );

      expect(res.status).toBe(409);
      await expect(res.json()).resolves.toEqual({
        error: "Finish Stripe setup and accept the payment policy before publishing availability.",
      });
      expect(skipCreateMock).not.toHaveBeenCalled();
    });
  });
});
