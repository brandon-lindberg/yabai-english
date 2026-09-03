import { afterAll, beforeAll, describe, expect, test } from "vitest";
import { prisma } from "@/lib/prisma";
import { GroupClassFullError, reserveGroupSeat } from "@/lib/group-lesson-session";

/**
 * Capacity is enforced by the database, not by application logic, so this is
 * the only place it can actually be shown to hold. Mocks can prove the lock is
 * taken before the count; only Postgres can prove that two students racing for
 * the last seat do not both get it.
 *
 * Skipped without a database, matching how the rest of the suite runs.
 */
const hasDatabase = Boolean(process.env.DATABASE_URL);

const TAG = `concurrency-${Date.now()}`;
const CAPACITY = 3;
const CONTENDERS = 6;
const STARTS_AT = new Date("2027-03-07T01:30:00.000Z");
const ENDS_AT = new Date("2027-03-07T02:30:00.000Z");

let teacherProfileId: string;
let offeringId: string;
let slotId: string;
let productId: string;
let studentIds: string[] = [];

describe.skipIf(!hasDatabase)("booking concurrency", () => {
  beforeAll(async () => {
    const teacherUser = await prisma.user.create({
      data: { email: `teacher-${TAG}@example.test`, name: "Race Teacher", role: "TEACHER" },
    });
    const profile = await prisma.teacherProfile.create({
      data: { userId: teacherUser.id, rateYen: 3000 },
    });
    teacherProfileId = profile.id;

    const [level, type] = await Promise.all([
      prisma.teacherClassLevel.create({
        data: { teacherId: profile.id, code: `lvl-${TAG}`, labelEn: "Level" },
      }),
      prisma.teacherClassType.create({
        data: { teacherId: profile.id, code: `ty-${TAG}`, labelEn: "Type" },
      }),
    ]);

    const offering = await prisma.teacherLessonOffering.create({
      data: {
        teacherId: profile.id,
        durationMin: 60,
        rateYen: 3000,
        groupTotalRateYen: 9000,
        isGroup: true,
        groupSize: CAPACITY,
        classLevelId: level.id,
        classTypeId: type.id,
      },
    });
    offeringId = offering.id;

    const slot = await prisma.availabilitySlot.create({
      data: {
        teacherId: profile.id,
        dayOfWeek: 0,
        startMin: 10 * 60 + 30,
        endMin: 11 * 60 + 30,
        timezone: "Asia/Tokyo",
        recurrence: "ONE_OFF",
        classLevelId: level.id,
        classTypeId: type.id,
        teacherLessonOfferingId: offering.id,
      },
    });
    slotId = slot.id;

    const product = await prisma.lessonProduct.create({
      data: {
        tier: "STANDARD",
        nameEn: `Race ${TAG}`,
        nameJa: `Race ${TAG}`,
        durationMin: 60,
      },
    });
    productId = product.id;

    const students = await Promise.all(
      Array.from({ length: CONTENDERS }, (_, i) =>
        prisma.user.create({
          data: { email: `student-${i}-${TAG}@example.test`, name: `Student ${i}` },
        }),
      ),
    );
    studentIds = students.map((s) => s.id);
  });

  afterAll(async () => {
    if (!teacherProfileId) return;
    // Bookings first: they reference the product, which is not cascaded.
    await prisma.booking.deleteMany({ where: { teacherId: teacherProfileId } });
    await prisma.groupLessonSession.deleteMany({ where: { teacherId: teacherProfileId } });
    await prisma.availabilitySlot.deleteMany({ where: { teacherId: teacherProfileId } });
    await prisma.teacherLessonOffering.deleteMany({ where: { teacherId: teacherProfileId } });
    await prisma.teacherClassLevel.deleteMany({ where: { teacherId: teacherProfileId } });
    await prisma.teacherClassType.deleteMany({ where: { teacherId: teacherProfileId } });
    const profile = await prisma.teacherProfile.findUnique({
      where: { id: teacherProfileId },
      select: { userId: true },
    });
    await prisma.teacherProfile.deleteMany({ where: { id: teacherProfileId } });
    await prisma.lessonProduct.deleteMany({ where: { id: productId } });
    await prisma.user.deleteMany({
      where: { id: { in: [...studentIds, ...(profile ? [profile.userId] : [])] } },
    });
  });

  function takeSeat(studentId: string) {
    return prisma.$transaction(async (tx) => {
      const groupLessonSessionId = await reserveGroupSeat(tx, {
        teacherId: teacherProfileId,
        availabilitySlotId: slotId,
        teacherLessonOfferingId: offeringId,
        startsAt: STARTS_AT,
        endsAt: ENDS_AT,
        capacity: CAPACITY,
      });
      return tx.booking.create({
        data: {
          studentId,
          teacherId: teacherProfileId,
          lessonProductId: productId,
          groupLessonSessionId,
          startsAt: STARTS_AT,
          endsAt: ENDS_AT,
          status: "CONFIRMED",
          quotedPriceYen: 3000,
        },
      });
    });
  }

  test("seats exactly the class capacity when everyone books at once", async () => {
    const results = await Promise.allSettled(studentIds.map(takeSeat));

    const seated = results.filter((r) => r.status === "fulfilled");
    const turnedAway = results.filter((r) => r.status === "rejected");

    expect(seated).toHaveLength(CAPACITY);
    expect(turnedAway).toHaveLength(CONTENDERS - CAPACITY);

    // Everyone turned away was told the class was full, not handed a raw
    // database error the route would have to guess at.
    for (const failure of turnedAway) {
      expect((failure as PromiseRejectedResult).reason).toBeInstanceOf(GroupClassFullError);
    }
  });

  test("opens exactly one class, however many students arrive together", async () => {
    const sessions = await prisma.groupLessonSession.findMany({
      where: { teacherId: teacherProfileId },
      select: { id: true, capacity: true },
    });

    expect(sessions).toHaveLength(1);
    expect(sessions[0]!.capacity).toBe(CAPACITY);

    const seats = await prisma.booking.count({
      where: { groupLessonSessionId: sessions[0]!.id },
    });
    expect(seats).toBe(CAPACITY);
  });

  test("refuses a second live seat to a student who already has one", async () => {
    // Its own occurrence, with room to spare: on a full class the capacity
    // check fires first and the index never gets a say. Here the only thing
    // that can refuse the second seat is the partial unique index.
    const otherStart = new Date("2027-03-14T01:30:00.000Z");
    const otherEnd = new Date("2027-03-14T02:30:00.000Z");
    const twice = () =>
      prisma.$transaction(async (tx) => {
        const groupLessonSessionId = await reserveGroupSeat(tx, {
          teacherId: teacherProfileId,
          availabilitySlotId: slotId,
          teacherLessonOfferingId: offeringId,
          startsAt: otherStart,
          endsAt: otherEnd,
          capacity: CAPACITY,
        });
        return tx.booking.create({
          data: {
            studentId: studentIds[0]!,
            teacherId: teacherProfileId,
            lessonProductId: productId,
            groupLessonSessionId,
            startsAt: otherStart,
            endsAt: otherEnd,
            status: "CONFIRMED",
            quotedPriceYen: 3000,
          },
        });
      });

    await expect(twice()).resolves.toBeTruthy();
    await expect(twice()).rejects.toMatchObject({ code: "P2002" });
  });
});
