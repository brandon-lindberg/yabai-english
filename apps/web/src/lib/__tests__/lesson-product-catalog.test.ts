import { beforeEach, describe, expect, test, vi } from "vitest";
import { LessonTier } from "@prisma/client";
import {
  buildCatalogProductForOffering,
  ensureCatalogProductsForOfferings,
  inferLessonTierForOffering,
} from "@/lib/lesson-product-catalog";

describe("inferLessonTierForOffering", () => {
  test("conversation → EIKAWA", () => {
    expect(inferLessonTierForOffering({ lessonType: "conversation" })).toBe(
      LessonTier.EIKAWA,
    );
  });

  test("pronunciation → PRONUNCIATION_ACTING", () => {
    expect(inferLessonTierForOffering({ lessonType: "pronunciation" })).toBe(
      LessonTier.PRONUNCIATION_ACTING,
    );
  });

  test.each([
    "grammar",
    "reading",
    "writing",
    "business",
    "custom",
    null,
  ] as const)("%s → STANDARD", (lessonType) => {
    expect(inferLessonTierForOffering({ lessonType })).toBe(
      LessonTier.STANDARD,
    );
  });
});

describe("buildCatalogProductForOffering", () => {
  test("pronunciation @ 30 min builds a PRONUNCIATION_ACTING catalog row", () => {
    const product = buildCatalogProductForOffering({
      lessonType: "pronunciation",
      durationMin: 30,
    });
    expect(product).toEqual({
      id: "auto-PRONUNCIATION_ACTING-30",
      tier: LessonTier.PRONUNCIATION_ACTING,
      durationMin: 30,
      nameJa: expect.stringContaining("発音"),
      nameEn: expect.stringContaining("Pronunciation"),
      active: true,
    });
  });

  test("conversation @ 60 min builds an EIKAWA catalog row", () => {
    const product = buildCatalogProductForOffering({
      lessonType: "conversation",
      durationMin: 60,
    });
    expect(product.tier).toBe(LessonTier.EIKAWA);
    expect(product.durationMin).toBe(60);
    expect(product.id).toBe("auto-EIKAWA-60");
    expect(product.nameJa).toContain("60");
    expect(product.nameEn.toLowerCase()).toContain("conversation");
  });

  test("grammar @ 90 min builds a STANDARD catalog row", () => {
    const product = buildCatalogProductForOffering({
      lessonType: "grammar",
      durationMin: 90,
    });
    expect(product.tier).toBe(LessonTier.STANDARD);
    expect(product.id).toBe("auto-STANDARD-90");
  });
});

describe("ensureCatalogProductsForOfferings", () => {
  const findManyMock = vi.fn();
  const createMock = vi.fn();
  const tx = {
    lessonProduct: { findMany: findManyMock, create: createMock },
  } as unknown as Parameters<typeof ensureCatalogProductsForOfferings>[0];

  beforeEach(() => {
    findManyMock.mockReset();
    createMock.mockReset();
  });

  test("creates missing catalog rows for active offerings", async () => {
    findManyMock.mockResolvedValueOnce([]);
    createMock.mockResolvedValue({});

    await ensureCatalogProductsForOfferings(tx, [
      { lessonType: "pronunciation", durationMin: 30, active: true },
      { lessonType: "conversation", durationMin: 60, active: true },
    ]);

    expect(createMock).toHaveBeenCalledTimes(2);
    const created = createMock.mock.calls.map((c) => c[0].data);
    expect(
      created.some(
        (d) =>
          d.tier === LessonTier.PRONUNCIATION_ACTING && d.durationMin === 30,
      ),
    ).toBe(true);
    expect(
      created.some((d) => d.tier === LessonTier.EIKAWA && d.durationMin === 60),
    ).toBe(true);
  });

  test("skips inactive offerings entirely", async () => {
    findManyMock.mockResolvedValueOnce([]);
    await ensureCatalogProductsForOfferings(tx, [
      { lessonType: "pronunciation", durationMin: 30, active: false },
    ]);
    expect(createMock).not.toHaveBeenCalled();
  });

  test("does not create a duplicate when a catalog row for (tier, durationMin) already exists", async () => {
    findManyMock.mockResolvedValueOnce([
      {
        id: "seed-PRONUNCIATION_ACTING-40",
        tier: LessonTier.PRONUNCIATION_ACTING,
        durationMin: 40,
      },
    ]);
    createMock.mockResolvedValue({});

    await ensureCatalogProductsForOfferings(tx, [
      { lessonType: "pronunciation", durationMin: 40, active: true },
      { lessonType: "pronunciation", durationMin: 30, active: true },
    ]);

    // only the 30-min combo should be newly created
    expect(createMock).toHaveBeenCalledTimes(1);
    expect(createMock.mock.calls[0][0].data.durationMin).toBe(30);
  });

  test("deduplicates offerings that collapse to the same (tier, duration)", async () => {
    findManyMock.mockResolvedValueOnce([]);
    createMock.mockResolvedValue({});

    await ensureCatalogProductsForOfferings(tx, [
      { lessonType: "grammar", durationMin: 30, active: true },
      { lessonType: "reading", durationMin: 30, active: true },
    ]);

    expect(createMock).toHaveBeenCalledTimes(1);
    expect(createMock.mock.calls[0][0].data.tier).toBe(LessonTier.STANDARD);
  });
});
