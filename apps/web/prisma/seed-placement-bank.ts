import type { PrismaClient } from "@prisma/client";
import path from "node:path";
import { EXPECTED_PLACEMENT_QUESTION_TOTAL } from "../src/lib/placement-bank/constants";
import { loadPlacementBankSync } from "../src/lib/placement-bank/load-placement-bank";

/**
 * Upserts the full placement bank from `data/placement-bank/*.json` into Postgres.
 * Run via `yarn prisma db seed` (wired from main seed) or standalone tooling.
 */
export async function seedPlacementBankQuestions(prisma: PrismaClient) {
  const webRoot = path.resolve(__dirname, "..");
  const items = loadPlacementBankSync(webRoot);
  const data = items.map((q) => ({
    id: q.id,
    stemId: q.stemId === q.id ? null : q.stemId,
    weight: q.weight,
    cefrBand: q.cefrBand,
    section: q.section,
    instructionEn: q.instructionEn,
    instructionJa: q.instructionJa,
    questionEn: q.questionEn,
    questionJa: q.questionJa,
    optionsEn: q.optionsEn,
    optionsJa: q.optionsJa,
    correctIndex: q.correctIndex,
  }));

  await prisma.$transaction(async (tx) => {
    await tx.$executeRawUnsafe("SELECT pg_advisory_xact_lock(4815162342)");
    await tx.placementBankQuestion.deleteMany();
    await tx.placementBankQuestion.createMany({ data });
  });

  console.log(`Seeded ${items.length} placement bank questions.`);
}

/** Skip full re-seed when the table already has the expected row count (e.g. after Vitest globalSetup). */
export async function ensurePlacementBankSeeded(prisma: PrismaClient) {
  const n = await prisma.placementBankQuestion.count();
  if (n >= EXPECTED_PLACEMENT_QUESTION_TOTAL) return;
  await seedPlacementBankQuestions(prisma);
}
