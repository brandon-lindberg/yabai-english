import { beforeEach, describe, expect, test, vi } from "vitest";

const { authMock, prismaMock, ensureCatalogMock } = vi.hoisted(() => ({
  authMock: vi.fn(),
  prismaMock: {
    teacherProfile: { findUnique: vi.fn() },
    teacherClassLevel: { findFirst: vi.fn() },
    teacherClassType: { findFirst: vi.fn() },
    teacherLessonOffering: { create: vi.fn() },
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

import { POST } from "@/app/api/teacher/lesson-offerings/route";

const privateClass = {
  durationMin: 60,
  rateYen: 5000,
  isGroup: false,
  groupSize: null,
  classLevelId: "lvl-1",
  classTypeId: "ty-1",
};

function post(body: Record<string, unknown>) {
  return POST(
    new Request("http://localhost/api/teacher/lesson-offerings", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    }),
  );
}

function created() {
  const [args] = prismaMock.teacherLessonOffering.create.mock.calls[0] as [
    { data: Record<string, unknown> },
  ];
  return args.data;
}

describe("POST /api/teacher/lesson-offerings", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    authMock.mockResolvedValue({ user: { id: "teacher-user-1", role: "TEACHER" } });
    prismaMock.teacherProfile.findUnique.mockResolvedValue({ id: "tp-1" });
    prismaMock.teacherClassLevel.findFirst.mockResolvedValue({ id: "lvl-1" });
    prismaMock.teacherClassType.findFirst.mockResolvedValue({ id: "ty-1", code: "conversation" });
    prismaMock.teacherLessonOffering.create.mockResolvedValue({
      id: "offer-new",
      ...privateClass,
      groupTotalRateYen: null,
      ratePriceBasis: "TAX_INCLUDED",
    });
    ensureCatalogMock.mockResolvedValue(undefined);
    prismaMock.$transaction.mockImplementation(
      async (cb: (tx: unknown) => Promise<unknown>) => cb(prismaMock),
    );
  });

  // The point of the endpoint: the class is saved when the dialog closes, with
  // no second Save further down the page to miss.
  test("saves the class and hands it back", async () => {
    const res = await post(privateClass);

    expect(res.status).toBe(200);
    await expect(res.json()).resolves.toMatchObject({
      ok: true,
      offering: { id: "offer-new" },
    });
    expect(created()).toMatchObject({ teacherId: "tp-1", rateYen: 5000, active: true });
  });

  // Adding must not disturb what is already there — that is why this is a
  // create rather than the rates form's replace-the-whole-set PATCH.
  test("touches nothing the teacher already has", async () => {
    await post(privateClass);

    expect(prismaMock.teacherLessonOffering).not.toHaveProperty("deleteMany");
    expect(created()).toMatchObject({ classLevelId: "lvl-1" });
  });

  test("makes the class bookable by provisioning its catalog product", async () => {
    await post(privateClass);

    expect(ensureCatalogMock).toHaveBeenCalledWith(
      expect.anything(),
      [{ classType: { code: "conversation" }, durationMin: 60, active: true }],
    );
  });

  test("divides a group total rather than trusting the share sent", async () => {
    await post({
      ...privateClass,
      isGroup: true,
      groupSize: 4,
      groupTotalRateYen: 16_000,
      rateYen: 99_999,
    });

    expect(created()).toMatchObject({
      rateYen: 4000,
      groupTotalRateYen: 16_000,
      groupSize: 4,
    });
  });

  test("refuses a class whose share falls under the public minimum", async () => {
    const res = await post({
      ...privateClass,
      isGroup: true,
      groupSize: 4,
      groupTotalRateYen: 8000,
      rateYen: 8000,
    });

    expect(res.status).toBe(400);
    await expect(res.json()).resolves.toEqual({
      error: "Public lesson rates must be at least ¥3,000.",
    });
    expect(prismaMock.teacherLessonOffering.create).not.toHaveBeenCalled();
  });

  test("keeps the basis the teacher typed in", async () => {
    await post({ ...privateClass, ratePriceBasis: "TAX_EXCLUSIVE" });

    expect(created()).toMatchObject({ ratePriceBasis: "TAX_EXCLUSIVE" });
  });

  test("refuses a level belonging to another teacher", async () => {
    prismaMock.teacherClassLevel.findFirst.mockResolvedValue(null);

    const res = await post(privateClass);

    expect(res.status).toBe(400);
    expect(prismaMock.teacherLessonOffering.create).not.toHaveBeenCalled();
  });

  test("refuses a type belonging to another teacher", async () => {
    prismaMock.teacherClassType.findFirst.mockResolvedValue(null);

    const res = await post(privateClass);

    expect(res.status).toBe(400);
    expect(prismaMock.teacherLessonOffering.create).not.toHaveBeenCalled();
  });

  test("refuses a group of one", async () => {
    const res = await post({ ...privateClass, isGroup: true, groupSize: 1 });

    expect(res.status).toBe(400);
    expect(prismaMock.teacherLessonOffering.create).not.toHaveBeenCalled();
  });

  test("refuses students", async () => {
    authMock.mockResolvedValue({ user: { id: "stu-1", role: "STUDENT" } });

    const res = await post(privateClass);

    expect(res.status).toBe(401);
  });

  test("refuses a signed-out request", async () => {
    authMock.mockResolvedValue(null);

    const res = await post(privateClass);

    expect(res.status).toBe(401);
  });
});
