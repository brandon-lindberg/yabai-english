import { LessonTier } from "@prisma/client";

type ProductWithTier = {
  tier: LessonTier;
};

export function canTeacherOfferProduct(tier: LessonTier, offersFreeTrial: boolean): boolean {
  if (tier === LessonTier.FREE_TRIAL) {
    return offersFreeTrial;
  }
  return true;
}

export function filterLessonProductsForTeacher<T extends ProductWithTier>(
  products: T[],
  offersFreeTrial: boolean,
): T[] {
  return products.filter((p) => canTeacherOfferProduct(p.tier, offersFreeTrial));
}

export type TeacherLessonOfferingLike = {
  durationMin: number;
  rateYen: number;
  isGroup: boolean;
  active: boolean;
};

export function filterProductsByIndividualOfferings<T extends ProductWithTier & { durationMin: number }>(
  products: T[],
  offerings: TeacherLessonOfferingLike[],
): T[] {
  const durations = new Set(
    offerings.filter((o) => o.active && !o.isGroup).map((o) => o.durationMin),
  );
  if (durations.size === 0) return products;
  return products.filter((p) => p.tier === LessonTier.FREE_TRIAL || durations.has(p.durationMin));
}

export function resolveTeacherRateForDuration(
  offerings: TeacherLessonOfferingLike[],
  durationMin: number,
  fallbackRateYen: number | null | undefined,
): number {
  const offering = offerings.find(
    (o) => o.active && !o.isGroup && o.durationMin === durationMin,
  );
  if (offering) return offering.rateYen;
  return fallbackRateYen ?? 3000;
}
