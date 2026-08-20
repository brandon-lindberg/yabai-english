/**
 * A student may take one free trial with each teacher who offers one.
 *
 * The rule is per teacher, not per student, so someone shopping for a teacher
 * can try several — but never twice with the same one. The `(studentId,
 * teacherId)` unique constraint is what actually enforces it; the reads here
 * are for telling the student before they book, not for deciding alone.
 */

export type FreeTrialEligibility =
  | { eligible: true }
  | { eligible: false; reason: "TEACHER_DOES_NOT_OFFER" | "ALREADY_USED_WITH_TEACHER" };

type TrialPrisma = {
  freeTrialRedemption: {
    findUnique: (args: {
      where: { studentId_teacherId: { studentId: string; teacherId: string } };
      select: { id: true };
    }) => Promise<{ id: string } | null>;
    create: (args: {
      data: { studentId: string; teacherId: string; bookingId?: string | null };
    }) => Promise<unknown>;
  };
};

/** Thrown when a trial was claimed by a concurrent booking. */
export class FreeTrialAlreadyUsedError extends Error {
  constructor() {
    super("Free trial already used with this teacher");
    this.name = "FreeTrialAlreadyUsedError";
  }
}

function isUniqueConstraintError(error: unknown): boolean {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    (error as { code?: unknown }).code === "P2002"
  );
}

export async function hasStudentUsedTrialWithTeacher(
  prisma: TrialPrisma,
  input: { studentId: string; teacherId: string },
): Promise<boolean> {
  const existing = await prisma.freeTrialRedemption.findUnique({
    where: {
      studentId_teacherId: { studentId: input.studentId, teacherId: input.teacherId },
    },
    select: { id: true },
  });
  // Absence is the common case and must never be mistaken for a used trial —
  // that would silently deny a student the free lesson they are owed.
  return Boolean(existing);
}

export async function resolveFreeTrialEligibility(
  prisma: TrialPrisma,
  input: { studentId: string; teacherId: string; teacherOffersFreeTrial: boolean },
): Promise<FreeTrialEligibility> {
  if (!input.teacherOffersFreeTrial) {
    return { eligible: false, reason: "TEACHER_DOES_NOT_OFFER" };
  }
  const used = await hasStudentUsedTrialWithTeacher(prisma, input);
  return used ? { eligible: false, reason: "ALREADY_USED_WITH_TEACHER" } : { eligible: true };
}

/**
 * Consumes the student's trial with this teacher. Two bookings racing for the
 * same trial both reach here; the unique constraint decides, and the loser gets
 * {@link FreeTrialAlreadyUsedError} rather than a second free lesson.
 */
export async function claimFreeTrialWithTeacher(
  prisma: TrialPrisma,
  input: { studentId: string; teacherId: string; bookingId?: string | null },
): Promise<void> {
  try {
    await prisma.freeTrialRedemption.create({
      data: {
        studentId: input.studentId,
        teacherId: input.teacherId,
        bookingId: input.bookingId ?? null,
      },
    });
  } catch (error) {
    if (isUniqueConstraintError(error)) {
      throw new FreeTrialAlreadyUsedError();
    }
    throw error;
  }
}
