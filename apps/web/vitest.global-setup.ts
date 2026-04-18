import { PrismaClient } from "@prisma/client";
import { seedPlacementBankQuestions } from "./prisma/seed-placement-bank";

/**
 * Runs once before Vitest workers. Seeds placement bank from `data/placement-bank/*.json`
 * so `getPlacementBankQuestions` is warm and per-file `beforeAll` only needs `ensurePlacementBankSeeded`.
 */
export default async function globalSetup() {
  if (!process.env.DATABASE_URL) {
    console.warn(
      "[vitest globalSetup] DATABASE_URL is unset; placement tests need Postgres. Skipping placement seed.",
    );
    return;
  }

  const prisma = new PrismaClient();
  try {
    await seedPlacementBankQuestions(prisma);
  } catch (e) {
    console.warn(
      "[vitest globalSetup] Placement seed skipped (database unavailable or error):",
      e instanceof Error ? e.message : e,
    );
  } finally {
    await prisma.$disconnect();
  }
}
