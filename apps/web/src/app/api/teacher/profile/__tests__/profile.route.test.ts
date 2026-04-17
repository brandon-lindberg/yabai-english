import { beforeEach, describe, expect, test, vi } from "vitest";

const {
  authMock,
  upsertMock,
  transactionMock,
  deleteManyMock,
  createManyMock,
  revalidatePathMock,
} = vi.hoisted(() => ({
  authMock: vi.fn(),
  upsertMock: vi.fn(),
  transactionMock: vi.fn(),
  deleteManyMock: vi.fn(),
  createManyMock: vi.fn(),
  revalidatePathMock: vi.fn(),
}));

vi.mock("@/auth", () => ({
  auth: authMock,
}));

vi.mock("@/lib/prisma", () => ({
  prisma: {
    $transaction: transactionMock,
    teacherProfile: {
      upsert: upsertMock,
    },
    teacherLessonOffering: {
      deleteMany: deleteManyMock,
      createMany: createManyMock,
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
    deleteManyMock.mockResolvedValue({ count: 0 });
    createManyMock.mockResolvedValue({ count: 0 });
    transactionMock.mockImplementation(async (cb: (tx: unknown) => Promise<unknown>) =>
      cb({
        teacherProfile: { upsert: upsertMock },
        teacherLessonOffering: {
          deleteMany: deleteManyMock,
          createMany: createManyMock,
        },
      }),
    );
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

  test("replaces lesson offerings when payload includes them", async () => {
    const res = await PATCH(
      new Request("http://localhost/api/teacher/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          lessonOfferings: [
            { durationMin: 60, rateYen: 4500, isGroup: false, groupSize: null },
            { durationMin: 90, rateYen: 9000, isGroup: true, groupSize: 4 },
          ],
        }),
      }),
    );
    expect(res.status).toBe(200);
    expect(deleteManyMock).toHaveBeenCalledWith({ where: { teacherId: "tp-1" } });
    expect(createManyMock).toHaveBeenCalledWith({
      data: [
        {
          teacherId: "tp-1",
          durationMin: 60,
          rateYen: 4500,
          isGroup: false,
          groupSize: null,
          active: true,
          lessonType: null,
          lessonTypeCustom: null,
        },
        {
          teacherId: "tp-1",
          durationMin: 90,
          rateYen: 9000,
          isGroup: true,
          groupSize: 4,
          active: true,
          lessonType: null,
          lessonTypeCustom: null,
        },
      ],
    });
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
