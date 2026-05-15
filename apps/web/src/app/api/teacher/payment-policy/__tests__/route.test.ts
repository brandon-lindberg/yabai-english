import { beforeEach, describe, expect, test, vi } from "vitest";

const { authMock, upsertMock, revalidatePathMock } = vi.hoisted(() => ({
  authMock: vi.fn(),
  upsertMock: vi.fn(),
  revalidatePathMock: vi.fn(),
}));

vi.mock("@/auth", () => ({ auth: authMock }));
vi.mock("@/lib/prisma", () => ({
  prisma: {
    teacherProfile: { upsert: upsertMock },
  },
}));
vi.mock("next/cache", () => ({ revalidatePath: revalidatePathMock }));

import { POST } from "@/app/api/teacher/payment-policy/route";

describe("POST /api/teacher/payment-policy", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    authMock.mockResolvedValue({ user: { id: "teacher-user-1", role: "TEACHER" } });
    upsertMock.mockResolvedValue({
      id: "teacher-profile-1",
      paymentPolicyAcceptedAt: new Date("2026-05-15T00:00:00.000Z"),
    });
  });

  test("records teacher payment policy acceptance and revalidates booking pages", async () => {
    const res = await POST();

    expect(res.status).toBe(200);
    expect(upsertMock).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { userId: "teacher-user-1" },
        create: expect.objectContaining({ userId: "teacher-user-1" }),
        update: expect.objectContaining({ paymentPolicyAcceptedAt: expect.any(Date) }),
      }),
    );
    expect(revalidatePathMock).toHaveBeenCalledWith("/en/book");
    expect(revalidatePathMock).toHaveBeenCalledWith("/en/book/teachers/teacher-profile-1");
    await expect(res.json()).resolves.toEqual({
      ok: true,
      acceptedAt: expect.any(String),
    });
  });

  test("rejects non-teachers", async () => {
    authMock.mockResolvedValue({ user: { id: "student-1", role: "STUDENT" } });

    const res = await POST();

    expect(res.status).toBe(401);
    expect(upsertMock).not.toHaveBeenCalled();
  });
});
