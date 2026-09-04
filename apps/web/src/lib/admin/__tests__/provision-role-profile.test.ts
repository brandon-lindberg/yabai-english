import { describe, expect, test, vi } from "vitest";
import { Role } from "@/generated/prisma/enums";
import { provisionRoleProfile } from "@/lib/admin/provision-role-profile";

/*
  Giving somebody a role is not just a column: a teacher without a
  TeacherProfile has no rates, no availability and no taxonomy to hang a class
  on, and every page that reads one has to cope with null.

  The role-change endpoint knew this. A second endpoint that creates a user
  with a role already set would have had to know it too, and the two would have
  drifted the first time the setup changed — so they share this.
*/

vi.mock("@/lib/teacher-default-taxonomy", () => ({
  seedDefaultTeacherTaxonomy: vi.fn().mockResolvedValue(undefined),
}));

import { seedDefaultTeacherTaxonomy } from "@/lib/teacher-default-taxonomy";

function tx() {
  return {
    studentProfile: { create: vi.fn().mockResolvedValue({ id: "sp-1" }) },
    teacherProfile: { create: vi.fn().mockResolvedValue({ id: "tp-1" }) },
  };
}

describe("provisionRoleProfile", () => {
  test("a new teacher gets a profile", async () => {
    const t = tx();

    await provisionRoleProfile(t as never, { userId: "u-1", role: Role.TEACHER });

    expect(t.teacherProfile.create).toHaveBeenCalledWith(
      expect.objectContaining({ data: { userId: "u-1" } }),
    );
  });

  test("and the taxonomy a class needs to exist", async () => {
    // Without it the teacher cannot create a single lesson: level and type are
    // required on every offering.
    const t = tx();

    await provisionRoleProfile(t as never, { userId: "u-1", role: Role.TEACHER });

    expect(seedDefaultTeacherTaxonomy).toHaveBeenCalledWith(t, "tp-1");
  });

  test("a new student gets a profile", async () => {
    const t = tx();

    await provisionRoleProfile(t as never, { userId: "u-1", role: Role.STUDENT });

    expect(t.studentProfile.create).toHaveBeenCalledWith({ data: { userId: "u-1" } });
  });

  test("an existing profile is left alone", async () => {
    // The role endpoint calls this on every save, including ones that do not
    // change the role at all.
    const t = tx();

    await provisionRoleProfile(t as never, {
      userId: "u-1",
      role: Role.TEACHER,
      hasProfile: true,
    });

    expect(t.teacherProfile.create).not.toHaveBeenCalled();
  });

  test("an admin gets neither", async () => {
    const t = tx();

    await provisionRoleProfile(t as never, { userId: "u-1", role: Role.SUPER_ADMIN });

    expect(t.teacherProfile.create).not.toHaveBeenCalled();
    expect(t.studentProfile.create).not.toHaveBeenCalled();
  });
});
