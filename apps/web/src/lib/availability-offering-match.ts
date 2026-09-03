/**
 * One definition of when an availability slot and a lesson offering agree.
 *
 * The editor picks an offering for a slot on the client; the save route then
 * re-checks that pairing on the server and rejects the whole payload if it
 * disagrees. Those two had drifted — the client would pair a slot with an
 * offering the server could never accept — so both now read the rule here.
 */

import { MIN_GROUP_CAPACITY } from "@/lib/group-lesson-pricing";

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

export type GroupSlotRuleViolation =
  | "ASSIGNED_GROUP_SLOT"
  | "GROUP_FREE_TRIAL"
  | "INVALID_GROUP_SIZE";

/** What the save route says when it refuses each violation. */
export const GROUP_SLOT_RULE_MESSAGES: Record<GroupSlotRuleViolation, string> = {
  ASSIGNED_GROUP_SLOT: "A group class cannot be reserved for one student.",
  GROUP_FREE_TRIAL: "Free trial lessons cannot be group classes.",
  INVALID_GROUP_SIZE: `A group class must seat at least ${MIN_GROUP_CAPACITY} students.`,
};

/**
 * The rules that only apply once an offering seats more than one student.
 *
 * Separate from `availabilitySlotMatchesOffering` because that answers a
 * different question — same class, same length — and a slot can satisfy it
 * while still being incoherent as a group class. Returns the violation so the
 * caller can say which rule broke, or null when there is nothing to object to.
 *
 * A missing offering is not this function's problem: the pairing check above
 * already refuses that payload, and answering here too would hand the teacher
 * the wrong reason.
 */
export function groupSlotRulesViolation(
  slot: { assignedStudentId?: string | null },
  offering:
    | { isGroup: boolean; groupSize?: number | null; isFreeTrial?: boolean | null }
    | undefined
    | null,
): GroupSlotRuleViolation | null {
  if (!offering || !offering.isGroup) return null;

  if (offering.isFreeTrial) return "GROUP_FREE_TRIAL";

  if (
    typeof offering.groupSize !== "number" ||
    !Number.isInteger(offering.groupSize) ||
    offering.groupSize < MIN_GROUP_CAPACITY
  ) {
    return "INVALID_GROUP_SIZE";
  }

  // A reservation hides the slot from everyone but the named student, which is
  // the opposite of a class other people are meant to fill.
  if (slot.assignedStudentId) return "ASSIGNED_GROUP_SLOT";

  return null;
}

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
