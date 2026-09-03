import { beforeEach, describe, expect, test, vi } from "vitest";

const { authMock, prismaMock, ensureCatalogMock } = vi.hoisted(() => ({
  authMock: vi.fn(),
  prismaMock: {
    teacherProfile: { findUnique: vi.fn() },
    teacherClassLevel: { findFirst: vi.fn() },
    teacherClassType: { findFirst: vi.fn() },
    teacherLessonOffering: { findFirst: vi.fn(), update: vi.fn(), delete: vi.fn() },
    availabilitySlot: { count: vi.fn() },
    $transaction: vi.fn(),
  },
  ensureCatalogMock: vi.fn(),
}));

vi.mock("@/auth", () => ({ auth: authMock }));
vi.mock("@/lib/prisma", () => ({ prisma: prismaMock }));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
vi.mock("@/lib/lesson-product-catalog", () => ({
  ensureCatalogProductsForOfferings: ensureCatalogMock,
}));

import { DELETE, PATCH } from "@/app/api/teacher/lesson-offerings/[offeringId]/route";

const body = {
  durationMin: 60,
  rateYen: 5000,
  isGroup: false,
  groupSize: null,
  classLevelId: "lvl-1",
  classTypeId: "ty-1",
};

const params = { params: Promise.resolve({ offeringId: "offer-1" }) };

function patch(patchBody: Record<string, unknown> = body) {
  return PATCH(
    new Request("http://localhost/api/teacher/lesson-offerings/offer-1", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(patchBody),
    }),
    { params: Promise.resolve({ offeringId: "offer-1" }) },
  );
}

function del() {
  return DELETE(new Request("http://localhost/api/teacher/lesson-offerings/offer-1"), {
    params: Promise.resolve({ offeringId: "offer-1" }),
  });
}

beforeEach(() => {
  vi.clearAllMocks();
  authMock.mockResolvedValue({ user: { id: "teacher-user-1", role: "TEACHER" } });
  prismaMock.teacherProfile.findUnique.mockResolvedValue({ id: "tp-1" });
  prismaMock.teacherLessonOffering.findFirst.mockResolvedValue({
    id: "offer-1",
    isFreeTrial: false,
    adminRateOverrideByUserId: null,
  });
  prismaMock.teacherClassLevel.findFirst.mockResolvedValue({ id: "lvl-1" });
  prismaMock.teacherClassType.findFirst.mockResolvedValue({ id: "ty-1", code: "conversation" });
  prismaMock.teacherLessonOffering.update.mockResolvedValue({ id: "offer-1" });
  prismaMock.teacherLessonOffering.delete.mockResolvedValue({ id: "offer-1" });
  prismaMock.availabilitySlot.count.mockResolvedValue(0);
  ensureCatalogMock.mockResolvedValue(undefined);
  prismaMock.$transaction.mockImplementation(
    async (cb: (tx: unknown) => Promise<unknown>) => cb(prismaMock),
  );
});

describe("PATCH /api/teacher/lesson-offerings/[offeringId]", () => {
  // The whole reason this endpoint exists. Saving used to delete and recreate
  // every offering, and because the slot FK is SetNull, published availability
  // silently lost its class on every save.
  test("updates in place, so the class keeps its id", async () => {
    const res = await patch();

    expect(res.status).toBe(200);
    const [args] = prismaMock.teacherLessonOffering.update.mock.calls[0] as [
      { where: { id: string }; data: Record<string, unknown> },
    ];
    expect(args.where).toEqual({ id: "offer-1" });
    expect(prismaMock.teacherLessonOffering).not.toHaveProperty("deleteMany");
  });

  test("never lets the class be moved to another teacher", async () => {
    await patch();

    const [args] = prismaMock.teacherLessonOffering.update.mock.calls[0] as [
      { data: Record<string, unknown> },
    ];
    expect(args.data).not.toHaveProperty("teacherId");
  });

  test("divides a group total rather than trusting the share sent", async () => {
    await patch({ ...body, isGroup: true, groupSize: 4, groupTotalRateYen: 16_000, rateYen: 1 });

    const [args] = prismaMock.teacherLessonOffering.update.mock.calls[0] as [
      { data: { rateYen: number; groupTotalRateYen: number } },
    ];
    expect(args.data).toMatchObject({ rateYen: 4000, groupTotalRateYen: 16_000 });
  });

  test("refuses a share under the public minimum", async () => {
    const res = await patch({ ...body, rateYen: 2000 });

    expect(res.status).toBe(400);
    expect(prismaMock.teacherLessonOffering.update).not.toHaveBeenCalled();
  });

  test("refuses somebody else's class", async () => {
    prismaMock.teacherLessonOffering.findFirst.mockResolvedValue(null);

    const res = await patch();

    expect(res.status).toBe(404);
    expect(prismaMock.teacherLessonOffering.update).not.toHaveBeenCalled();
  });

  test("refuses to edit the free trial", async () => {
    prismaMock.teacherLessonOffering.findFirst.mockResolvedValue({
      id: "offer-1",
      isFreeTrial: true,
      adminRateOverrideByUserId: null,
    });

    const res = await patch();

    expect(res.status).toBe(403);
    expect(prismaMock.teacherLessonOffering.update).not.toHaveBeenCalled();
  });

  test("refuses to edit an admin-granted rate", async () => {
    prismaMock.teacherLessonOffering.findFirst.mockResolvedValue({
      id: "offer-1",
      isFreeTrial: false,
      adminRateOverrideByUserId: "admin-1",
    });

    const res = await patch();

    expect(res.status).toBe(403);
  });

  test("refuses a level belonging to another teacher", async () => {
    prismaMock.teacherClassLevel.findFirst.mockResolvedValue(null);

    const res = await patch();

    expect(res.status).toBe(400);
  });
});

describe("DELETE /api/teacher/lesson-offerings/[offeringId]", () => {
  test("deletes a class nothing is scheduled against", async () => {
    const res = await del();

    expect(res.status).toBe(200);
    expect(prismaMock.teacherLessonOffering.delete).toHaveBeenCalledWith({
      where: { id: "offer-1" },
    });
  });

  // Deleting would null the slots' link, leaving times on the calendar with no
  // duration or price behind them.
  test("refuses while availability still points at it", async () => {
    prismaMock.availabilitySlot.count.mockResolvedValue(3);

    const res = await del();

    expect(res.status).toBe(409);
    await expect(res.json()).resolves.toMatchObject({ publishedSlots: 3 });
    expect(prismaMock.teacherLessonOffering.delete).not.toHaveBeenCalled();
  });

  test("refuses to delete the free trial", async () => {
    prismaMock.teacherLessonOffering.findFirst.mockResolvedValue({
      id: "offer-1",
      isFreeTrial: true,
      adminRateOverrideByUserId: null,
    });

    const res = await del();

    expect(res.status).toBe(403);
    expect(prismaMock.teacherLessonOffering.delete).not.toHaveBeenCalled();
  });

  test("refuses a signed-out request", async () => {
    authMock.mockResolvedValue(null);

    const res = await del();

    expect(res.status).toBe(401);
  });
});
