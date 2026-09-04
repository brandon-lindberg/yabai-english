import { Role } from "@/generated/prisma/enums";
import { seedDefaultTeacherTaxonomy } from "@/lib/teacher-default-taxonomy";

/**
 * Everything a role needs besides the column.
 *
 * A teacher without a `TeacherProfile` has no rates, no availability and no
 * taxonomy to hang a class on — and level and type are required on every
 * offering, so without the seeded taxonomy they cannot create a single lesson.
 * A student without a `StudentProfile` has no timezone and no goals.
 *
 * The admin role-change endpoint already knew this. Creating a user who arrives
 * with a role would have had to know it too, and the two would have drifted the
 * first time the setup changed.
 *
 * `SUPER_ADMIN` gets neither on purpose: an admin is a person with permissions,
 * not a party to a lesson.
 */
type ProfileTx = {
  studentProfile: { create: (args: { data: { userId: string } }) => Promise<unknown> };
  teacherProfile: {
    create: (args: {
      data: { userId: string };
      select: { id: true };
    }) => Promise<{ id: string }>;
  };
};

export async function provisionRoleProfile(
  tx: ProfileTx,
  {
    userId,
    role,
    hasProfile = false,
  }: {
    userId: string;
    role: Role;
    /** Already has the profile for this role; nothing to do. */
    hasProfile?: boolean;
  },
): Promise<void> {
  if (hasProfile) return;

  if (role === Role.STUDENT) {
    await tx.studentProfile.create({ data: { userId } });
    return;
  }

  if (role === Role.TEACHER) {
    const created = await tx.teacherProfile.create({
      data: { userId },
      select: { id: true },
    });
    await seedDefaultTeacherTaxonomy(tx as never, created.id);
  }
}
