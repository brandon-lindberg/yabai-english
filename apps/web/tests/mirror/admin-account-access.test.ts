import { expect, test } from "vitest";
import { changeAdminAccountAccess } from "@/lib/admin/account-access";
import { marketplaceTeacherWhere } from "@/lib/marketplace-teacher-filter";
import { getStudentRosterTeachers } from "@/lib/student-roster-teachers";
import { withIsolatedPostgres } from "../../test/isolated-postgres";

const migration = "20261106000000_admin_account_suspension";

test.runIf(process.env.MIRROR_TEST_DATABASE_URL)("audits suspension and reinstatement without changing the linked identity or historical access", async () => {
  await withIsolatedPostgres(migration, async ({ client, db, applyMigration, verifyDatamodel }) => {
    await client.query(`INSERT INTO "User" (id,email,role,"updatedAt") VALUES
      ('admin','admin@example.test','SUPER_ADMIN',NOW()),
      ('teacher','teacher@example.test','TEACHER',NOW()),
      ('student','student@example.test','STUDENT',NOW())`);
    await client.query(`INSERT INTO "TeacherProfile" (id,"userId") VALUES ('profile','teacher')`);
    await client.query(`INSERT INTO "Account" (id,"userId",type,provider,"providerAccountId")
      VALUES ('account','teacher','oauth','google','linked-google-id')`);
    await client.query(`INSERT INTO "Session" (id,"sessionToken","userId",expires) VALUES
      ('a','session-a','teacher',NOW() + interval '1 day'),
      ('b','session-b','teacher',NOW() + interval '1 day'),
      ('c','student-session','student',NOW() + interval '1 day')`);
    await applyMigration();
    await verifyDatamodel();

    const visible = (language: "ENGLISH" | "JAPANESE") => db.teacherProfile.count({ where: marketplaceTeacherWhere(null, language) });
    expect(await visible("ENGLISH")).toBe(1);
    expect(await visible("JAPANESE")).toBe(0);
    await db.teacherProfile.update({ where: { id: "profile" }, data: {
      teachingLanguages: ["ENGLISH", "JAPANESE"],
      lessonOfferings: { create: [
        { learningLanguage: "ENGLISH", durationMin: 60, rateYen: 5000 },
        { learningLanguage: "JAPANESE", durationMin: 60, rateYen: 5000 },
      ] },
      rosterEntries: { create: { studentId: "student" } },
    } });
    const roster = (language: "ENGLISH" | "JAPANESE") => getStudentRosterTeachers(db, "student", language);
    expect(await visible("JAPANESE")).toBe(1);
    expect(await roster("JAPANESE")).toHaveLength(1);
    const request = { action: "suspend", reason: "Payment issue", expectedEventId: null };
    await expect(changeAdminAccountAccess(db, "student", "teacher", request)).rejects.toMatchObject({ status: 403 });
    await expect(changeAdminAccountAccess(db, "admin", "admin", request)).rejects.toMatchObject({ status: 409 });

    const results = await Promise.all([
      changeAdminAccountAccess(db, "admin", "teacher", request),
      changeAdminAccountAccess(db, "admin", "teacher", request),
    ]);
    expect(results[0]).toEqual(results[1]);
    const [suspension] = await db.adminAccountAccessEvent.findMany({ where: { userId: "teacher" } });
    expect(suspension).toMatchObject({ actorId: "admin", fromStatus: "ACTIVE", toStatus: "SUSPENDED", reason: "Payment issue" });
    expect(await db.adminAccountAccessEvent.count()).toBe(1);
    expect(await db.session.findMany({ select: { sessionToken: true } })).toEqual([{ sessionToken: "student-session" }]);
    expect(await db.account.count({ where: { userId: "teacher", providerAccountId: "linked-google-id" } })).toBe(1);
    expect(await visible("ENGLISH")).toBe(0);
    expect(await visible("JAPANESE")).toBe(0);
    expect(await roster("ENGLISH")).toEqual([]);
    expect(await roster("JAPANESE")).toEqual([]);
    expect(await db.teacherRosterEntry.count()).toBe(1);

    await changeAdminAccountAccess(db, "admin", "teacher", { action: "reinstate", reason: "Resolved", expectedEventId: suspension.id });
    await expect(changeAdminAccountAccess(db, "admin", "teacher", request)).rejects.toMatchObject({ status: 409 });
    expect(await visible("ENGLISH")).toBe(1);
    expect(await visible("JAPANESE")).toBe(1);
    expect(await db.session.count({ where: { userId: "teacher" } })).toBe(0);

    await db.user.update({ where: { id: "student" }, data: { accountStatus: "HIDDEN" } });
    const hiddenSuspension = await changeAdminAccountAccess(db, "admin", "student", request);
    await expect(changeAdminAccountAccess(db, "admin", "student", {
      action: "reinstate", reason: "Resolved", expectedEventId: hiddenSuspension.eventId,
    })).resolves.toMatchObject({ accountStatus: "HIDDEN" });
  });
}, 30_000);
