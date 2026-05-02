import { describe, expect, test, vi } from "vitest";
import { seedDefaultSchoolTaxonomy } from "../school-default-taxonomy";

function makeTx() {
  return {
    schoolClassLevel: { createMany: vi.fn().mockResolvedValue({ count: 0 }) },
    schoolClassType: { createMany: vi.fn().mockResolvedValue({ count: 0 }) },
  };
}

describe("seedDefaultSchoolTaxonomy", () => {
  test("seeds three levels (Beginner / Intermediate / Advanced)", async () => {
    const tx = makeTx();
    await seedDefaultSchoolTaxonomy(tx, "school-1");
    expect(tx.schoolClassLevel.createMany).toHaveBeenCalledTimes(1);
    const arg = tx.schoolClassLevel.createMany.mock.calls[0][0];
    expect(arg.data).toHaveLength(3);
    expect(arg.data.map((d: { code: string }) => d.code)).toEqual([
      "beginner",
      "intermediate",
      "advanced",
    ]);
    for (const row of arg.data) {
      expect(row.schoolId).toBe("school-1");
      expect(row.labelEn).toBeTruthy();
      expect(row.labelJa).toBeTruthy();
    }
  });

  test("seeds five default class types", async () => {
    const tx = makeTx();
    await seedDefaultSchoolTaxonomy(tx, "school-1");
    expect(tx.schoolClassType.createMany).toHaveBeenCalledTimes(1);
    const arg = tx.schoolClassType.createMany.mock.calls[0][0];
    expect(arg.data.map((d: { code: string }) => d.code)).toEqual([
      "conversation",
      "grammar",
      "reading",
      "writing",
      "pronunciation",
    ]);
    for (const row of arg.data) {
      expect(row.schoolId).toBe("school-1");
      expect(row.labelEn).toBeTruthy();
      expect(row.labelJa).toBeTruthy();
    }
  });

  test("preserves sort order matching the array order", async () => {
    const tx = makeTx();
    await seedDefaultSchoolTaxonomy(tx, "s");
    const lvls = tx.schoolClassLevel.createMany.mock.calls[0][0].data;
    expect(lvls.map((l: { sortOrder: number }) => l.sortOrder)).toEqual([
      0, 1, 2,
    ]);
    const tys = tx.schoolClassType.createMany.mock.calls[0][0].data;
    expect(tys.map((t: { sortOrder: number }) => t.sortOrder)).toEqual([
      0, 1, 2, 3, 4,
    ]);
  });

  test("uses skipDuplicates so re-seeding is safe", async () => {
    const tx = makeTx();
    await seedDefaultSchoolTaxonomy(tx, "s");
    expect(tx.schoolClassLevel.createMany.mock.calls[0][0].skipDuplicates).toBe(
      true,
    );
    expect(tx.schoolClassType.createMany.mock.calls[0][0].skipDuplicates).toBe(
      true,
    );
  });
});
