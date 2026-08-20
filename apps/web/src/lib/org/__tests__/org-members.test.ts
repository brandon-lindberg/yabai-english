import { describe, expect, test } from "vitest";
import {
  orgMemberScope,
  rowsForSchool,
  summarizeOrgMembers,
  type OrgMemberRow,
} from "../org-members";

/**
 * The reported symptom: one person, and the organization said "2 members" while
 * one of its schools said "1 member" and the members list printed them twice.
 */

const person = (
  userId: string | null,
  orgRole: OrgMemberRow["orgRole"],
  schoolId: string | null = null,
  inviteEmail: string | null = null,
): OrgMemberRow => ({ userId, inviteEmail, orgRole, schoolId });

describe("summarizeOrgMembers", () => {
  test("the owner who is also a school admin is one member", () => {
    expect(
      summarizeOrgMembers([person("u1", "OWNER"), person("u1", "SCHOOL_ADMIN")]).members,
    ).toBe(1);
  });

  test("a teacher at two schools is one teacher, and one member", () => {
    const counts = summarizeOrgMembers([
      person("u1", "TEACHER"),
      person("u1", "TEACHER"),
    ]);
    expect(counts.teachers).toBe(1);
    expect(counts.members).toBe(1);
  });

  test("someone who both owns and teaches counts in both roles but once as a member", () => {
    const counts = summarizeOrgMembers([
      person("u1", "OWNER"),
      person("u1", "TEACHER"),
      person("u2", "STUDENT"),
    ]);
    expect(counts.members).toBe(2);
    expect(counts.teachers).toBe(1);
    expect(counts.students).toBe(1);
  });

  test("distinct people are counted separately", () => {
    const counts = summarizeOrgMembers([
      person("u1", "TEACHER"),
      person("u2", "TEACHER"),
      person("u3", "STUDENT"),
    ]);
    expect(counts).toEqual({ members: 3, teachers: 2, students: 1 });
  });

  test("no members is zero, not NaN", () => {
    expect(summarizeOrgMembers([])).toEqual({ members: 0, teachers: 0, students: 0 });
  });
});

describe("rowsForSchool", () => {
  const rows: OrgMemberRow[] = [
    person("u1", "OWNER", null), // org-wide: counts for every school
    person("u2", "TEACHER", "school-1"),
    person("u3", "TEACHER", "school-2"),
  ];

  test("a school's people include the organization's", () => {
    expect(summarizeOrgMembers(rowsForSchool(rows, "school-1"))).toEqual({
      members: 2,
      teachers: 1,
      students: 0,
    });
  });

  test("another school sees the org-wide person too, not the other school's", () => {
    const forTwo = rowsForSchool(rows, "school-2");
    expect(forTwo.map((r) => r.userId)).toEqual(["u1", "u3"]);
  });

  test("the owner who also admins one school is one person there", () => {
    // The reported case: 1, not 2.
    const oneOrg: OrgMemberRow[] = [
      person("u1", "OWNER", null),
      person("u1", "SCHOOL_ADMIN", "school-1"),
    ];
    expect(summarizeOrgMembers(oneOrg).members).toBe(1);
    expect(summarizeOrgMembers(rowsForSchool(oneOrg, "school-1")).members).toBe(1);
  });
});

describe("orgMemberScope", () => {
  test("an organization asks only for its active memberships", () => {
    expect(orgMemberScope("org-1")).toEqual({
      organizationId: "org-1",
      status: "ACTIVE",
    });
  });

  test("a school includes org-wide grants, which cover every school", () => {
    // The same rule `getViewerSchoolRole` uses to decide who may open the page.
    // Excluding them is why the school said 1 while the organization said 2.
    expect(orgMemberScope("org-1", "school-1")).toEqual({
      organizationId: "org-1",
      status: "ACTIVE",
      OR: [{ schoolId: null }, { schoolId: "school-1" }],
    });
  });

  test("INVITED and INACTIVE rows are never members", () => {
    expect(orgMemberScope("org-1").status).toBe("ACTIVE");
  });
});
