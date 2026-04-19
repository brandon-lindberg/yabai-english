import { beforeEach, describe, expect, test, vi } from "vitest";
import { LessonTier } from "@/generated/prisma/client";

const { findManyMock, findUniqueMock } = vi.hoisted(() => ({
  findManyMock: vi.fn(),
  findUniqueMock: vi.fn(),
}));

vi.mock("@/lib/prisma", () => ({
  prisma: {
    lessonProduct: {
      findMany: findManyMock,
    },
    teacherProfile: {
      findUnique: findUniqueMock,
    },
  },
}));

import { GET } from "@/app/api/lesson-products/route";

describe("GET /api/lesson-products", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    findManyMock.mockResolvedValue([
      { id: "trial", tier: LessonTier.FREE_TRIAL, active: true, durationMin: 20 },
      { id: "std30", tier: LessonTier.STANDARD, active: true, durationMin: 30 },
      { id: "std60", tier: LessonTier.STANDARD, active: true, durationMin: 60 },
    ]);
  });

  test("returns all active products without teacher context", async () => {
    const res = await GET(new Request("http://localhost/api/lesson-products"));
    expect(res.status).toBe(200);
    await expect(res.json()).resolves.toHaveLength(3);
    expect(findUniqueMock).not.toHaveBeenCalled();
  });

  test("filters out free trial when teacher disabled it", async () => {
    findUniqueMock.mockResolvedValue({
      offersFreeTrial: false,
      lessonOfferings: [
        {
          id: "off-60",
          durationMin: 60,
          rateYen: 4000,
          isGroup: false,
          active: true,
          lessonType: null,
          lessonTypeCustom: null,
        },
      ],
    });

    const res = await GET(new Request("http://localhost/api/lesson-products?teacherProfileId=t1"));
    await expect(res.json()).resolves.toEqual([
      {
        id: "std60",
        tier: LessonTier.STANDARD,
        active: true,
        durationMin: 60,
        teacherLessonOfferingId: "off-60",
        teacherLessonType: null,
        teacherLessonTypeCustom: null,
        teacherRateYen: 4000,
        teacherGroupSize: null,
        teacherIsGroupOffer: false,
      },
    ]);
  });

  test("returns duplicate duration options when teacher offers multiple lesson focuses", async () => {
    findManyMock.mockResolvedValue([
      { id: "trial", tier: LessonTier.FREE_TRIAL, active: true, durationMin: 20 },
      { id: "eik30", tier: LessonTier.EIKAWA, active: true, durationMin: 30 },
      { id: "std30", tier: LessonTier.STANDARD, active: true, durationMin: 30 },
    ]);
    findUniqueMock.mockResolvedValue({
      offersFreeTrial: true,
      lessonOfferings: [
        {
          id: "off-conv-30",
          durationMin: 30,
          rateYen: 3200,
          isGroup: false,
          active: true,
          lessonType: "conversation",
          lessonTypeCustom: null,
        },
        {
          id: "off-gram-30",
          durationMin: 30,
          rateYen: 3600,
          isGroup: false,
          active: true,
          lessonType: "grammar",
          lessonTypeCustom: null,
        },
      ],
    });

    const res = await GET(new Request("http://localhost/api/lesson-products?teacherProfileId=t2"));
    await expect(res.json()).resolves.toEqual([
      { id: "trial", tier: LessonTier.FREE_TRIAL, active: true, durationMin: 20 },
      {
        id: "eik30",
        tier: LessonTier.EIKAWA,
        active: true,
        durationMin: 30,
        teacherLessonOfferingId: "off-conv-30",
        teacherLessonType: "conversation",
        teacherLessonTypeCustom: null,
        teacherRateYen: 3200,
        teacherGroupSize: null,
        teacherIsGroupOffer: false,
      },
      {
        id: "std30",
        tier: LessonTier.STANDARD,
        active: true,
        durationMin: 30,
        teacherLessonOfferingId: "off-gram-30",
        teacherLessonType: "grammar",
        teacherLessonTypeCustom: null,
        teacherRateYen: 3600,
        teacherGroupSize: null,
        teacherIsGroupOffer: false,
      },
    ]);
  });

  test("includes group offerings in the student dropdown options", async () => {
    findManyMock.mockResolvedValue([
      { id: "eik40", tier: LessonTier.EIKAWA, active: true, durationMin: 40 },
    ]);
    findUniqueMock.mockResolvedValue({
      offersFreeTrial: true,
      lessonOfferings: [
        {
          id: "off-group-40",
          durationMin: 40,
          rateYen: 7000,
          isGroup: true,
          active: true,
          lessonType: "conversation",
          lessonTypeCustom: null,
          groupSize: 4,
        },
      ],
    });

    const res = await GET(new Request("http://localhost/api/lesson-products?teacherProfileId=t3"));
    await expect(res.json()).resolves.toEqual([
      {
        id: "eik40",
        tier: LessonTier.EIKAWA,
        active: true,
        durationMin: 40,
        teacherLessonOfferingId: "off-group-40",
        teacherLessonType: "conversation",
        teacherLessonTypeCustom: null,
        teacherRateYen: 7000,
        teacherGroupSize: 4,
        teacherIsGroupOffer: true,
      },
    ]);
  });
});
