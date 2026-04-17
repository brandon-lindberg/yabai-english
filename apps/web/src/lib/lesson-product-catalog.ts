/**
 * Keeps the `LessonProduct` catalog in lockstep with the `(lessonType, durationMin)`
 * combinations that teachers actually offer.
 *
 * Why: the student booking dropdown is built from catalog products. A teacher
 * offering (e.g. pronunciation @ 30 min) with no matching catalog row would be
 * silently hidden from students. This module provisions the missing rows as
 * part of the save flow so every active offering has a bookable product.
 *
 * Shape of an auto-generated row is stable and idempotent: `auto-<TIER>-<DURATION>`.
 * If an equivalent seeded row already exists for the same `(tier, durationMin)`,
 * we skip it — this function only ADDs, never edits or removes.
 */

import { LessonTier } from "@prisma/client";

type OfferingLike = {
  lessonType: string | null;
  durationMin: number;
  active: boolean;
};

type CatalogProductRow = {
  id: string;
  tier: LessonTier;
  durationMin: number;
  nameJa: string;
  nameEn: string;
  active: true;
};

type CatalogTx = {
  lessonProduct: {
    findMany: (args: {
      where: {
        OR: Array<{
          AND?: [{ tier: LessonTier }, { durationMin: number }];
          id?: { in: string[] };
        }>;
      };
      select: { id: true; tier: true; durationMin: true };
    }) => Promise<Array<{ id: string; tier: LessonTier; durationMin: number }>>;
    create: (args: { data: CatalogProductRow }) => Promise<unknown>;
  };
};

export function inferLessonTierForOffering(offering: {
  lessonType: string | null;
}): LessonTier {
  switch (offering.lessonType) {
    case "conversation":
      return LessonTier.EIKAWA;
    case "pronunciation":
      return LessonTier.PRONUNCIATION_ACTING;
    default:
      return LessonTier.STANDARD;
  }
}

function nameForTier(
  tier: LessonTier,
  durationMin: number,
): { nameJa: string; nameEn: string } {
  switch (tier) {
    case LessonTier.EIKAWA:
      return {
        nameJa: `英会話（${durationMin}分）`,
        nameEn: `Conversation (Eikawa) — ${durationMin} min`,
      };
    case LessonTier.PRONUNCIATION_ACTING:
      return {
        nameJa: `発音・演技（${durationMin}分）`,
        nameEn: `Pronunciation — Acting (${durationMin} min)`,
      };
    case LessonTier.PRONUNCIATION_SINGING:
      return {
        nameJa: `発音・歌唱（${durationMin}分）`,
        nameEn: `Pronunciation — Singing (${durationMin} min)`,
      };
    case LessonTier.PREMIUM:
      return {
        nameJa: `プレミアムレッスン（${durationMin}分）`,
        nameEn: `Premium (${durationMin} min)`,
      };
    case LessonTier.SPECIALIZED:
      return {
        nameJa: `特別レッスン（${durationMin}分）`,
        nameEn: `Specialized (${durationMin} min)`,
      };
    case LessonTier.FREE_TRIAL:
      return {
        nameJa: `無料トライアル（${durationMin}分）`,
        nameEn: `Free trial (${durationMin} min)`,
      };
    case LessonTier.STANDARD:
    default:
      return {
        nameJa: `標準レッスン（${durationMin}分）`,
        nameEn: `Standard (${durationMin} min)`,
      };
  }
}

export function buildCatalogProductForOffering(offering: {
  lessonType: string | null;
  durationMin: number;
}): CatalogProductRow {
  const tier = inferLessonTierForOffering(offering);
  const { nameJa, nameEn } = nameForTier(tier, offering.durationMin);
  return {
    id: `auto-${tier}-${offering.durationMin}`,
    tier,
    durationMin: offering.durationMin,
    nameJa,
    nameEn,
    active: true,
  };
}

function keyFor(tier: LessonTier, durationMin: number): string {
  return `${tier}::${durationMin}`;
}

export async function ensureCatalogProductsForOfferings(
  tx: CatalogTx,
  offerings: OfferingLike[],
): Promise<void> {
  const activeOfferings = offerings.filter((o) => o.active);
  if (activeOfferings.length === 0) return;

  const targetsByKey = new Map<string, CatalogProductRow>();
  for (const offering of activeOfferings) {
    const built = buildCatalogProductForOffering(offering);
    targetsByKey.set(keyFor(built.tier, built.durationMin), built);
  }
  if (targetsByKey.size === 0) return;

  const orConditions = Array.from(targetsByKey.values()).map((row) => ({
    AND: [{ tier: row.tier }, { durationMin: row.durationMin }] as [
      { tier: LessonTier },
      { durationMin: number },
    ],
  }));

  const existingRows = await tx.lessonProduct.findMany({
    where: { OR: orConditions },
    select: { id: true, tier: true, durationMin: true },
  });

  const existingKeys = new Set<string>();
  for (const row of existingRows) {
    existingKeys.add(keyFor(row.tier, row.durationMin));
  }

  for (const [key, row] of targetsByKey.entries()) {
    if (existingKeys.has(key)) continue;
    await tx.lessonProduct.create({ data: row });
  }
}
