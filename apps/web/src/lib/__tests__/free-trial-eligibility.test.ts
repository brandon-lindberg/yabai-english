import { describe, expect, test, vi } from "vitest";
import {
  claimFreeTrialWithTeacher,
  FreeTrialAlreadyUsedError,
  hasStudentUsedTrialWithTeacher,
  resolveFreeTrialEligibility,
} from "@/lib/free-trial-eligibility";

function trialPrisma(existing: unknown = null) {
  return {
    freeTrialRedemption: {
      findUnique: vi.fn().mockResolvedValue(existing),
      create: vi.fn().mockResolvedValue({ id: "redemption-1" }),
    },
  };
}

describe("hasStudentUsedTrialWithTeacher", () => {
  test("is false when the student has never tried this teacher", async () => {
    const prisma = trialPrisma(null);

    await expect(
      hasStudentUsedTrialWithTeacher(prisma, { studentId: "s1", teacherId: "t1" }),
    ).resolves.toBe(false);

    expect(prisma.freeTrialRedemption.findUnique).toHaveBeenCalledWith({
      where: { studentId_teacherId: { studentId: "s1", teacherId: "t1" } },
      select: { id: true },
    });
  });

  test("is true once a trial with that teacher has been taken", async () => {
    const prisma = trialPrisma({ id: "redemption-1" });

    await expect(
      hasStudentUsedTrialWithTeacher(prisma, { studentId: "s1", teacherId: "t1" }),
    ).resolves.toBe(true);
  });

  test("is scoped to the teacher, so another teacher is still open", async () => {
    const prisma = {
      freeTrialRedemption: {
        findUnique: vi.fn(async ({ where }: { where: { studentId_teacherId: { teacherId: string } } }) =>
          where.studentId_teacherId.teacherId === "t1" ? { id: "redemption-1" } : null,
        ),
        create: vi.fn(),
      },
    };

    await expect(
      hasStudentUsedTrialWithTeacher(prisma, { studentId: "s1", teacherId: "t1" }),
    ).resolves.toBe(true);
    await expect(
      hasStudentUsedTrialWithTeacher(prisma, { studentId: "s1", teacherId: "t2" }),
    ).resolves.toBe(false);
  });
});

describe("resolveFreeTrialEligibility", () => {
  test("a teacher with trials switched off never offers one", async () => {
    const prisma = trialPrisma(null);

    await expect(
      resolveFreeTrialEligibility(prisma, {
        studentId: "s1",
        teacherId: "t1",
        teacherOffersFreeTrial: false,
      }),
    ).resolves.toEqual({ eligible: false, reason: "TEACHER_DOES_NOT_OFFER" });
  });

  test("an unused trial with a participating teacher is eligible", async () => {
    const prisma = trialPrisma(null);

    await expect(
      resolveFreeTrialEligibility(prisma, {
        studentId: "s1",
        teacherId: "t1",
        teacherOffersFreeTrial: true,
      }),
    ).resolves.toEqual({ eligible: true });
  });

  test("a second trial with the same teacher is refused", async () => {
    const prisma = trialPrisma({ id: "redemption-1" });

    await expect(
      resolveFreeTrialEligibility(prisma, {
        studentId: "s1",
        teacherId: "t1",
        teacherOffersFreeTrial: true,
      }),
    ).resolves.toEqual({ eligible: false, reason: "ALREADY_USED_WITH_TEACHER" });
  });
});

describe("claimFreeTrialWithTeacher", () => {
  test("records the redemption against the booking", async () => {
    const prisma = trialPrisma(null);

    await claimFreeTrialWithTeacher(prisma, {
      studentId: "s1",
      teacherId: "t1",
      bookingId: "b1",
    });

    expect(prisma.freeTrialRedemption.create).toHaveBeenCalledWith({
      data: { studentId: "s1", teacherId: "t1", bookingId: "b1" },
    });
  });

  // Two simultaneous bookings must not both get a free lesson. The unique
  // constraint is the arbiter, so a duplicate insert is the losing racer.
  test("turns a duplicate insert into a refusal rather than a crash", async () => {
    const prisma = trialPrisma(null);
    prisma.freeTrialRedemption.create = vi.fn().mockRejectedValue(
      Object.assign(new Error("Unique constraint failed"), { code: "P2002" }),
    );

    await expect(
      claimFreeTrialWithTeacher(prisma, { studentId: "s1", teacherId: "t1", bookingId: "b1" }),
    ).rejects.toBeInstanceOf(FreeTrialAlreadyUsedError);
  });

  test("lets unrelated database failures surface unchanged", async () => {
    const prisma = trialPrisma(null);
    const boom = Object.assign(new Error("connection lost"), { code: "P1001" });
    prisma.freeTrialRedemption.create = vi.fn().mockRejectedValue(boom);

    await expect(
      claimFreeTrialWithTeacher(prisma, { studentId: "s1", teacherId: "t1", bookingId: "b1" }),
    ).rejects.toBe(boom);
  });
});
