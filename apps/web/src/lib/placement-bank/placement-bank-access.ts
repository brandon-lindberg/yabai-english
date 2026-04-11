import "server-only";

import { prisma } from "@/lib/prisma";
import type { LoadedPlacementQuestion } from "@/lib/placement-bank/load-placement-bank";

let cache: LoadedPlacementQuestion[] | null = null;

function rowToQuestion(r: {
  id: string;
  stemId: string | null;
  weight: number;
  cefrBand: string;
  section: string;
  promptEn: string;
  promptJa: string;
  optionsEn: unknown;
  optionsJa: unknown;
  correctIndex: number;
}): LoadedPlacementQuestion {
  return {
    id: r.id,
    stemId: r.stemId ?? r.id,
    weight: r.weight,
    cefrBand: r.cefrBand as LoadedPlacementQuestion["cefrBand"],
    section: r.section as LoadedPlacementQuestion["section"],
    promptEn: r.promptEn,
    promptJa: r.promptJa,
    optionsEn: r.optionsEn as string[],
    optionsJa: r.optionsJa as string[],
    correctIndex: r.correctIndex,
  };
}

/**
 * Placement bank for API routes and server logic: **Postgres only** (`PlacementBankQuestion`).
 * Authoring flow: `data/placement-bank/*.json` → `yarn db:seed` (see `prisma/seed-placement-bank.ts`).
 */
export async function getPlacementBankQuestions(): Promise<LoadedPlacementQuestion[]> {
  if (cache) return cache;

  const count = await prisma.placementBankQuestion.count();
  if (count === 0) {
    throw new Error(
      "Placement bank is empty. From apps/web: `yarn placement-bank:reset` (if JSON missing) then `yarn db:seed`.",
    );
  }

  const rows = await prisma.placementBankQuestion.findMany({ orderBy: { id: "asc" } });
  cache = rows.map(rowToQuestion);
  return cache;
}

/** Vitest / scripts: clear cached bank between tests. */
export function resetPlacementBankCache() {
  cache = null;
}
