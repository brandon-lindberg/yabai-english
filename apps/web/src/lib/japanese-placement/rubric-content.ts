import "server-only";
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { z } from "zod";
import { bankDigest, JAPANESE_REFERENCE_BANDS, JAPANESE_RUBRIC_POLICY_REVISION, parseJapaneseBank, requireUnique } from "./bank";
import { loadContentCatalog } from "./content-files";
import { buildContentBank } from "./content-pack";

const alignmentSchema = z.object({ schemaVersion: z.literal(1), bankDigest: z.string().regex(/^[a-f0-9]{64}$/),
  referenceSources: z.array(z.string().url()).min(1).max(10),
  anchors: z.array(z.object({ itemId: z.string().min(1), itemRevision: z.number().int().positive(), rationale: z.string().trim().min(1) }).strict()).min(1).max(1000),
}).strict();

/** Add explicit alignment roles to the single compiled catalog; never create likelihoods or approvals. */
export function buildJapaneseRubricBank(baseValue: unknown, alignmentValue: unknown) {
  const base = parseJapaneseBank(baseValue);
  const alignment = alignmentSchema.parse(alignmentValue);
  if (base.schemaVersion !== 4 || alignment.bankDigest !== bankDigest(base)) throw new Error("Rubric source bank snapshot mismatch");
  requireUnique(alignment.anchors.map((row) => row.itemId), "rubric anchor");
  const byId = new Map(base.items.map((item) => [item.id, item]));
  for (const row of alignment.anchors) {
    if (byId.get(row.itemId)?.revision !== row.itemRevision) throw new Error("Rubric anchor identity/revision mismatch");
  }
  const anchors = new Map(alignment.anchors.map((row) => [row.itemId, row]));
  return parseJapaneseBank({ ...base, schemaVersion: 5, version: base.version + 1,
    assessment: { revision: JAPANESE_RUBRIC_POLICY_REVISION, timeLimitSec: 1200,
      quotas: { kana: 2, kanji_reading: 4, vocabulary: 4, grammar: 4, reading: 5, writing: 5 },
      supportedBands: [...JAPANESE_REFERENCE_BANDS], minimumAnswers: 12, minimumDomains: 4, referenceSources: alignment.referenceSources },
    items: base.items.map((item) => ({ ...item, calibration: null, placementRole: anchors.has(item.id) ? "anchor" : "support",
      ...(anchors.has(item.id) ? { placementRationale: anchors.get(item.id)!.rationale } : {}) })),
    reviews: { japaneseTeacher: null, rights: null, placement: null },
  });
}

export async function loadJapaneseRubricBank(directory: string) {
  const catalog = await loadContentCatalog(directory);
  const alignment: unknown = JSON.parse(await readFile(join(directory, "rubric-alignment.json"), "utf8"));
  return buildJapaneseRubricBank(buildContentBank(catalog.pack), alignment);
}
