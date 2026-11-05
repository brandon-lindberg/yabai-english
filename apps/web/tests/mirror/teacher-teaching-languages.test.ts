import { expect, test } from "vitest";
import { withIsolatedPostgres } from "../../test/isolated-postgres";
import { marketplaceTeacherWhere } from "@/lib/marketplace-teacher-filter";
import { learningLanguageTeacherWhere } from "@/lib/learning-language";
import type { Client } from "pg";

const migration = "20261105000000_teacher_teaching_languages";
const optIn = test.runIf(process.env.MIRROR_TEST_DATABASE_URL);
async function historicalTeachers(client: Client) {
  for (const id of ["english", "japanese", "both", "legacy"]) {
    await client.query('INSERT INTO "User" (id,role,"updatedAt") VALUES ($1,\'TEACHER\',NOW())', [id]);
    await client.query('INSERT INTO "TeacherProfile" (id,"userId") VALUES ($1,$1)', [id]);
  }
  for (const [id, teacherId, language] of [["en", "english", "ENGLISH"], ["ja", "japanese", "JAPANESE"], ["both-en", "both", "ENGLISH"], ["both-ja", "both", "JAPANESE"]]) {
    await client.query('INSERT INTO "TeacherLessonOffering" (id,"teacherId","learningLanguage","durationMin","rateYen","updatedAt") VALUES ($1,$2,$3,60,5000,NOW())', [id, teacherId, language]);
  }
  // Legacy unlinked trial hours must not put a Japanese-only teacher in English discovery.
  await client.query('INSERT INTO "AvailabilitySlot" (id,"teacherId","dayOfWeek","startMin","endMin") VALUES (\'legacy-slot\',\'japanese\',1,600,660)');
}
optIn("backfills explicit permissions from existing classes while preserving every original profile/offering field", async () => {
  await withIsolatedPostgres(migration, async ({ client, applyMigration, verifyDatamodel }) => {
    await historicalTeachers(client);
    const before = (await client.query('SELECT jsonb_agg(to_jsonb(t) ORDER BY id) AS rows FROM "TeacherProfile" t')).rows[0].rows;
    const offers = (await client.query('SELECT jsonb_agg(to_jsonb(t) ORDER BY id) AS rows FROM "TeacherLessonOffering" t')).rows[0].rows;
    await applyMigration();
    expect((await client.query('SELECT id,to_jsonb("teachingLanguages") AS "teachingLanguages" FROM "TeacherProfile" ORDER BY id')).rows).toEqual([
      { id: "both", teachingLanguages: ["ENGLISH", "JAPANESE"] }, { id: "english", teachingLanguages: ["ENGLISH"] },
      { id: "japanese", teachingLanguages: ["JAPANESE"] }, { id: "legacy", teachingLanguages: ["ENGLISH"] },
    ]);
    expect((await client.query('SELECT jsonb_agg(to_jsonb(t)-\'teachingLanguages\' ORDER BY id) AS rows FROM "TeacherProfile" t')).rows[0].rows).toEqual(before);
    expect((await client.query('SELECT jsonb_agg(to_jsonb(t) ORDER BY id) AS rows FROM "TeacherLessonOffering" t')).rows[0].rows).toEqual(offers);
    await expect(client.query('UPDATE "TeacherProfile" SET "teachingLanguages"=\'{}\' WHERE id=\'japanese\'')).rejects.toThrow(/check/);
    await verifyDatamodel();
  });
}, 30_000);
optIn("actual marketplace queries exclude unassigned teachers in both directions, including unlinked trial fallback", async () => {
  await withIsolatedPostgres(migration, async ({ client, db, applyMigration }) => {
    await historicalTeachers(client); await applyMigration();
    const visible = async (language: "ENGLISH" | "JAPANESE") => (await db.teacherProfile.findMany({ where: learningLanguageTeacherWhere(language), select: { id: true }, orderBy: { id: "asc" } })).map(row => row.id);
    expect(await visible("ENGLISH")).toEqual(["both", "english", "legacy"]);
    expect(await visible("JAPANESE")).toEqual(["both", "japanese"]);
  });
}, 30_000);

optIn("English-only production upgrade retains every teacher and their English marketplace access", async () => {
  await withIsolatedPostgres(migration, async ({ client, db, applyMigration }) => {
    await historicalTeachers(client);
    // Model the owner's production state, including Japanese-speaking English
    // teachers, a teacher without classes, and legacy unlinked trial hours.
    await client.query(`UPDATE "TeacherLessonOffering" SET "learningLanguage"='ENGLISH'`);
    await client.query(`UPDATE "TeacherProfile" SET "countryOfOrigin"='JP',"instructionLanguages"=ARRAY['JA']`);
    const readOriginals = async () => {
      const rows: Record<string, unknown> = {};
      for (const table of ["User", "TeacherProfile", "TeacherLessonOffering", "AvailabilitySlot"]) {
        const original = table === "TeacherProfile" ? "to_jsonb(t)-'teachingLanguages'" : "to_jsonb(t)";
        rows[table] = (await client.query(`SELECT jsonb_agg(${original} ORDER BY id) AS rows FROM "${table}" t`)).rows[0].rows;
      }
      return rows;
    };
    const original = await readOriginals();
    await applyMigration();
    expect(await db.teacherProfile.findMany({ select: { id: true, teachingLanguages: true }, orderBy: { id: "asc" } })).toEqual(
      ["both", "english", "japanese", "legacy"].map(id => ({ id, teachingLanguages: ["ENGLISH"] })),
    );
    const visible = async (language: "ENGLISH" | "JAPANESE") => (await db.teacherProfile.findMany({
      where: marketplaceTeacherWhere(null, language), select: { id: true }, orderBy: { id: "asc" },
    })).map(row => row.id);
    expect(await visible("ENGLISH")).toEqual(["both", "english", "japanese", "legacy"]);
    expect(await visible("JAPANESE")).toEqual([]);
    expect(await readOriginals()).toEqual(original);
  });
}, 30_000);
