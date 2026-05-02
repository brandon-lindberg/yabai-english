import { describe, expect, test, vi } from "vitest";
import { seedDefaultTeacherTaxonomy } from "../teacher-default-taxonomy";

function makeTx() {
  return {
    teacherClassLevel: { createMany: vi.fn().mockResolvedValue({ count: 0 }) },
    teacherClassType: { createMany: vi.fn().mockResolvedValue({ count: 0 }) },
  };
}

describe("seedDefaultTeacherTaxonomy", () => {
  test("seeds three levels (beginner / intermediate / advanced)", async () => {
    const tx = makeTx();
    await seedDefaultTeacherTaxonomy(tx, "teacher-1");
    expect(tx.teacherClassLevel.createMany).toHaveBeenCalledTimes(1);
    const arg = tx.teacherClassLevel.createMany.mock.calls[0][0];
    expect(arg.data.map((d: { code: string }) => d.code)).toEqual([
      "beginner",
      "intermediate",
      "advanced",
    ]);
    for (const row of arg.data) {
      expect(row.teacherId).toBe("teacher-1");
      expect(row.labelEn).toBeTruthy();
      expect(row.labelJa).toBeTruthy();
    }
  });

  test("seeds the legacy six class types so backfill / catalog matching keeps working", async () => {
    const tx = makeTx();
    await seedDefaultTeacherTaxonomy(tx, "teacher-1");
    const arg = tx.teacherClassType.createMany.mock.calls[0][0];
    expect(arg.data.map((d: { code: string }) => d.code)).toEqual([
      "conversation",
      "grammar",
      "reading",
      "writing",
      "pronunciation",
      "business",
    ]);
  });

  test("uses skipDuplicates so re-seeding is safe", async () => {
    const tx = makeTx();
    await seedDefaultTeacherTaxonomy(tx, "t");
    expect(tx.teacherClassLevel.createMany.mock.calls[0][0].skipDuplicates).toBe(
      true,
    );
    expect(tx.teacherClassType.createMany.mock.calls[0][0].skipDuplicates).toBe(
      true,
    );
  });

  test("preserves sort order matching the array order", async () => {
    const tx = makeTx();
    await seedDefaultTeacherTaxonomy(tx, "t");
    const lvls = tx.teacherClassLevel.createMany.mock.calls[0][0].data;
    expect(lvls.map((l: { sortOrder: number }) => l.sortOrder)).toEqual([
      0, 1, 2,
    ]);
    const tys = tx.teacherClassType.createMany.mock.calls[0][0].data;
    expect(tys.map((t: { sortOrder: number }) => t.sortOrder)).toEqual([
      0, 1, 2, 3, 4, 5,
    ]);
  });
});
