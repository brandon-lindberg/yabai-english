/**
 * One-off backfill for the LessonProduct catalog.
 *
 * Creates a `LessonProduct` for every `(inferred tier, durationMin)` combination
 * that at least one active `TeacherLessonOffering` uses. This makes every
 * existing teacher offering visible in the student booking dropdown without
 * requiring each teacher to resave their profile/schedule.
 *
 * Run with:
 *   yarn tsx apps/web/scripts/backfill-catalog-products.ts
 */
import { prisma } from "../src/lib/prisma";
import { ensureCatalogProductsForOfferings } from "../src/lib/lesson-product-catalog";

async function main() {
  const offerings = await prisma.teacherLessonOffering.findMany({
    where: { active: true },
    select: {
      lessonType: true,
      durationMin: true,
      active: true,
    },
  });

  console.log(`Found ${offerings.length} active teacher offerings.`);

  const before = await prisma.lessonProduct.count();
  await ensureCatalogProductsForOfferings(prisma, offerings);
  const after = await prisma.lessonProduct.count();

  console.log(
    `LessonProduct rows: ${before} → ${after} (created ${after - before}).`,
  );

  await prisma.$disconnect();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
