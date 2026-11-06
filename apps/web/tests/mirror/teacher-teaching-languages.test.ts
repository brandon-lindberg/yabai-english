import { expect, test } from "vitest";
import { withIsolatedPostgres } from "../../test/isolated-postgres";
import { marketplaceTeacherWhere } from "@/lib/marketplace-teacher-filter";
import { learningLanguageTeacherWhere } from "@/lib/learning-language";
import { loadAdminTeacherOverview } from "@/lib/admin/teacher-overview";
import { lockTeacherBookingAccess } from "@/lib/teacher-booking-lock";
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
    expect((await client.query('SELECT jsonb_agg(to_jsonb(t)-\'teachingLanguages\'-\'japaneseMarketplaceHidden\' ORDER BY id) AS rows FROM "TeacherProfile" t')).rows[0].rows).toEqual(before);
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
        const original = table === "TeacherProfile" ? "to_jsonb(t)-'teachingLanguages'-'japaneseMarketplaceHidden'" : "to_jsonb(t)";
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

optIn("preserves legacy marketplace privacy and enforces new visibility independently through a booking transaction", async () => {
  await withIsolatedPostgres("20261106010000_teacher_subject_visibility", async ({ client, db, applyMigration, verifyDatamodel }) => {
    await historicalTeachers(client);
    await client.query(`UPDATE "TeacherProfile" SET "teachingLanguages"=ARRAY['ENGLISH','JAPANESE']::"LearningLanguage"[],
      "marketplaceHidden"=true WHERE id='both'`);
    await client.query(`INSERT INTO "User" (id,role,"updatedAt") VALUES ('rostered','STUDENT',NOW()), ('outsider','STUDENT',NOW())`);
    await applyMigration();
    await verifyDatamodel();

    const teacher = await db.teacherProfile.findUniqueOrThrow({ where: { id: "both" } });
    expect(teacher).toMatchObject({ marketplaceHidden: true, japaneseMarketplaceHidden: true });
    expect(await db.teacherProfile.findUnique({ where: { id: "legacy" }, select: { marketplaceHidden: true, japaneseMarketplaceHidden: true } }))
      .toEqual({ marketplaceHidden: false, japaneseMarketplaceHidden: false });
    const updated = await db.teacherProfile.update({ where: { id: "both" }, data: { marketplaceHidden: false } });
    await db.teacherRosterEntry.create({ data: { teacherId: "both", studentId: "rostered" } });
    const visible = (language: "ENGLISH" | "JAPANESE", viewer: string | null) => db.teacherProfile.count({ where: {
      id: "both", ...marketplaceTeacherWhere(viewer, language),
    } });
    expect(await visible("ENGLISH", null)).toBe(1);
    expect(await visible("JAPANESE", null)).toBe(0);
    expect(await visible("JAPANESE", "rostered")).toBe(1);
    expect(await visible("JAPANESE", "outsider")).toBe(0);

    const schema = (await client.query("SELECT current_schema() AS schema")).rows[0].schema as string;
    const canBook = (language: "ENGLISH" | "JAPANESE", studentId: string) => db.$transaction(async (tx) => {
      await tx.$queryRaw`SELECT set_config('search_path', ${schema}, true)`;
      return lockTeacherBookingAccess(tx, { studentId, teacherId: "both", teacherUserId: "both", learningLanguage: language });
    });
    await expect(canBook("ENGLISH", "outsider")).resolves.toBe(true);
    await expect(canBook("JAPANESE", "outsider")).resolves.toBe(false);
    await expect(canBook("JAPANESE", "rostered")).resolves.toBe(true);

    const overview = await loadAdminTeacherOverview(db, updated, "ACTIVE", null);
    expect(overview.subjects).toMatchObject([
      { learningLanguage: "ENGLISH", permitted: true, eligible: true, rosterOnly: false },
      { learningLanguage: "JAPANESE", permitted: true, eligible: true, rosterOnly: true },
    ]);
    expect(overview.offerings.map(({ learningLanguage }) => learningLanguage).sort()).toEqual(["ENGLISH", "JAPANESE"]);
  });
}, 30_000);
