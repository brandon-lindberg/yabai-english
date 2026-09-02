/**
 * One definition of when an availability slot and a lesson offering agree.
 *
 * The editor picks an offering for a slot on the client; the save route then
 * re-checks that pairing on the server and rejects the whole payload if it
 * disagrees. Those two had drifted — the client would pair a slot with an
 * offering the server could never accept — so both now read the rule here.
 */

export type OfferingTaxonomy = {
  classLevelId: string | null;
  classTypeId: string | null;
  durationMin: number;
};

export type SlotTaxonomy = {
  classLevelId: string | null;
  classTypeId: string | null;
  startMin: number;
  endMin: number;
};

/**
 * Every saved slot carries a class level and type, so an offering missing
 * either can never back one: pairing with it builds a payload the server is
 * bound to reject. Such an offering is not a candidate at all.
 */
export function offeringCanBackAvailabilitySlot(offering: {
  classLevelId: string | null;
  classTypeId: string | null;
}): boolean {
  return Boolean(offering.classLevelId) && Boolean(offering.classTypeId);
}

/** The pairing the save route enforces: same class, same length. */
export function availabilitySlotMatchesOffering(
  slot: SlotTaxonomy,
  offering: OfferingTaxonomy | undefined | null,
): boolean {
  if (!offering) return false;
  return (
    offering.classLevelId === slot.classLevelId &&
    offering.classTypeId === slot.classTypeId &&
    slot.endMin - slot.startMin === offering.durationMin
  );
}
