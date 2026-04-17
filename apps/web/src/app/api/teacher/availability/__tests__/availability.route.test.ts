import { beforeEach, describe, expect, test, vi } from "vitest";

const {
  authMock,
  profileUpsertMock,
  profileFindUniqueMock,
  availabilityDeleteManyMock,
  availabilityCreateManyMock,
  offeringFindManyMock,
  offeringCreateManyMock,
  transactionMock,
  ensureCatalogProductsMock,
} = vi.hoisted(() => ({
  authMock: vi.fn(),
  profileUpsertMock: vi.fn(),
  profileFindUniqueMock: vi.fn(),
  availabilityDeleteManyMock: vi.fn(),
  availabilityCreateManyMock: vi.fn(),
  offeringFindManyMock: vi.fn(),
  offeringCreateManyMock: vi.fn(),
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
      findUnique: profileFindUniqueMock,
    },
    availabilitySlot: {
      deleteMany: availabilityDeleteManyMock,
      createMany: availabilityCreateManyMock,
    },
    teacherLessonOffering: {
      findMany: offeringFindManyMock,
      createMany: offeringCreateManyMock,
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
    profileUpsertMock.mockResolvedValue({ id: "tp-1", rateYen: 3500 });
    profileFindUniqueMock.mockResolvedValue({
      id: "tp-1",
      rateYen: 3500,
      lessonOfferings: [
        {
          lessonType: "conversation",
          lessonTypeCustom: null,
          active: true,
          rateYen: 3500,
          isGroup: false,
        },
      ],
    });
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

  test("creates a matching lesson offering when schedule introduces a new lesson type", async () => {
    const res = await PATCH(
      patchRequest([
        {
          dayOfWeek: 1,
          startMin: 10 * 60,
          endMin: 11 * 60,
          timezone: "Asia/Tokyo",
          lessonLevel: "intermediate",
          lessonType: "conversation",
        },
        {
          dayOfWeek: 3,
          startMin: 19 * 60,
          endMin: 20 * 60,
          timezone: "Asia/Tokyo",
          lessonLevel: "intermediate",
          lessonType: "grammar",
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
          lessonType: "grammar",
          lessonTypeCustom: null,
        },
      ],
    });
  });

  test("does not create any new offerings when all schedule types are already covered", async () => {
    profileFindUniqueMock.mockResolvedValue({
      id: "tp-1",
      rateYen: 3500,
      lessonOfferings: [
        {
          lessonType: "conversation",
          lessonTypeCustom: null,
          active: true,
          rateYen: 3500,
          isGroup: false,
        },
      ],
    });

    const res = await PATCH(
      patchRequest([
        {
          dayOfWeek: 1,
          startMin: 10 * 60,
          endMin: 11 * 60,
          timezone: "Asia/Tokyo",
          lessonLevel: "intermediate",
          lessonType: "conversation",
        },
      ]),
    );

    expect(res.status).toBe(200);
    expect(offeringCreateManyMock).not.toHaveBeenCalled();
  });

  test("uses 40-min default duration for pronunciation so the offering maps to a catalog product", async () => {
    profileFindUniqueMock.mockResolvedValue({
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
          lessonLevel: "advanced",
          lessonType: "pronunciation",
        },
      ]),
    );

    expect(res.status).toBe(200);
    expect(offeringCreateManyMock).toHaveBeenCalledWith({
      data: [
        expect.objectContaining({
          teacherId: "tp-1",
          durationMin: 40,
          lessonType: "pronunciation",
          rateYen: 4200,
          isGroup: false,
          active: true,
        }),
      ],
    });
  });

  test("provisions catalog products so every new offering is bookable", async () => {
    profileFindUniqueMock.mockResolvedValue({
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
          lessonLevel: "advanced",
          lessonType: "pronunciation",
        },
      ]),
    );

    expect(res.status).toBe(200);
    expect(ensureCatalogProductsMock).toHaveBeenCalledTimes(1);
    const [, offerings] = ensureCatalogProductsMock.mock.calls[0];
    expect(offerings).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          lessonType: "pronunciation",
          durationMin: 40,
          active: true,
        }),
      ]),
    );
  });
});
