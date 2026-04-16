import { beforeEach, describe, expect, test, vi } from "vitest";
import { LessonTier } from "@prisma/client";

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
      lessonOfferings: [{ durationMin: 60, rateYen: 4000, isGroup: false, active: true }],
    });

    const res = await GET(new Request("http://localhost/api/lesson-products?teacherProfileId=t1"));
    await expect(res.json()).resolves.toEqual([
      { id: "std60", tier: LessonTier.STANDARD, active: true, durationMin: 60 },
    ]);
  });
});
