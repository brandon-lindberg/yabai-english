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
  /** When set, limits which catalog products this row applies to (see `catalogProductMatchesOffering`). */
  lessonType?: string | null;
  lessonTypeCustom?: string | null;
};

/**
 * Which availability "lesson type" keys (AvailabilitySlot.lessonType) map to a catalog product.
 * Used to align teacher rate rows with LessonProduct tiers (e.g. 英会話 vs 標準).
 */
export function lessonTypeKeysForCatalogProduct(
  tier: LessonTier,
  durationMin: number,
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
      if (durationMin === 30) {
        return ["grammar", "reading", "writing", "business", "custom"];
      }
      if (durationMin === 40) {
        return [
          "conversation",
          "grammar",
          "reading",
          "writing",
          "business",
          "custom",
        ];
      }
      return [
        "conversation",
        "grammar",
        "reading",
        "writing",
        "business",
        "custom",
        "pronunciation",
      ];
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
  if (offering.lessonType == null || offering.lessonType === "") {
    return true;
  }
  const allowed = lessonTypeKeysForCatalogProduct(product.tier, product.durationMin);
  if (allowed === null) return true;
  return (allowed as readonly string[]).includes(offering.lessonType);
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
