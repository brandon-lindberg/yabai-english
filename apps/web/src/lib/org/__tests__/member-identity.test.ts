import { describe, expect, test } from "vitest";
import {
  countDistinctMembers,
  groupMembershipsByPerson,
  membershipPersonKey,
} from "../member-identity";

/**
 * The reported bug: an organization with one person in it displayed "2 members",
 * because that person held two grants — org-wide OWNER and SCHOOL_ADMIN of the
 * org's one school — and the count counted rows.
 */

const OWNER = { userId: "u1", inviteEmail: null };
const SCHOOL_ADMIN = { userId: "u1", inviteEmail: null };

describe("countDistinctMembers", () => {
  test("one person holding two grants is one member", () => {
    expect(countDistinctMembers([OWNER, SCHOOL_ADMIN])).toBe(1);
  });

  test("two people are two members", () => {
    expect(
      countDistinctMembers([OWNER, { userId: "u2", inviteEmail: null }]),
    ).toBe(2);
  });

  test("an invitation that has not signed in yet still counts as a person", () => {
    // `userId` is null until the invitee first signs in.
    expect(
      countDistinctMembers([OWNER, { userId: null, inviteEmail: "new@example.com" }]),
    ).toBe(2);
  });

  test("separate outstanding invitations do not collapse into one", () => {
    // Keying on `userId` alone would make every pending invite the same person.
    expect(
      countDistinctMembers([
        { userId: null, inviteEmail: "a@example.com" },
        { userId: null, inviteEmail: "b@example.com" },
      ]),
    ).toBe(2);
  });

  test("an invitation and the account it later becomes are not double counted", () => {
    // Once linked, the row carries the userId; the email row is the same grant.
    expect(countDistinctMembers([{ userId: "u1", inviteEmail: "a@example.com" }])).toBe(1);
  });

  test("email identity is case- and whitespace-insensitive", () => {
    expect(
      countDistinctMembers([
        { userId: null, inviteEmail: "A@Example.com" },
        { userId: null, inviteEmail: " a@example.com " },
      ]),
    ).toBe(1);
  });

  test("a row naming nobody counts as nobody", () => {
    expect(countDistinctMembers([{ userId: null, inviteEmail: null }])).toBe(0);
    expect(membershipPersonKey({ userId: null, inviteEmail: "  " })).toBeNull();
  });
});

describe("groupMembershipsByPerson", () => {
  test("gathers one person's grants into a single entry", () => {
    const groups = groupMembershipsByPerson([
      { userId: "u1", inviteEmail: null, orgRole: "OWNER" },
      { userId: "u2", inviteEmail: null, orgRole: "TEACHER" },
      { userId: "u1", inviteEmail: null, orgRole: "SCHOOL_ADMIN" },
    ]);

    expect(groups).toHaveLength(2);
    expect(groups[0]!.memberships.map((m) => m.orgRole)).toEqual([
      "OWNER",
      "SCHOOL_ADMIN",
    ]);
    expect(groups[1]!.memberships.map((m) => m.orgRole)).toEqual(["TEACHER"]);
  });

  test("keeps people in the order they first appear", () => {
    const groups = groupMembershipsByPerson([
      { userId: "u2", inviteEmail: null },
      { userId: "u1", inviteEmail: null },
      { userId: "u2", inviteEmail: null },
    ]);
    expect(groups.map((g) => g.key)).toEqual(["user:u2", "user:u1"]);
  });
});
