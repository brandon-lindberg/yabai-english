/**
 * Per-teacher default taxonomy. Mirrors `school-default-taxonomy` but scoped
 * to a marketplace `TeacherProfile`. The default codes deliberately match the
 * legacy `AvailabilitySlot.lessonLevel` / `lessonType` enum strings so the
 * one-shot data backfill (in the schema migration) and any catalog matching
 * logic that keys on those codes continue to work.
 */
type TaxonomyTx = {
  teacherClassLevel: {
    createMany: (args: {
      data: Array<{
        teacherId: string;
        code: string;
        labelEn: string;
        labelJa: string;
        sortOrder: number;
      }>;
      skipDuplicates: boolean;
    }) => Promise<unknown>;
  };
  teacherClassType: {
    createMany: (args: {
      data: Array<{
        teacherId: string;
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
  { code: "business", labelEn: "Business", labelJa: "ビジネス" },
] as const;

export async function seedDefaultTeacherTaxonomy(
  tx: TaxonomyTx,
  teacherId: string,
): Promise<void> {
  await tx.teacherClassLevel.createMany({
    data: DEFAULT_LEVELS.map((entry, index) => ({
      teacherId,
      code: entry.code,
      labelEn: entry.labelEn,
      labelJa: entry.labelJa,
      sortOrder: index,
    })),
    skipDuplicates: true,
  });
  await tx.teacherClassType.createMany({
    data: DEFAULT_TYPES.map((entry, index) => ({
      teacherId,
      code: entry.code,
      labelEn: entry.labelEn,
      labelJa: entry.labelJa,
      sortOrder: index,
    })),
    skipDuplicates: true,
  });
}
