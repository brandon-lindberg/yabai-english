import fs from "node:fs";
import path from "node:path";
import { PLACEMENT_BANK_BANDS, PLACEMENT_BANK_SECTIONS } from "@/lib/placement-bank/constants";
import {
  placementBankLevelFileSchema,
  type PlacementBankFile,
} from "@/lib/placement-bank/schema";

export type LoadedPlacementQuestion = Omit<PlacementBankFile, "stemId"> & { stemId: string };

function expectedId(band: string, section: string, index: number) {
  return `pb-${band}-${section}-${String(index).padStart(3, "0")}`;
}

/**
 * Loads `data/placement-bank/{A1|A2|B1|B2|C1}.json` — one JSON file per CEFR level with all questions for that level.
 */
export function loadPlacementBankSync(cwd: string = process.cwd()): LoadedPlacementQuestion[] {
  const root = path.join(cwd, "data", "placement-bank");
  if (!fs.existsSync(root)) {
    throw new Error(
      `Placement question bank not found at ${root}. Run: cd apps/web && yarn placement-bank:scaffold`,
    );
  }

  const out: LoadedPlacementQuestion[] = [];

  for (const band of PLACEMENT_BANK_BANDS) {
    const fp = path.join(root, `${band}.json`);
    if (!fs.existsSync(fp)) {
      throw new Error(`Missing placement level file: ${fp}`);
    }
    const raw = JSON.parse(fs.readFileSync(fp, "utf8")) as unknown;
    const parsed = placementBankLevelFileSchema.parse(raw);
    if (parsed.cefrBand !== band) {
      throw new Error(`${fp}: root cefrBand must be "${band}" (found "${parsed.cefrBand}").`);
    }

    const counts: Record<string, number> = {
      grammar: 0,
      vocabulary: 0,
      reading: 0,
      functional: 0,
    };

    for (const q of parsed.questions) {
      if (q.cefrBand !== band) {
        throw new Error(`${fp}: item ${q.id} has cefrBand "${q.cefrBand}" but file is for "${band}".`);
      }
      counts[q.section] = (counts[q.section] ?? 0) + 1;
      out.push({
        ...q,
        stemId: q.stemId ?? q.id,
      });
    }

    for (const section of PLACEMENT_BANK_SECTIONS) {
      const n = counts[section];
      if (n !== 100) {
        throw new Error(`${fp}: expected 100 ${section} questions, found ${n}.`);
      }
    }
  }

  out.sort((a, b) => {
    const bo = { A1: 1, A2: 2, B1: 3, B2: 4, C1: 5 } as const;
    const so = { grammar: 1, vocabulary: 2, reading: 3, functional: 4 } as const;
    const bd = bo[a.cefrBand] - bo[b.cefrBand];
    if (bd !== 0) return bd;
    const sd = so[a.section] - so[b.section];
    if (sd !== 0) return sd;
    return a.id.localeCompare(b.id);
  });

  for (const q of out) {
    const m = /^pb-(A1|A2|B1|B2|C1)-(grammar|vocabulary|reading|functional)-(\d{3})$/.exec(q.id);
    if (!m) {
      throw new Error(`Invalid question id (expected pb-{band}-{section}-NNN): ${q.id}`);
    }
    const [, idBand, idSection, num] = m;
    if (idBand !== q.cefrBand || idSection !== q.section) {
      throw new Error(`id "${q.id}" does not match cefrBand/section on the item.`);
    }
    const idx = Number.parseInt(num!, 10);
    if (idx < 1 || idx > 100) {
      throw new Error(`id suffix out of range 001–100: ${q.id}`);
    }
    const want = expectedId(q.cefrBand, q.section, idx);
    if (q.id !== want) {
      throw new Error(`id must be "${want}" for this band/section/index (found "${q.id}").`);
    }
  }

  return out;
}
