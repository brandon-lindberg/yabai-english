import { beforeEach, describe, expect, test, vi } from "vitest";

const {
  authMock,
  profileUpsertMock,
  availabilityDeleteManyMock,
  availabilityCreateManyMock,
  offeringCreateManyMock,
  offeringFindManyMock,
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
  offeringFindManyMock: vi.fn(),
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
      findMany: offeringFindManyMock,
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
          id: "off-conv-60",
          classLevelId: "lvl-int",
          classTypeId: "ty-conv",
          active: true,
          rateYen: 3500,
          isGroup: false,
          durationMin: 30,
        },
        {
          id: "off-gram-60",
          classLevelId: "lvl-int",
          classTypeId: "ty-gram",
          active: true,
          rateYen: 3500,
          isGroup: false,
          durationMin: 60,
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
    offeringFindManyMock.mockImplementation(
      async ({ where }: { where: { id: { in: string[] } } }) => {
        const ids = where.id.in ?? [];
        return [
          {
            id: "off-conv-60",
            classLevelId: "lvl-int",
            classTypeId: "ty-conv",
            durationMin: 60,
            active: true,
            isGroup: false,
            rateYen: 3500,
            classType: { code: "conversation" },
          },
          {
            id: "off-gram-60",
            classLevelId: "lvl-int",
            classTypeId: "ty-gram",
            durationMin: 60,
            active: true,
            isGroup: false,
            rateYen: 3500,
            classType: { code: "grammar" },
          },
          {
            id: "off-pron-60",
            classLevelId: "lvl-int",
            classTypeId: "ty-pron",
            durationMin: 60,
            active: true,
            isGroup: false,
            rateYen: 4200,
            classType: { code: "pronunciation" },
          },
        ].filter((offering) => ids.includes(offering.id));
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

  test("persists availability against selected class offers", async () => {
    const res = await PATCH(
      patchRequest([
        {
          dayOfWeek: 1,
          startMin: 10 * 60,
          endMin: 11 * 60,
          timezone: "Asia/Tokyo",
          classLevelId: "lvl-int",
          classTypeId: "ty-conv",
          teacherLessonOfferingId: "off-conv-60",
        },
        {
          dayOfWeek: 3,
          startMin: 19 * 60,
          endMin: 20 * 60,
          timezone: "Asia/Tokyo",
          classLevelId: "lvl-int",
          classTypeId: "ty-gram",
          teacherLessonOfferingId: "off-gram-60",
        },
      ]),
    );

    expect(res.status).toBe(200);
    expect(offeringCreateManyMock).not.toHaveBeenCalled();
    expect(availabilityCreateManyMock).toHaveBeenCalledWith({
      data: expect.arrayContaining([
        expect.objectContaining({ teacherLessonOfferingId: "off-conv-60" }),
        expect.objectContaining({ teacherLessonOfferingId: "off-gram-60" }),
      ]),
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
          teacherLessonOfferingId: "off-conv-60",
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
          teacherLessonOfferingId: "off-pron-60",
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
          teacherLessonOfferingId: "off-pron-60",
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

  test("persists teacher recurrence and date bounds", async () => {
    const res = await PATCH(
      patchRequest([
        {
          dayOfWeek: 5,
          startMin: 10 * 60,
          endMin: 11 * 60,
          timezone: "Asia/Tokyo",
          recurrence: "ONE_OFF",
          startsOn: "2026-05-15",
          endsOn: "2026-05-15",
          classLevelId: "lvl-int",
          classTypeId: "ty-conv",
          teacherLessonOfferingId: "off-conv-60",
        },
      ]),
    );

    expect(res.status).toBe(200);
    expect(availabilityCreateManyMock).toHaveBeenCalledWith({
      data: [
        expect.objectContaining({
          teacherId: "tp-1",
          recurrence: "ONE_OFF",
          startsOn: new Date("2026-05-15T00:00:00.000Z"),
          endsOn: new Date("2026-05-15T00:00:00.000Z"),
        }),
      ],
    });
  });
});
