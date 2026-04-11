import { prisma } from "@/lib/prisma";
import { ensurePlacementBankSeeded } from "../../../prisma/seed-placement-bank";
import type { LoadedPlacementQuestion } from "@/lib/placement-bank/load-placement-bank";
import {
  getPlacementBankQuestions,
  resetPlacementBankCache,
} from "@/lib/placement-bank/placement-bank-access";

/**
 * Loads the bank the same way production does: Postgres via `getPlacementBankQuestions`.
 * Vitest `globalSetup` normally seeds once from disk; this ensures the table is full if globalSetup was skipped.
 */
export async function loadPlacementQuestionBankForTests(): Promise<LoadedPlacementQuestion[]> {
  resetPlacementBankCache();
  await ensurePlacementBankSeeded(prisma);
  resetPlacementBankCache();
  return getPlacementBankQuestions();
}
