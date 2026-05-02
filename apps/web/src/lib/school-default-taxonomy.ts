/**
 * Minimal Prisma-like surface needed by `seedDefaultSchoolTaxonomy`. Accepts
 * either the full `PrismaClient` or a transaction client (`tx`).
 */
type TaxonomyTx = {
  schoolClassLevel: {
    createMany: (args: {
      data: Array<{
        schoolId: string;
        code: string;
        labelEn: string;
        labelJa: string;
        sortOrder: number;
      }>;
      skipDuplicates: boolean;
    }) => Promise<unknown>;
  };
  schoolClassType: {
    createMany: (args: {
      data: Array<{
        schoolId: string;
        code: string;
        labelEn: string;
        labelJa: string;
        sortOrder: number;
      }>;
      skipDuplicates: boolean;
    }) => Promise<unknown>;
  };
};

const DEFAULT_LEVELS = [
  { code: "beginner", labelEn: "Beginner", labelJa: "初級" },
  { code: "intermediate", labelEn: "Intermediate", labelJa: "中級" },
  { code: "advanced", labelEn: "Advanced", labelJa: "上級" },
] as const;

const DEFAULT_TYPES = [
  { code: "conversation", labelEn: "Conversation", labelJa: "会話" },
  { code: "grammar", labelEn: "Grammar", labelJa: "文法" },
  { code: "reading", labelEn: "Reading", labelJa: "リーディング" },
  { code: "writing", labelEn: "Writing", labelJa: "ライティング" },
  { code: "pronunciation", labelEn: "Pronunciation", labelJa: "発音" },
] as const;

/**
 * Populate a newly-created school with a sensible starter taxonomy so admins
 * can create slots immediately. Safe to call repeatedly: relies on the
 * `(schoolId, code)` unique constraint via `skipDuplicates`.
 */
export async function seedDefaultSchoolTaxonomy(
  tx: TaxonomyTx,
  schoolId: string,
): Promise<void> {
  await tx.schoolClassLevel.createMany({
    data: DEFAULT_LEVELS.map((entry, index) => ({
      schoolId,
      code: entry.code,
      labelEn: entry.labelEn,
      labelJa: entry.labelJa,
      sortOrder: index,
    })),
    skipDuplicates: true,
  });
  await tx.schoolClassType.createMany({
    data: DEFAULT_TYPES.map((entry, index) => ({
      schoolId,
      code: entry.code,
      labelEn: entry.labelEn,
      labelJa: entry.labelJa,
      sortOrder: index,
    })),
    skipDuplicates: true,
  });
}
