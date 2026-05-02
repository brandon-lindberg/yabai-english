import { beforeEach, describe, expect, test, vi } from "vitest";

const {
  authMock,
  profileUpsertMock,
  availabilityDeleteManyMock,
  availabilityCreateManyMock,
  offeringCreateManyMock,
  classLevelFindManyMock,
  classTypeFindManyMock,
  classLevelCreateManyMock,
  classTypeCreateManyMock,
  transactionMock,
  ensureCatalogProductsMock,
} = vi.hoisted(() => ({
  authMock: vi.fn(),
  profileUpsertMock: vi.fn(),
  availabilityDeleteManyMock: vi.fn(),
  availabilityCreateManyMock: vi.fn(),
  offeringCreateManyMock: vi.fn(),
  classLevelFindManyMock: vi.fn(),
  classTypeFindManyMock: vi.fn(),
  classLevelCreateManyMock: vi.fn(),
  classTypeCreateManyMock: vi.fn(),
  transactionMock: vi.fn(),
  ensureCatalogProductsMock: vi.fn(),
}));

vi.mock("@/auth", () => ({
  auth: authMock,
}));

vi.mock("@/lib/prisma", () => ({
  prisma: {
    $transaction: transactionMock,
    teacherProfile: {
      upsert: profileUpsertMock,
    },
    availabilitySlot: {
      deleteMany: availabilityDeleteManyMock,
      createMany: availabilityCreateManyMock,
    },
    teacherLessonOffering: {
      createMany: offeringCreateManyMock,
    },
    teacherClassLevel: {
      findMany: classLevelFindManyMock,
      createMany: classLevelCreateManyMock,
    },
    teacherClassType: {
      findMany: classTypeFindManyMock,
      createMany: classTypeCreateManyMock,
    },
  },
}));

vi.mock("@/lib/lesson-product-catalog", () => ({
  ensureCatalogProductsForOfferings: ensureCatalogProductsMock,
}));

import { PATCH } from "@/app/api/teacher/availability/route";

function patchRequest(body: unknown): Request {
  return new Request("http://localhost/api/teacher/availability", {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

describe("PATCH /api/teacher/availability — auto-sync lesson offerings from schedule", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    authMock.mockResolvedValue({ user: { id: "teacher-user-1", role: "TEACHER" } });
    profileUpsertMock.mockResolvedValue({
      id: "tp-1",
      rateYen: 3500,
      lessonOfferings: [
        {
          classTypeId: "ty-conv",
          active: true,
          rateYen: 3500,
          isGroup: false,
          durationMin: 30,
        },
      ],
    });
    const knownLevels = [{ id: "lvl-int" }];
    const knownTypes = [
      { id: "ty-conv", code: "conversation" },
      { id: "ty-gram", code: "grammar" },
      { id: "ty-pron", code: "pronunciation" },
    ];
    classLevelFindManyMock.mockImplementation(
      async ({ where }: { where: { id: { in: string[] } } }) => {
        const ids = where.id.in ?? [];
        return knownLevels.filter((l) => ids.includes(l.id));
      },
    );
    classTypeFindManyMock.mockImplementation(
      async ({ where }: { where: { id: { in: string[] } } }) => {
        const ids = where.id.in ?? [];
        return knownTypes.filter((t) => ids.includes(t.id));
      },
    );
    classLevelCreateManyMock.mockResolvedValue({ count: 0 });
    classTypeCreateManyMock.mockResolvedValue({ count: 0 });
    availabilityDeleteManyMock.mockResolvedValue({ count: 0 });
    availabilityCreateManyMock.mockResolvedValue({ count: 0 });
    offeringCreateManyMock.mockResolvedValue({ count: 0 });
    ensureCatalogProductsMock.mockResolvedValue(undefined);
    transactionMock.mockImplementation(async (cb: (tx: unknown) => Promise<unknown>) =>
      cb({
        availabilitySlot: {
          deleteMany: availabilityDeleteManyMock,
          createMany: availabilityCreateManyMock,
        },
        teacherLessonOffering: {
          createMany: offeringCreateManyMock,
        },
        lessonProduct: {
          findMany: vi.fn().mockResolvedValue([]),
          create: vi.fn().mockResolvedValue({}),
        },
      }),
    );
  });

  test("creates a matching lesson offering when schedule introduces a new class type", async () => {
    const res = await PATCH(
      patchRequest([
        {
          dayOfWeek: 1,
          startMin: 10 * 60,
          endMin: 11 * 60,
          timezone: "Asia/Tokyo",
          classLevelId: "lvl-int",
          classTypeId: "ty-conv",
        },
        {
          dayOfWeek: 3,
          startMin: 19 * 60,
          endMin: 20 * 60,
          timezone: "Asia/Tokyo",
          classLevelId: "lvl-int",
          classTypeId: "ty-gram",
        },
      ]),
    );

    expect(res.status).toBe(200);
    expect(offeringCreateManyMock).toHaveBeenCalledTimes(1);
    expect(offeringCreateManyMock).toHaveBeenCalledWith({
      data: [
        {
          teacherId: "tp-1",
          durationMin: 30,
          rateYen: 3500,
          isGroup: false,
          groupSize: null,
          active: true,
          classTypeId: "ty-gram",
        },
      ],
    });
  });

  test("does not create any new offerings when all schedule types are already covered", async () => {
    const res = await PATCH(
      patchRequest([
        {
          dayOfWeek: 1,
          startMin: 10 * 60,
          endMin: 11 * 60,
          timezone: "Asia/Tokyo",
          classLevelId: "lvl-int",
          classTypeId: "ty-conv",
        },
      ]),
    );

    expect(res.status).toBe(200);
    expect(offeringCreateManyMock).not.toHaveBeenCalled();
  });

  test("uses 40-min default duration for pronunciation so the offering maps to a catalog product", async () => {
    profileUpsertMock.mockResolvedValue({
      id: "tp-1",
      rateYen: 4200,
      lessonOfferings: [],
    });

    const res = await PATCH(
      patchRequest([
        {
          dayOfWeek: 2,
          startMin: 9 * 60,
          endMin: 10 * 60,
          timezone: "Asia/Tokyo",
          classLevelId: "lvl-int",
          classTypeId: "ty-pron",
        },
      ]),
    );

    expect(res.status).toBe(200);
    expect(offeringCreateManyMock).toHaveBeenCalledWith({
      data: [
        expect.objectContaining({
          teacherId: "tp-1",
          durationMin: 40,
          classTypeId: "ty-pron",
          rateYen: 4200,
          isGroup: false,
          active: true,
        }),
      ],
    });
  });

  test("provisions catalog products so every new offering is bookable", async () => {
    profileUpsertMock.mockResolvedValue({
      id: "tp-1",
      rateYen: 4200,
      lessonOfferings: [],
    });

    const res = await PATCH(
      patchRequest([
        {
          dayOfWeek: 2,
          startMin: 9 * 60,
          endMin: 10 * 60,
          timezone: "Asia/Tokyo",
          classLevelId: "lvl-int",
          classTypeId: "ty-pron",
        },
      ]),
    );

    expect(res.status).toBe(200);
    expect(ensureCatalogProductsMock).toHaveBeenCalledTimes(1);
    const [, offerings] = ensureCatalogProductsMock.mock.calls[0];
    expect(offerings).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          classType: { code: "pronunciation" },
          durationMin: 40,
          active: true,
        }),
      ]),
    );
  });
});
