import { afterAll, describe, expect, test } from "vitest";
import { prisma } from "@/lib/prisma";

/**
 * Editing a class must never unlink the availability published against it.
 *
 * The rates form used to save by deleting the teacher's whole set of classes
 * and recreating them. `AvailabilitySlot.teacherLessonOfferingId` is SetNull,
 * so every published slot silently lost the class it belonged to — and with it
 * the duration, price, group size and free-trial status the booking page reads
 * through that link. Editing in place is what makes that impossible.
 */
const TAG = `offering-edit-${Date.now()}`;
let teacherProfileId = "";

describe.skipIf(!process.env.DATABASE_URL)("editing a class keeps its availability", () => {
  afterAll(async () => {
    if (!teacherProfileId) return;
    await prisma.availabilitySlot.deleteMany({ where: { teacherId: teacherProfileId } });
    await prisma.teacherLessonOffering.deleteMany({ where: { teacherId: teacherProfileId } });
    await prisma.teacherClassLevel.deleteMany({ where: { teacherId: teacherProfileId } });
    await prisma.teacherClassType.deleteMany({ where: { teacherId: teacherProfileId } });
    const p = await prisma.teacherProfile.findUnique({
      where: { id: teacherProfileId },
      select: { userId: true },
    });
    await prisma.teacherProfile.deleteMany({ where: { id: teacherProfileId } });
    if (p) await prisma.user.deleteMany({ where: { id: p.userId } });
  });

  test("a price change leaves the slot pointing at the same class", async () => {
    const user = await prisma.user.create({
      data: { email: `t-${TAG}@example.test`, role: "TEACHER" },
    });
    const profile = await prisma.teacherProfile.create({ data: { userId: user.id } });
    teacherProfileId = profile.id;
    const level = await prisma.teacherClassLevel.create({
      data: { teacherId: profile.id, code: `l-${TAG}`, labelEn: "L" },
    });
    const type = await prisma.teacherClassType.create({
      data: { teacherId: profile.id, code: `t-${TAG}`, labelEn: "T" },
    });
    const offering = await prisma.teacherLessonOffering.create({
      data: {
        teacherId: profile.id,
        durationMin: 60,
        rateYen: 5000,
        classLevelId: level.id,
        classTypeId: type.id,
      },
    });
    const slot = await prisma.availabilitySlot.create({
      data: {
        teacherId: profile.id,
        dayOfWeek: 1,
        startMin: 600,
        endMin: 660,
        timezone: "Asia/Tokyo",
        recurrence: "ONE_OFF",
        classLevelId: level.id,
        classTypeId: type.id,
        teacherLessonOfferingId: offering.id,
      },
    });

    // What the rates form now does when a teacher changes a price.
    await prisma.teacherLessonOffering.update({
      where: { id: offering.id },
      data: { rateYen: 6000 },
    });

    const after = await prisma.availabilitySlot.findUnique({
      where: { id: slot.id },
      select: { teacherLessonOfferingId: true },
    });
    expect(after?.teacherLessonOfferingId).toBe(offering.id);
  });
});
