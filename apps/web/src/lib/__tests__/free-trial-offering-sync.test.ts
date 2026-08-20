import { beforeEach, describe, expect, test, vi } from "vitest";
import { ensureFreeTrialOffering } from "@/lib/free-trial-offering-sync";
import { FREE_TRIAL_DURATION_MIN } from "@/lib/free-trial-offering";

function syncPrisma(overrides: {
  existingTrial?: unknown;
  level?: unknown;
  type?: unknown;
} = {}) {
  return {
    teacherLessonOffering: {
      findFirst: vi.fn().mockResolvedValue(overrides.existingTrial ?? null),
      create: vi.fn().mockResolvedValue({ id: "trial-offering-1" }),
    },
    teacherClassLevel: {
      findFirst: vi.fn().mockResolvedValue(
        "level" in overrides ? overrides.level : { id: "lvl-beginner" },
      ),
    },
    teacherClassType: {
      findFirst: vi.fn().mockResolvedValue(
        "type" in overrides ? overrides.type : { id: "ty-conversation" },
      ),
    },
  };
}

describe("ensureFreeTrialOffering", () => {
  beforeEach(() => vi.clearAllMocks());

  test("gives a teacher a trial to schedule against before they publish anything", async () => {
    const prisma = syncPrisma();

    await ensureFreeTrialOffering(prisma, { teacherId: "t1", offersFreeTrial: true });

    expect(prisma.teacherLessonOffering.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        teacherId: "t1",
        durationMin: FREE_TRIAL_DURATION_MIN,
        rateYen: 0,
        isFreeTrial: true,
        active: true,
        classLevelId: "lvl-beginner",
        classTypeId: "ty-conversation",
      }),
    });
  });

  test("is idempotent — a second call creates nothing", async () => {
    const prisma = syncPrisma({ existingTrial: { id: "trial-offering-1" } });

    await ensureFreeTrialOffering(prisma, { teacherId: "t1", offersFreeTrial: true });

    expect(prisma.teacherLessonOffering.create).not.toHaveBeenCalled();
  });

  test("creates nothing for a teacher who has opted out", async () => {
    const prisma = syncPrisma();

    await ensureFreeTrialOffering(prisma, { teacherId: "t1", offersFreeTrial: false });

    expect(prisma.teacherLessonOffering.create).not.toHaveBeenCalled();
    expect(prisma.teacherClassLevel.findFirst).not.toHaveBeenCalled();
  });

  test("creates nothing when the teacher has no taxonomy to hang it on", async () => {
    const prisma = syncPrisma({ level: null, type: null });

    await ensureFreeTrialOffering(prisma, { teacherId: "t1", offersFreeTrial: true });

    expect(prisma.teacherLessonOffering.create).not.toHaveBeenCalled();
  });

  test("reactivates a trial the teacher previously switched off", async () => {
    const prisma = syncPrisma({ existingTrial: { id: "trial-offering-1", active: false } });
    const update = vi.fn().mockResolvedValue({});
    (prisma.teacherLessonOffering as unknown as { update: unknown }).update = update;

    await ensureFreeTrialOffering(prisma, { teacherId: "t1", offersFreeTrial: true });

    expect(update).toHaveBeenCalledWith({
      where: { id: "trial-offering-1" },
      data: { active: true },
    });
  });
});
