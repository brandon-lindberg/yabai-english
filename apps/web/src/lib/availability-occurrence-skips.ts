/**
 * A cancelled occurrence of a repeating availability slot.
 *
 * Skips were matched on the timestamp alone, which conflates two different
 * things happening at the same instant. Cancelling one week of one rule also
 * cancelled every other rule's occurrence at that time — and once a teacher
 * could edit a single occurrence, it swallowed the one-off written to replace
 * it, so the availability disappeared instead of moving.
 *
 * A skip therefore always names the rule it belongs to, and can never reach
 * another. The migration that made `slotId` required attributed the rows
 * written before it to the rules that produced them.
 */

export type OccurrenceSkip = {
  slotId: string;
  startsAtIso: string;
};

/** `slotId|startsAtIso` for every cancelled occurrence. */
export type OccurrenceSkipIndex = ReadonlySet<string>;

export const EMPTY_OCCURRENCE_SKIPS: OccurrenceSkipIndex = new Set();

function skipKey(slotId: string, startsAtIso: string) {
  return `${slotId}|${startsAtIso}`;
}

export function buildOccurrenceSkipIndex(
  skips: readonly OccurrenceSkip[],
): OccurrenceSkipIndex {
  return new Set(skips.map((skip) => skipKey(skip.slotId, skip.startsAtIso)));
}

export function isOccurrenceSkipped(
  index: OccurrenceSkipIndex,
  slotId: string,
  startsAtIso: string,
): boolean {
  return index.has(skipKey(slotId, startsAtIso));
}
