import { z } from "zod";

export type QuickReviewOutcome = "learned" | "not_yet";

export type QuickReviewInteraction = {
  cardId: string;
  outcome: QuickReviewOutcome;
  at: string;
};

const interactionSchema = z.object({
  cardId: z.string().min(1),
  outcome: z.enum(["learned", "not_yet"]),
  at: z.string().min(1),
});

const interactionsArraySchema = z.array(interactionSchema);

export function parseQuickReviewInteractions(raw: unknown): QuickReviewInteraction[] {
  const parsed = interactionsArraySchema.safeParse(raw);
  return parsed.success ? parsed.data : [];
}

export function learnedDismissedIds(interactions: readonly QuickReviewInteraction[]): Set<string> {
  const s = new Set<string>();
  for (const x of interactions) {
    if (x.outcome === "learned") s.add(x.cardId);
  }
  return s;
}

/**
 * Cards that may fill the slot left by `leavingSlotId` for today's quick review.
 * Excludes other currently visible slots and any card the user already dismissed as learned today.
 */
export function eligibleReplacementCandidates(
  pool: readonly string[],
  currentSlots: readonly string[],
  learnedDismissed: ReadonlySet<string>,
  leavingSlotId: string,
): string[] {
  const occupied = new Set(currentSlots.filter((id) => id !== leavingSlotId));
  return pool.filter(
    (id) => id !== leavingSlotId && !occupied.has(id) && !learnedDismissed.has(id),
  );
}

/** Replace first occurrence of `oldId`, or remove it if `replacementId` is null. */
export function replaceSlotCardId(
  slotIds: readonly string[],
  oldId: string,
  replacementId: string | null,
): string[] {
  const idx = slotIds.indexOf(oldId);
  if (idx < 0) return [...slotIds];
  const next = [...slotIds];
  if (replacementId == null) {
    next.splice(idx, 1);
  } else {
    next[idx] = replacementId;
  }
  return next;
}

export function pickRandomId(candidates: readonly string[], rng: () => number): string | null {
  if (candidates.length === 0) return null;
  const idx = Math.min(candidates.length - 1, Math.floor(rng() * candidates.length));
  return candidates[idx] ?? null;
}

export function countQuickReviewOutcomeStats(
  interactions: readonly QuickReviewInteraction[],
): { learnedToday: number; notYetToday: number } {
  let learnedToday = 0;
  let notYetToday = 0;
  for (const x of interactions) {
    if (x.outcome === "learned") learnedToday += 1;
    else notYetToday += 1;
  }
  return { learnedToday, notYetToday };
}
