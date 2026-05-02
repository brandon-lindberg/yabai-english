import { LessonTier } from "@/generated/prisma/client";

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
  /**
   * Joined TeacherClassType row. When null/undefined, the offering matches any
   * catalog product for its duration (legacy/wildcard behavior).
   */
  classType?: { code: string } | null;
};

/**
 * Which class-type codes map to a catalog product. Codes are stable per-teacher
 * (we seed `TeacherClassType` defaults with these exact codes), so the catalog
 * keeps a single canonical mapping rather than duplicating it per teacher.
 */
export function classTypeCodesForCatalogProduct(
  tier: LessonTier,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  _durationMin: number,
): readonly string[] | null {
  switch (tier) {
    case LessonTier.FREE_TRIAL:
    case LessonTier.PREMIUM:
    case LessonTier.SPECIALIZED:
      return null;
    case LessonTier.EIKAWA:
      return ["conversation"];
    case LessonTier.PRONUNCIATION_ACTING:
    case LessonTier.PRONUNCIATION_SINGING:
      return ["pronunciation"];
    case LessonTier.STANDARD:
      // STANDARD is the "generic" tier. Specialty tiers (EIKAWA for conversation,
      // PRONUNCIATION_* for pronunciation) own those codes exclusively so we
      // exclude them here.
      return ["grammar", "reading", "writing", "business"];
    default:
      return null;
  }
}

/** Whether a teacher's rate row applies to a given catalog product. */
export function catalogProductMatchesOffering(
  product: { tier: LessonTier; durationMin: number },
  offering: TeacherLessonOfferingLike,
): boolean {
  if (!offering.active) return false;
  if (product.durationMin !== offering.durationMin) return false;
  const code = offering.classType?.code;
  if (!code) return true; // wildcard offering
  const allowed = classTypeCodesForCatalogProduct(product.tier, product.durationMin);
  if (allowed === null) return true;
  return (allowed as readonly string[]).includes(code);
}

export function teacherHasOfferingForProduct(
  offerings: TeacherLessonOfferingLike[],
  product: { tier: LessonTier; durationMin: number },
): boolean {
  if (product.tier === LessonTier.FREE_TRIAL) {
    return offerings.some((o) => o.active);
  }
  return offerings.some(
    (o) =>
      o.active &&
      catalogProductMatchesOffering(product, o),
  );
}

export function resolveTeacherRateForProduct(
  offerings: TeacherLessonOfferingLike[],
  product: { tier: LessonTier; durationMin: number },
  fallbackRateYen: number | null | undefined,
): number {
  const matches = offerings.filter(
    (o) =>
      o.active &&
      catalogProductMatchesOffering(product, o),
  );
  if (matches.length === 0) {
    return fallbackRateYen ?? 3000;
  }
  return matches[0].rateYen;
}

export function filterProductsByIndividualOfferings<T extends ProductWithTier & { durationMin: number }>(
  products: T[],
  offerings: TeacherLessonOfferingLike[],
): T[] {
  const activeOfferings = offerings.filter((o) => o.active);
  if (activeOfferings.length === 0) return products;
  return products.filter((p) => {
    if (p.tier === LessonTier.FREE_TRIAL) {
      return true;
    }
    return activeOfferings.some((o) => catalogProductMatchesOffering(p, o));
  });
}
