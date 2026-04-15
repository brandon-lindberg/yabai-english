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
