import { expect, test, vi } from "vitest";
import { deriveFreeTrialOffering } from "../free-trial-offering";
import { ensureFreeTrialOffering } from "../free-trial-offering-sync";

test("a teacher's English trial does not stand in for a Japanese trial", () => {
  const result = deriveFreeTrialOffering({ existing: [{ isFreeTrial: true, active: true, learningLanguage: "ENGLISH" }], offersFreeTrial: true, classLevelId: "level", classTypeId: "type", learningLanguage: "JAPANESE" });
  expect(result).toMatchObject({ learningLanguage: "JAPANESE", isFreeTrial: true, rateYen: 0 });
});

test("trial creation is scoped to the chosen teaching language", async () => {
  const prisma = {
    teacherLessonOffering: { findFirst: vi.fn(async () => null), create: vi.fn() },
    teacherClassLevel: { findFirst: vi.fn(async () => ({ id: "level" })) },
    teacherClassType: { findFirst: vi.fn(async () => ({ id: "type" })) },
  };
  await ensureFreeTrialOffering(prisma, { teacherId: "teacher", offersFreeTrial: true, learningLanguage: "JAPANESE" });
  expect(prisma.teacherLessonOffering.findFirst).toHaveBeenCalledWith(expect.objectContaining({ where: { teacherId: "teacher", isFreeTrial: true, learningLanguage: "JAPANESE" } }));
  expect(prisma.teacherLessonOffering.create).toHaveBeenCalledWith(expect.objectContaining({ data: expect.objectContaining({ learningLanguage: "JAPANESE" }) }));
});
