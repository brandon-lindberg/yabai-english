import { beforeEach, describe, expect, test, vi } from "vitest";

const { authMock, upsertMock } = vi.hoisted(() => ({
  authMock: vi.fn(),
  upsertMock: vi.fn(),
}));

vi.mock("@/auth", () => ({
  auth: authMock,
}));

vi.mock("@/lib/prisma", () => ({
  prisma: {
    teacherProfile: {
      upsert: upsertMock,
    },
  },
}));

import { POST } from "@/app/api/onboarding/teacher/route";

describe("POST /api/onboarding/teacher", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  test("returns 401 for unauthenticated users", async () => {
    authMock.mockResolvedValue(null);
    const res = await POST(new Request("http://localhost/api/onboarding/teacher", { method: "POST" }));
    expect(res.status).toBe(401);
  });

  test("returns 401 for non-teacher roles", async () => {
    authMock.mockResolvedValue({ user: { id: "u1", role: "STUDENT" } });
    const res = await POST(new Request("http://localhost/api/onboarding/teacher", { method: "POST" }));
    expect(res.status).toBe(401);
  });

  test("marks teacher onboarding complete", async () => {
    authMock.mockResolvedValue({ user: { id: "t1", role: "TEACHER" } });
    upsertMock.mockResolvedValue({ id: "tp-1" });
    const res = await POST(
      new Request("http://localhost/api/onboarding/teacher", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ accepted: true }),
      }),
    );
    expect(res.status).toBe(200);
    expect(upsertMock).toHaveBeenCalled();
    await expect(res.json()).resolves.toEqual({ ok: true });
  });
});
