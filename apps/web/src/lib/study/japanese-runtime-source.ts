import "server-only";
import type { Prisma } from "@/generated/prisma/client";
import { japanesePromptReferenceSchema, type JapanesePromptReference, type JapaneseStudyContent } from "./japanese-prompts";
import { requireUnique } from "../unique";

export const JAPANESE_DISTRACTOR_CARDS_PER_KIND = 96;
const cardFields = { id: true, deckId: true, kind: true, sortOrder: true, contentJson: true, deck: { select: { levelId: true } } } as const;

/** Fetch full content only after scheduling, with a bounded introduced distractor pool. */
export async function readJapanesePromptCards(tx: Prisma.TransactionClient, trackId: string, ids: string[], levelIds: string[]) {
  if (!ids.length) return [];
  const deck = { level: { trackId }, levelId: { in: levelIds } };
  const selected = await tx.studyCard.findMany({ where: { id: { in: ids }, deck }, select: cardFields });
  const distractors = await Promise.all([...new Set(selected.map(card => card.kind))].map(kind => tx.studyCard.findMany({
    where: { deck, kind, id: { notIn: ids } }, select: cardFields,
    orderBy: { id: "asc" }, take: JAPANESE_DISTRACTOR_CARDS_PER_KIND,
  })));
  return [...selected, ...distractors.flat()];
}

type CachedReferences = { snapshotId: string; selection: string; pending: Promise<ReadonlyMap<string, JapanesePromptReference>> };
// Retain only the latest requested evidence batch per database client, not a
// catalog-wide index. Immutable evidence may be shared; learner state never is.
const referenceCache = new WeakMap<object, CachedReferences>();

export async function readJapanesePromptReferences(owner: object, tx: Prisma.TransactionClient, snapshotId: string, contents: readonly unknown[]) {
  const required = new Set(contents.flatMap(raw => ((raw as JapaneseStudyContent)?.unit?.level?.evidence ?? [])
    .flatMap(row => row.source === "reference" && row.used && row.sourceRow ? [row.sourceRow] : [])));
  if (!required.size) return [];
  const sourceRows = [...required].sort();
  const selection = JSON.stringify(sourceRows);
  let cached = referenceCache.get(owner);
  if (cached?.snapshotId !== snapshotId || cached.selection !== selection) {
    const pending = tx.studyCatalogReference.findMany({ where: { snapshotId, sourceRow: { in: sourceRows } }, select: { sourceRow: true, referenceJson: true } })
      .then(rows => {
        requireUnique(rows.map(row => row.sourceRow), "prompt reference");
        const references = rows.map(row => {
          const reference = japanesePromptReferenceSchema.parse(row.referenceJson);
          if (row.sourceRow !== reference.sourceRow || !required.has(row.sourceRow)) throw new Error("Invalid prompt reference identity");
          return reference;
        });
        if (references.length !== required.size) throw new Error("Missing prompt reference evidence");
        return new Map(references.map(row => [row.sourceRow, row]));
      });
    cached = { snapshotId, selection, pending };
    referenceCache.set(owner, cached);
  }
  try {
    const index = await cached.pending;
    return [...required].flatMap(id => index.has(id) ? [index.get(id)!] : []);
  } catch (error) {
    if (referenceCache.get(owner) === cached) referenceCache.delete(owner);
    throw error;
  }
}
