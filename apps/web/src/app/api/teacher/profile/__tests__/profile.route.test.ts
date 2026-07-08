import { beforeEach, describe, expect, test, vi } from "vitest";

const {
  authMock,
  upsertMock,
  transactionMock,
  deleteManyMock,
  createManyMock,
  revalidatePathMock,
  ensureCatalogProductsMock,
  classLevelFindManyMock,
} = vi.hoisted(() => ({
  authMock: vi.fn(),
  upsertMock: vi.fn(),
  transactionMock: vi.fn(),
  deleteManyMock: vi.fn(),
  createManyMock: vi.fn(),
  revalidatePathMock: vi.fn(),
  ensureCatalogProductsMock: vi.fn(),
  classLevelFindManyMock: vi.fn(),
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
    teacherClassLevel: {
      findMany: classLevelFindManyMock,
    },
    teacherClassType: {
      findMany: vi.fn().mockResolvedValue([]),
    },
  },
}));

vi.mock("next/cache", () => ({
  revalidatePath: revalidatePathMock,
}));

vi.mock("@/lib/lesson-product-catalog", () => ({
  ensureCatalogProductsForOfferings: ensureCatalogProductsMock,
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
    ensureCatalogProductsMock.mockResolvedValue(undefined);
    classLevelFindManyMock.mockImplementation(
      async ({ where }: { where: { id: { in: string[] } } }) => {
        const ids = where.id.in ?? [];
        return ids.map((id) => ({ id }));
      },
    );
    transactionMock.mockImplementation(async (cb: (tx: unknown) => Promise<unknown>) =>
      cb({
        teacherProfile: { upsert: upsertMock },
        teacherLessonOffering: {
          deleteMany: deleteManyMock,
          createMany: createManyMock,
        },
        teacherClassLevel: {
          findMany: classLevelFindManyMock,
        },
        teacherClassType: {
          findMany: vi.fn().mockImplementation(async ({ where }: { where: { id: { in: string[] } } }) => {
            const ids = where.id.in ?? [];
            const knownCodes: Record<string, string> = {
              "ty-conv": "conversation",
              "ty-pron": "pronunciation",
              "ty-gram": "grammar",
            };
            return ids.map((id) => ({ id, code: knownCodes[id] ?? "unknown" }));
          }),
        },
        lessonProduct: {
          findMany: vi.fn().mockResolvedValue([]),
          create: vi.fn().mockResolvedValue({}),
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
            {
              durationMin: 60,
              rateYen: 4500,
              isGroup: false,
              groupSize: null,
              classLevelId: "lvl-int",
            },
            {
              durationMin: 90,
              rateYen: 9000,
              isGroup: true,
              groupSize: 4,
              classLevelId: "lvl-int",
            },
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
          classLevelId: "lvl-int",
          classTypeId: null,
        },
        {
          teacherId: "tp-1",
          durationMin: 90,
          rateYen: 9000,
          isGroup: true,
          groupSize: 4,
          active: true,
          classLevelId: "lvl-int",
          classTypeId: null,
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

  test("rejects public fallback rates below ¥3000", async () => {
    const res = await PATCH(
      new Request("http://localhost/api/teacher/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ rateYen: 2500 }),
      }),
    );

    expect(res.status).toBe(400);
    await expect(res.json()).resolves.toEqual({
      error: "Public lesson rates must be at least ¥3,000.",
    });
    expect(upsertMock).not.toHaveBeenCalled();
  });

  test("rejects public lesson offerings below ¥3000", async () => {
    const res = await PATCH(
      new Request("http://localhost/api/teacher/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          lessonOfferings: [
            {
              durationMin: 60,
              rateYen: 2500,
              isGroup: false,
              groupSize: null,
              classLevelId: "lvl-int",
            },
          ],
        }),
      }),
    );

    expect(res.status).toBe(400);
    await expect(res.json()).resolves.toEqual({
      error: "Public lesson rates must be at least ¥3,000.",
    });
    expect(upsertMock).not.toHaveBeenCalled();
  });

  test("provisions catalog products for replaced offerings so all become bookable", async () => {
    const res = await PATCH(
      new Request("http://localhost/api/teacher/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          lessonOfferings: [
            {
              durationMin: 30,
              rateYen: 3500,
              isGroup: false,
              groupSize: null,
              classLevelId: "lvl-int",
              classTypeId: "ty-pron",
            },
            {
              durationMin: 30,
              rateYen: 3500,
              isGroup: false,
              groupSize: null,
              classLevelId: "lvl-int",
              classTypeId: "ty-conv",
            },
          ],
        }),
      }),
    );

    expect(res.status).toBe(200);
    expect(ensureCatalogProductsMock).toHaveBeenCalledTimes(1);
    const [, offerings] = ensureCatalogProductsMock.mock.calls[0];
    expect(offerings).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          classType: { code: "pronunciation" },
          durationMin: 30,
          active: true,
        }),
        expect.objectContaining({
          classType: { code: "conversation" },
          durationMin: 30,
          active: true,
        }),
      ]),
    );
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

  test("persists refundFeePassedToStudent toggle", async () => {
    const res = await PATCH(
      new Request("http://localhost/api/teacher/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ refundFeePassedToStudent: true }),
      }),
    );

    expect(res.status).toBe(200);
    expect(upsertMock).toHaveBeenCalledWith(
      expect.objectContaining({
        update: expect.objectContaining({ refundFeePassedToStudent: true }),
      }),
    );
  });

  test("persists marketplaceHidden toggle", async () => {
    const res = await PATCH(
      new Request("http://localhost/api/teacher/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ marketplaceHidden: true }),
      }),
    );

    expect(res.status).toBe(200);
    expect(upsertMock).toHaveBeenCalledWith(
      expect.objectContaining({
        update: expect.objectContaining({ marketplaceHidden: true }),
      }),
    );
  });
});
