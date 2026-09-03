import { MIN_GROUP_CAPACITY } from "@/lib/group-lesson-pricing";

/**
 * What Google Meet will and will not do for a group class.
 *
 * The limit that matters is **duration, not capacity**. A personal Google
 * account that has not been upgraded cuts off any call with three or more
 * participants at 60 minutes, with a warning chime at 50. One-to-one calls run
 * for 24 hours, which is why this has never troubled a private lesson: a group
 * class crosses three participants — the teacher plus two students — exactly
 * when it starts working.
 *
 * Capacity is not a real constraint. Even a free account seats 100, and no
 * class here approaches that; the check exists so the answer is written down
 * rather than assumed.
 *
 * We deliberately do not guess who is affected. An @gmail.com address usually
 * means a free account, except Google Workspace Individual is a paid tier that
 * runs on exactly those addresses and lifts the cap — so the domain proves
 * nothing either way, and blocking on it would stop paying teachers from
 * publishing perfectly good classes. This advises; the teacher decides.
 *
 * Figures per Google's published limits, checked September 2026:
 * https://support.google.com/meet/answer/7317473
 */

/** Group calls stop here on a personal account that has not been upgraded. */
export const GOOGLE_MEET_FREE_GROUP_CALL_MINUTES = 60;

/** Participants in one call, including the teacher. Lowest tier, so a floor. */
export const GOOGLE_MEET_MAX_PARTICIPANTS = 100;

export type GroupMeetAdvisory =
  | { kind: "DURATION_OVER_FREE_LIMIT"; limitMin: number; durationMin: number }
  | { kind: "DURATION_AT_FREE_LIMIT"; limitMin: number }
  | { kind: "CAPACITY_OVER_MEET_LIMIT"; limit: number; participants: number };

/**
 * Everyone in the room: the students plus the teacher running it.
 */
export function groupClassParticipants(capacity: number): number {
  return capacity + 1;
}

/**
 * What the teacher should know before publishing this class, or null when
 * there is nothing worth saying.
 *
 * Ordered by how badly it bites: a class that will be cut short matters more
 * than one that finishes on the buzzer.
 */
export function groupMeetAdvisory({
  durationMin,
  capacity,
}: {
  durationMin: number;
  capacity: number;
}): GroupMeetAdvisory | null {
  // A private lesson is a one-to-one call and runs for 24 hours.
  if (capacity < MIN_GROUP_CAPACITY) return null;

  const participants = groupClassParticipants(capacity);
  if (participants > GOOGLE_MEET_MAX_PARTICIPANTS) {
    return {
      kind: "CAPACITY_OVER_MEET_LIMIT",
      limit: GOOGLE_MEET_MAX_PARTICIPANTS,
      participants,
    };
  }

  if (durationMin > GOOGLE_MEET_FREE_GROUP_CALL_MINUTES) {
    return {
      kind: "DURATION_OVER_FREE_LIMIT",
      limitMin: GOOGLE_MEET_FREE_GROUP_CALL_MINUTES,
      durationMin,
    };
  }

  // Ends on the exact minute the call would be cut. Any late start loses time,
  // so it is worth flagging even though nothing is strictly wrong.
  if (durationMin === GOOGLE_MEET_FREE_GROUP_CALL_MINUTES) {
    return {
      kind: "DURATION_AT_FREE_LIMIT",
      limitMin: GOOGLE_MEET_FREE_GROUP_CALL_MINUTES,
    };
  }

  return null;
}
