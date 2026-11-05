import { expect, test } from "vitest";
import { marketplaceTeacherWhere } from "@/lib/marketplace-teacher-filter";
import { learningLanguageAvailabilityWhere, learningLanguageTeacherWhere } from "@/lib/learning-language";
import { withIsolatedPostgres } from "../../test/isolated-postgres";

const migration = "20261021000000_learning_language_foundation";

// Opt-in only: the default regression command has no database access at all.
test.runIf(process.env.MIRROR_TEST_DATABASE_URL)("migrates English records and enforces subject queries in PostgreSQL", async () => {
  await withIsolatedPostgres(migration, async ({ client, db: prisma, applyMigration }) => {
    await client.query(`
      INSERT INTO "User" (id, locale, role, "updatedAt") VALUES ('student', 'en', 'STUDENT', NOW()), ('teacher-user', 'ja', 'TEACHER', NOW());
      INSERT INTO "StudentProfile" (id, "userId", "placedLevel", "placedSubLevel") VALUES ('profile', 'student', 'INTERMEDIATE', 2);
      INSERT INTO "TeacherProfile" (id, "userId") VALUES ('teacher', 'teacher-user');
      INSERT INTO "LessonProduct" (id, tier, "durationMin", "nameEn", "nameJa") VALUES ('product', 'STANDARD', 60, 'Lesson', 'レッスン');
      INSERT INTO "TeacherLessonOffering" (id, "teacherId", "durationMin", "rateYen", "updatedAt") VALUES ('english-offer', 'teacher', 60, 5000, NOW());
      INSERT INTO "Booking" (id, "studentId", "teacherId", "lessonProductId", "startsAt", "endsAt", status, "quotedPriceYen", "updatedAt") VALUES ('historic', 'student', 'teacher', 'product', NOW(), NOW() + INTERVAL '1 hour', 'CONFIRMED', 5000, NOW());
    `);
    const historicBefore = (await client.query('SELECT * FROM "Booking" WHERE id = $1', ["historic"])).rows[0];
    await applyMigration();

    const historicAfter = await prisma.booking.findUniqueOrThrow({ where: { id: "historic" } });
    // Compare through the same timestamp parser on both sides (pg interprets
    // timestamp-without-zone locally; Prisma interprets it as UTC).
    expect((await client.query('SELECT * FROM "Booking" WHERE id = $1', ["historic"])).rows[0])
      .toEqual({ ...historicBefore, learningLanguage: "ENGLISH", privateRescheduleStatus: null, rescheduleRequestedAt: null, rescheduleResolvedAt: null, cancelledFromStatus: null });
    expect(await prisma.user.findUniqueOrThrow({ where: { id: "student" } })).toMatchObject({ locale: "en", learningLanguage: "ENGLISH" });
    expect(await prisma.teacherLessonOffering.findUniqueOrThrow({ where: { id: "english-offer" } })).toMatchObject({ learningLanguage: "ENGLISH" });
    await prisma.user.update({ where: { id: "student" }, data: { learningLanguage: "JAPANESE" } });
    expect(await prisma.studentProfile.findUniqueOrThrow({ where: { id: "profile" } })).toMatchObject({ placedLevel: "INTERMEDIATE", placedSubLevel: 2 });
    expect(await prisma.booking.findUniqueOrThrow({ where: { id: "historic" } })).toEqual(historicAfter);

    const japanese = await prisma.teacherLessonOffering.create({ data: { id: "japanese-offer", teacherId: "teacher", durationMin: 60, rateYen: 6000, learningLanguage: "JAPANESE" } });
    await prisma.availabilitySlot.createMany({ data: [
      { id: "legacy-time", teacherId: "teacher", dayOfWeek: 1, startMin: 600, endMin: 660 },
      { id: "english-time", teacherId: "teacher", dayOfWeek: 1, startMin: 660, endMin: 720, teacherLessonOfferingId: "english-offer" },
      { id: "japanese-time", teacherId: "teacher", dayOfWeek: 1, startMin: 720, endMin: 780, teacherLessonOfferingId: japanese.id },
    ] });
    const times = async (language: "ENGLISH" | "JAPANESE") =>
      (await prisma.availabilitySlot.findMany({ where: learningLanguageAvailabilityWhere(language), orderBy: { startMin: "asc" } })).map((s) => s.id);
    expect(await times("ENGLISH")).toEqual(["legacy-time", "english-time"]);
    expect(await times("JAPANESE")).toEqual(["japanese-time"]);
    expect(await prisma.teacherProfile.count({ where: marketplaceTeacherWhere("student", "JAPANESE") })).toBe(1);
    await prisma.teacherLessonOffering.update({ where: { id: japanese.id }, data: { active: false } });
    expect(await times("JAPANESE")).toEqual([]);
    expect(await prisma.teacherProfile.findUnique({ where: { id: "teacher", AND: [learningLanguageTeacherWhere("JAPANESE")] } })).toBeNull();
    // Roster access is independent of subject, so it cannot bypass the boundary.
    await prisma.teacherProfile.update({ where: { id: "teacher" }, data: { marketplaceHidden: true } });
    await prisma.teacherRosterEntry.create({ data: { teacherId: "teacher", studentId: "student" } });
    expect(await prisma.teacherProfile.count({ where: marketplaceTeacherWhere("student", "JAPANESE") })).toBe(0);
    expect(await prisma.teacherProfile.count({ where: marketplaceTeacherWhere("student", "ENGLISH") })).toBe(1);
    await prisma.teacherLessonOffering.update({ where: { id: "english-offer" }, data: { active: false } });
    // Existing English trial hours can be unlinked even after a priced class
    // is retired. Introducing subjects must not silently remove those hours.
    expect(await prisma.teacherProfile.count({ where: marketplaceTeacherWhere("student", "ENGLISH") })).toBe(1);
  });
}, 30_000);
