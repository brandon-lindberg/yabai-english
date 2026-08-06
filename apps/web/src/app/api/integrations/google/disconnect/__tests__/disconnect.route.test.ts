import { beforeEach, describe, expect, test, vi } from "vitest";

const { authMock, prismaMock } = vi.hoisted(() => ({
  authMock: vi.fn(),
  prismaMock: {
    googleIntegrationSettings: { upsert: vi.fn() },
    googleIntegrationAccount: { updateMany: vi.fn() },
  },
}));

vi.mock("@/auth", () => ({ auth: authMock }));
vi.mock("@/lib/prisma", () => ({ prisma: prismaMock }));

import { POST } from "@/app/api/integrations/google/disconnect/route";

describe("POST /api/integrations/google/disconnect", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  test("requires auth", async () => {
    authMock.mockResolvedValue(null);
    expect((await POST()).status).toBe(401);
  });

  test("clears every capability and revokes the account", async () => {
    // Partial disconnection used to flip one boolean while the underlying grant
    // stayed live, so the app claimed not to have access it still held.
    authMock.mockResolvedValue({ user: { id: "u_1" } });
    prismaMock.googleIntegrationSettings.upsert.mockResolvedValue({});
    prismaMock.googleIntegrationAccount.updateMany.mockResolvedValue({ count: 1 });

    const res = await POST();

    expect(res.status).toBe(200);
    const cleared = {
      calendarConnected: false,
      driveConnected: false,
      meetConnected: false,
      artifactSyncEnabled: false,
    };
    expect(prismaMock.googleIntegrationSettings.upsert).toHaveBeenCalledWith(
      expect.objectContaining({ update: cleared }),
    );
    expect(prismaMock.googleIntegrationAccount.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { userId: "u_1" },
        data: expect.objectContaining({ revoked: true }),
      }),
    );
  });
});
