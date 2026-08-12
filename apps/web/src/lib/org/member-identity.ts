/**
 * Who a membership belongs to.
 *
 * A membership row is a *grant*, not a person: one person can hold several in
 * the same organization — org-wide OWNER plus SCHOOL_ADMIN of one of its
 * schools is the ordinary case, and that is two rows. Counting rows and calling
 * the result "members" is how an organization with one person in it reported
 * "2 members".
 *
 * Identity is the user row once it exists, and the invited email until it does:
 * `userId` stays null until the invitee first signs in, at which point the auth
 * callback links it. Keying on `userId` alone would collapse every outstanding
 * invitation into a single phantom member.
 */

export type MembershipIdentity = {
  userId: string | null;
  inviteEmail: string | null;
};

/** `null` when a row names nobody at all, so it counts as no one. */
export function membershipPersonKey(m: MembershipIdentity): string | null {
  if (m.userId) return `user:${m.userId}`;
  const email = m.inviteEmail?.trim().toLowerCase();
  return email ? `email:${email}` : null;
}

/** How many distinct people hold these grants. */
export function countDistinctMembers(memberships: ReadonlyArray<MembershipIdentity>): number {
  const seen = new Set<string>();
  for (const m of memberships) {
    const key = membershipPersonKey(m);
    if (key) seen.add(key);
  }
  return seen.size;
}

/**
 * The grants each person holds, in the order the people first appear.
 * Keyed by the person, not the row, so a member with two roles is one entry.
 */
export function groupMembershipsByPerson<T extends MembershipIdentity>(
  memberships: ReadonlyArray<T>,
): Array<{ key: string; memberships: T[] }> {
  const byPerson = new Map<string, T[]>();
  for (const m of memberships) {
    const key = membershipPersonKey(m);
    if (!key) continue;
    const existing = byPerson.get(key);
    if (existing) existing.push(m);
    else byPerson.set(key, [m]);
  }
  return [...byPerson.entries()].map(([key, list]) => ({ key, memberships: list }));
}
