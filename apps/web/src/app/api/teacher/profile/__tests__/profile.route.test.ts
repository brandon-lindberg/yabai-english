import { beforeEach, describe, expect, test, vi } from "vitest";

const { authMock, upsertMock, revalidatePathMock } = vi.hoisted(() => ({
  authMock: vi.fn(),
  upsertMock: vi.fn(),
  revalidatePathMock: vi.fn(),
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

vi.mock("next/cache", () => ({
  revalidatePath: revalidatePathMock,
}));

import { PATCH } from "@/app/api/teacher/profile/route";

describe("PATCH /api/teacher/profile", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    authMock.mockResolvedValue({
      user: { id: "teacher-user-1", role: "TEACHER" },
    });
    upsertMock.mockResolvedValue({ id: "tp-1", userId: "teacher-user-1", rateYen: 3500 });
  });

  test("persists rateYen and revalidates book paths", async () => {
    const res = await PATCH(
      new Request("http://localhost/api/teacher/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ rateYen: 3500 }),
      }),
    );

    expect(res.status).toBe(200);
    expect(upsertMock).toHaveBeenCalledWith(
      expect.objectContaining({
        update: expect.objectContaining({ rateYen: 3500 }),
      }),
    );
    expect(revalidatePathMock).toHaveBeenCalledWith("/en/book");
    expect(revalidatePathMock).toHaveBeenCalledWith("/en/book/teachers/tp-1");
    expect(revalidatePathMock).toHaveBeenCalledWith("/ja/book");
    await expect(res.json()).resolves.toEqual({ ok: true, teacherProfileId: "tp-1" });
  });

  test("rejects negative rateYen", async () => {
    const res = await PATCH(
      new Request("http://localhost/api/teacher/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ rateYen: -1 }),
      }),
    );

    expect(res.status).toBe(400);
    expect(upsertMock).not.toHaveBeenCalled();
  });

  test("persists offersFreeTrial toggle", async () => {
    const res = await PATCH(
      new Request("http://localhost/api/teacher/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ offersFreeTrial: false }),
      }),
    );

    expect(res.status).toBe(200);
    expect(upsertMock).toHaveBeenCalledWith(
      expect.objectContaining({
        update: expect.objectContaining({ offersFreeTrial: false }),
      }),
    );
  });
});
