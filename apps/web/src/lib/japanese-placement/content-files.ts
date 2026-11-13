import "server-only";
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { z } from "zod";
import { verifySourceIntegrity } from "../japanese-content/corpus-audit";
import { contentSnapshotSchema, mergeContentPacks, parseContentPack, verifyContentProvenance } from "./content-pack";

const roles = ["content", "excerpts"] as const;
const lockSchema = z.object({ schemaVersion: z.literal(2), files: z.array(z.object({
  role: z.enum(roles), filename: z.string().regex(/^[a-z][a-z0-9._-]*\.json$/), sha256: z.string().regex(/^[a-f0-9]{64}$/),
}).strict()).length(roles.length) }).strict();

/** Offline only: checked-in content and selected source excerpts, never remote code. */
export async function loadContentPack(directory: string) {
  const lock = lockSchema.parse(JSON.parse(await readFile(join(directory, "content-lock.json"), "utf8")));
  if (new Set(lock.files.map((file) => file.filename)).size !== roles.length || new Set(lock.files.map((file) => file.role)).size !== roles.length) throw new Error("Duplicate locked file or role");
  const data = new Map<string, unknown>();
  for (const file of lock.files) {
    const bytes = await readFile(join(directory, file.filename));
    verifySourceIntegrity(bytes, { algorithm: "sha256", digest: file.sha256 });
    data.set(file.role, JSON.parse(bytes.toString("utf8")));
  }
  const pack = parseContentPack(data.get("content"));
  const snapshots = contentSnapshotSchema.parse(data.get("excerpts"));
  verifyContentProvenance(pack, snapshots);
  return { pack, snapshots };
}

export async function loadContentCatalog(directory: string) {
  const parts = await Promise.all(["", "remaining-levels", "word-level"].map((part) => loadContentPack(join(directory, part))));
  return { pack: mergeContentPacks(parts.map((part) => part.pack)),
    sourceExcerpts: parts.reduce((count, part) => count + part.snapshots.records.length, 0),
    packs: parts.map(({ pack }) => ({ id: pack.id, revision: pack.revision })),
    selectionLedgers: parts.flatMap(({ pack, snapshots }) => {
      if (!snapshots.selectionLedger) return [];
      const counts = { selected: 0, deferred: 0, excluded: 0 };
      for (const row of snapshots.selectionLedger) counts[row.status]++;
      return [{ packId: pack.id, ...counts }];
    }) };
}
