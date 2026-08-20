import {
  FREE_TRIAL_DEFAULT_LEVEL_CODE,
  FREE_TRIAL_DEFAULT_TYPE_CODE,
  FREE_TRIAL_DURATION_MIN,
} from "@/lib/free-trial-offering";

type EnsureTrialPrisma = {
  teacherLessonOffering: {
    findFirst: (args: {
      where: { teacherId: string; isFreeTrial: true };
      select: { id: true; active: true };
    }) => Promise<{ id: string; active?: boolean } | null>;
    create: (args: {
      data: {
        teacherId: string;
        durationMin: number;
        rateYen: number;
        isGroup: boolean;
        groupSize: number | null;
        isFreeTrial: boolean;
        active: boolean;
        classLevelId: string;
        classTypeId: string;
      };
    }) => Promise<unknown>;
    update?: (args: {
      where: { id: string };
      data: { active: true };
    }) => Promise<unknown>;
  };
  teacherClassLevel: {
    findFirst: (args: {
      where: { teacherId: string; code: string };
      select: { id: true };
    }) => Promise<{ id: string } | null>;
  };
  teacherClassType: {
    findFirst: (args: {
      where: { teacherId: string; code: string };
      select: { id: true };
    }) => Promise<{ id: string } | null>;
  };
};

/**
 * Makes sure a teacher who offers trials has a trial offering to schedule
 * against.
 *
 * The availability editor picks a slot's class from the teacher's offerings, so
 * the trial has to exist *before* they open the editor — otherwise there is
 * nothing to select and no way to publish trial hours. Idempotent, and safe to
 * call on every visit.
 */
export async function ensureFreeTrialOffering(
  prisma: EnsureTrialPrisma,
  { teacherId, offersFreeTrial }: { teacherId: string; offersFreeTrial: boolean },
): Promise<void> {
  if (!offersFreeTrial) return;

  const existing = await prisma.teacherLessonOffering.findFirst({
    where: { teacherId, isFreeTrial: true },
    select: { id: true, active: true },
  });
  if (existing) {
    // Opting back in should bring the teacher's trial hours back rather than
    // leaving a dormant offering they cannot select.
    if (existing.active === false) {
      await prisma.teacherLessonOffering.update?.({
        where: { id: existing.id },
        data: { active: true },
      });
    }
    return;
  }

  const [level, type] = await Promise.all([
    prisma.teacherClassLevel.findFirst({
      where: { teacherId, code: FREE_TRIAL_DEFAULT_LEVEL_CODE },
      select: { id: true },
    }),
    prisma.teacherClassType.findFirst({
      where: { teacherId, code: FREE_TRIAL_DEFAULT_TYPE_CODE },
      select: { id: true },
    }),
  ]);
  // A slot must match its offering on level and type, so without a taxonomy
  // there is nothing valid to create yet.
  if (!level || !type) return;

  await prisma.teacherLessonOffering.create({
    data: {
      teacherId,
      durationMin: FREE_TRIAL_DURATION_MIN,
      rateYen: 0,
      isGroup: false,
      groupSize: null,
      isFreeTrial: true,
      active: true,
      classLevelId: level.id,
      classTypeId: type.id,
    },
  });
}
