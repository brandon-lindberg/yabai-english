import { expect, test } from "vitest";
import { createTeacherInvitation, redeemTeacherInvitation, revokeTeacherInvitation } from "@/lib/teacher-invitations";
import { withIsolatedPostgres } from "../../test/isolated-postgres";

test.runIf(process.env.MIRROR_TEST_DATABASE_URL)("a teacher link is transferable before use and can grant access to only one active Google account", async () => {
  await withIsolatedPostgres("20261106020000_teacher_invitations", async ({ client, db, applyMigration, verifyDatamodel }) => {
    await client.query(`INSERT INTO "User" (id,email,role,"accountStatus","updatedAt") VALUES
      ('admin','admin@example.test','SUPER_ADMIN','ACTIVE',NOW()),
      ('student','student@example.test','STUDENT','ACTIVE',NOW()),
      ('other','other@example.test','STUDENT','ACTIVE',NOW()),
      ('suspended','suspended@example.test','STUDENT','SUSPENDED',NOW()),
      ('unlinked','unlinked@example.test','STUDENT','ACTIVE',NOW())`);
    await client.query(`INSERT INTO "StudentProfile" (id,"userId","placedLevel") VALUES ('profile','student','ADVANCED')`);
    await client.query(`INSERT INTO "Account" (id,"userId",type,provider,"providerAccountId") VALUES
      ('g1','student','oidc','google','google-1'), ('g2','other','oidc','google','google-2'), ('g3','suspended','oidc','google','google-3')`);
    await client.query(`INSERT INTO "Session" (id,"sessionToken","userId",expires) VALUES
      ('s1','student-session','student',NOW()+interval '1 day'), ('old','old-session','student',NOW()+interval '1 day'),
      ('s2','other-session','other',NOW()+interval '1 day'), ('s3','suspended-session','suspended',NOW()+interval '1 day'),
      ('s4','unlinked-session','unlinked',NOW()+interval '1 day')`);
    await applyMigration();
    await verifyDatamodel();

    const input = { teachingLanguages: ["JAPANESE"], label: "LINE" };
    await expect(createTeacherInvitation(db, "student", input)).rejects.toMatchObject({ status: 403 });
    await expect(createTeacherInvitation(db, "admin", { ...input, teachingLanguages: [] })).rejects.toMatchObject({ status: 400 });
    const invitation = await createTeacherInvitation(db, "admin", input);
    const stored = await db.teacherInvitation.findUniqueOrThrow({ where: { id: invitation.id } });
    expect(stored.tokenHash).not.toBe(invitation.token);
    expect(stored.expiresAt.getTime() - stored.createdAt.getTime()).toBe(7 * 24 * 60 * 60 * 1000);
    expect(await db.user.count({ where: { role: "TEACHER" } })).toBe(0);
    await expect(redeemTeacherInvitation(db, invitation.token, "suspended", "suspended-session")).resolves.toBe("ineligible");
    await expect(redeemTeacherInvitation(db, invitation.token, "unlinked", "unlinked-session")).resolves.toBe("ineligible");
    await expect(redeemTeacherInvitation(db, invitation.token, "student", "other-session")).resolves.toBe("ineligible");
    const outcomes = await Promise.all([
      redeemTeacherInvitation(db, invitation.token, "student", "student-session"),
      redeemTeacherInvitation(db, invitation.token, "student", "student-session"),
      redeemTeacherInvitation(db, invitation.token, "other", "other-session"),
    ]);
    expect(outcomes.sort()).toEqual(["accepted", "unavailable", "unavailable"]);
    const teacher = await db.teacherProfile.findFirstOrThrow({ include: { classLevels: true } });
    expect(teacher.teachingLanguages).toEqual(["JAPANESE"]);
    expect(teacher.classLevels).toHaveLength(3);
    expect(await db.studentProfile.findUnique({ where: { userId: "student" } })).toMatchObject({ placedLevel: "ADVANCED" });
    if (teacher.userId === "student") {
      expect(await db.session.count({ where: { userId: "student", sessionToken: "student-session" } })).toBe(1);
      expect(await db.session.count({ where: { sessionToken: "old-session" } })).toBe(0);
    }
    expect(await db.teacherInvitation.findUnique({ where: { id: invitation.id } })).toMatchObject({ redeemedById: teacher.userId });

    const revoked = await createTeacherInvitation(db, "admin", input);
    await expect(revokeTeacherInvitation(db, "admin", revoked.id)).resolves.toBe(true);
    const loser = teacher.userId === "student" ? "other" : "student";
    await expect(redeemTeacherInvitation(db, revoked.token, loser, `${loser}-session`)).resolves.toBe("unavailable");
    const expired = await createTeacherInvitation(db, "admin", input);
    await db.teacherInvitation.update({ where: { id: expired.id }, data: { expiresAt: new Date(0) } });
    await expect(redeemTeacherInvitation(db, expired.token, loser, `${loser}-session`)).resolves.toBe("unavailable");
  });
}, 30_000);
