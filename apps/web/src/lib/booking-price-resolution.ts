import { LessonTier } from "@/generated/prisma/client";
import {
  resolveTeacherRateForProduct,
  type TeacherLessonOfferingLike,
} from "@/lib/lesson-products";

export type StudentLessonRateOverrideLike = {
  rateYen: number;
} | null;

export function resolveQuotedPriceYen(input: {
  product: { tier: LessonTier; durationMin: number };
  selectedOffering: (TeacherLessonOfferingLike & { id?: string }) | null;
  offerings?: TeacherLessonOfferingLike[];
  fallbackRateYen: number | null | undefined;
  studentOverride: StudentLessonRateOverrideLike;
}): number {
  if (input.product.tier === LessonTier.FREE_TRIAL) {
    return 0;
  }

  if (input.studentOverride?.rateYen && input.studentOverride.rateYen > 0) {
    return input.studentOverride.rateYen;
  }

  if (input.selectedOffering) {
    return input.selectedOffering.rateYen;
  }

  return resolveTeacherRateForProduct(
    input.offerings ?? [],
    input.product,
    input.fallbackRateYen,
  );
}
