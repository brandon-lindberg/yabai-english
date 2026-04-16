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
    const res = await POST(new Request("http://localhost/api/integrations/google/disconnect", { method: "POST" }));
    expect(res.status).toBe(401);
  });

  test("disconnects a single feature", async () => {
    authMock.mockResolvedValue({ user: { id: "u_1" } });
    prismaMock.googleIntegrationSettings.upsert.mockResolvedValue({});
    const res = await POST(
      new Request("http://localhost/api/integrations/google/disconnect", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ feature: "calendar" }),
      }),
    );
    expect(res.status).toBe(200);
    expect(prismaMock.googleIntegrationSettings.upsert).toHaveBeenCalled();
    expect(prismaMock.googleIntegrationAccount.updateMany).not.toHaveBeenCalled();
  });
});
