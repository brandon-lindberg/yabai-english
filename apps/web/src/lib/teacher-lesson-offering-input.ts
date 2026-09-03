import { z } from "zod";
import { perStudentRateYen } from "@/lib/group-lesson-pricing";
import { validatePublicLessonRateYen } from "@/lib/lesson-rate-policy";

/**
 * One class as a teacher submits it, and the rules every write path holds it to.
 *
 * There are two of those paths now — the rates form saves the whole set, and the
 * add-a-class modal creates one — and a class accepted by one and refused by the
 * other would be a bug nobody could explain. So the shape, the arithmetic and
 * the floor live here rather than in either route.
 */

export const lessonOfferingInputSchema = z.object({
  durationMin: z.number().int().min(15).max(180),
  /** What ONE student pays. Recomputed below for a group class. */
  rateYen: z.number().int().min(1).max(9_999_999),
  /** The teacher's figure for the whole class. Group offerings only. */
  groupTotalRateYen: z.number().int().min(1).max(9_999_999).nullable().optional(),
  /**
   * Which figure the teacher typed. Storage is always tax-included, so this
   * only decides what the form shows back — but it is per class.
   */
  ratePriceBasis: z.enum(["TAX_INCLUDED", "TAX_EXCLUSIVE"]).optional(),
  isGroup: z.boolean(),
  groupSize: z.number().int().min(2).max(30).nullable(),
  /** FK to TeacherClassLevel.id; required so level/type/duration/price stay together. */
  classLevelId: z.string().min(1),
  /** FK to TeacherClassType.id; null/undefined = wildcard offering. */
  classTypeId: z.string().min(1).nullable().optional(),
});

export type LessonOfferingInput = z.infer<typeof lessonOfferingInputSchema>;

/**
 * Settles what the class actually costs one student.
 *
 * For a group class the server divides the teacher's total itself and ignores
 * the `rateYen` it was sent: taking that on trust would let a crafted request
 * store a share that disagrees with the total beside it — two numbers claiming
 * to describe one price.
 */
export function normalizeLessonOfferingInput<T extends LessonOfferingInput>(
  offering: T,
): T & { groupTotalRateYen: number | null } {
  if (!offering.isGroup || !offering.groupSize || !offering.groupTotalRateYen) {
    return { ...offering, groupTotalRateYen: null };
  }
  return {
    ...offering,
    groupTotalRateYen: offering.groupTotalRateYen,
    rateYen: perStudentRateYen(offering.groupTotalRateYen, offering.groupSize),
  };
}

/** The floor, held against what a student pays. Null when the class is fine. */
export function lessonOfferingRateError(
  offering: Pick<LessonOfferingInput, "rateYen">,
): string | null {
  const check = validatePublicLessonRateYen(offering.rateYen);
  return check.ok ? null : check.error;
}

/** The row to write, from an already-normalized input. */
export function lessonOfferingCreateData(
  offering: LessonOfferingInput & { groupTotalRateYen: number | null },
  teacherId: string,
) {
  return {
    teacherId,
    durationMin: offering.durationMin,
    rateYen: offering.rateYen,
    groupTotalRateYen: offering.isGroup ? offering.groupTotalRateYen ?? null : null,
    ratePriceBasis: offering.ratePriceBasis ?? ("TAX_INCLUDED" as const),
    isGroup: offering.isGroup,
    groupSize: offering.isGroup ? offering.groupSize : null,
    active: true,
    classLevelId: offering.classLevelId,
    classTypeId: offering.classTypeId ?? null,
  };
}
