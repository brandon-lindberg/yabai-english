import { readFile, readdir } from "node:fs/promises";
import path from "node:path";
import { randomUUID } from "node:crypto";
import { Client } from "pg";
import { PrismaPg } from "@prisma/adapter-pg";
import { expect, test } from "vitest";
import { PrismaClient } from "@/generated/prisma/client";
import { marketplaceTeacherWhere } from "@/lib/marketplace-teacher-filter";
import { learningLanguageAvailabilityWhere, learningLanguageTeacherWhere } from "@/lib/learning-language";

const migration = "20261021000000_learning_language_foundation";

// Opt-in only: the default regression command has no database access at all.
test.runIf(process.env.MIRROR_TEST_DATABASE_URL)("migrates English records and enforces subject queries in PostgreSQL", async () => {
  const migrations = path.resolve("prisma/migrations");
  const sql = await readFile(path.join(migrations, migration, "migration.sql"), "utf8");
  const connectionString = process.env.MIRROR_TEST_DATABASE_URL!;
  const url = new URL(connectionString);
  if (!["localhost", "127.0.0.1", "[::1]"].includes(url.hostname)) {
    throw new Error("Migration verification requires a local PostgreSQL database.");
  }
  const schema = `mirror_test_${randomUUID().replaceAll("-", "")}`;
  const client = new Client({ connectionString, application_name: schema });
  let prisma: PrismaClient | undefined;
  await client.connect();
  try {
    await client.query(`CREATE SCHEMA "${schema}"`);
    // No public fallback: every test write stays inside the owned schema.
    await client.query(`SET search_path TO "${schema}"`);
    for (const name of (await readdir(migrations)).sort().filter((name) => name < migration)) {
      if (name === "migration_lock.toml") continue;
      const priorSql = await readFile(path.join(migrations, name, "migration.sql"), "utf8");
      await client.query(priorSql.replace('CREATE SCHEMA IF NOT EXISTS "public";', ""));
    }
    await client.query(`
      INSERT INTO "User" (id, locale, role, "updatedAt") VALUES ('student', 'en', 'STUDENT', NOW()), ('teacher-user', 'ja', 'TEACHER', NOW());
      INSERT INTO "StudentProfile" (id, "userId", "placedLevel", "placedSubLevel") VALUES ('profile', 'student', 'INTERMEDIATE', 2);
      INSERT INTO "TeacherProfile" (id, "userId") VALUES ('teacher', 'teacher-user');
      INSERT INTO "LessonProduct" (id, tier, "durationMin", "nameEn", "nameJa") VALUES ('product', 'STANDARD', 60, 'Lesson', 'レッスン');
      INSERT INTO "TeacherLessonOffering" (id, "teacherId", "durationMin", "rateYen", "updatedAt") VALUES ('english-offer', 'teacher', 60, 5000, NOW());
      INSERT INTO "Booking" (id, "studentId", "teacherId", "lessonProductId", "startsAt", "endsAt", status, "quotedPriceYen", "updatedAt") VALUES ('historic', 'student', 'teacher', 'product', NOW(), NOW() + INTERVAL '1 hour', 'CONFIRMED', 5000, NOW());
    `);
    const historicBefore = (await client.query('SELECT * FROM "Booking" WHERE id = $1', ["historic"])).rows[0];
    await client.query(sql);
    prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString, application_name: schema }, { schema }) });

    const historicAfter = await prisma.booking.findUniqueOrThrow({ where: { id: "historic" } });
    // Compare through the same timestamp parser on both sides (pg interprets
    // timestamp-without-zone locally; Prisma interprets it as UTC).
    expect((await client.query('SELECT * FROM "Booking" WHERE id = $1', ["historic"])).rows[0])
      .toEqual({ ...historicBefore, learningLanguage: "ENGLISH" });
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
      (await prisma!.availabilitySlot.findMany({ where: learningLanguageAvailabilityWhere(language), orderBy: { startMin: "asc" } })).map((s) => s.id);
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
  } finally {
    try {
      await prisma?.$disconnect();
      expect((await client.query("SELECT 1 FROM pg_stat_activity WHERE application_name = $1 AND pid <> pg_backend_pid()", [schema])).rowCount).toBe(0);
    } finally {
      try {
        await client.query(`DROP SCHEMA IF EXISTS "${schema}" CASCADE`);
        expect((await client.query("SELECT 1 FROM pg_namespace WHERE nspname = $1", [schema])).rowCount).toBe(0);
      } finally {
        await client.end();
      }
    }
  }
}, 30_000);
