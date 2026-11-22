import { expect, test } from "vitest";
import type { AchievementScope } from "@/generated/prisma/client";
import { getTeacherGallery } from "@/lib/achievements/teacher-gallery";
import { withIsolatedPostgres } from "../../test/isolated-postgres";

test.runIf(process.env.MIRROR_TEST_DATABASE_URL)("teacher awards are independent, count a group once, and populate cohort rarity", async () => {
  await withIsolatedPostgres("20261122000000_teaching_achievement_collections", async ({ db, applyMigration, verifyDatamodel }) => {
    await applyMigration();
    await verifyDatamodel();
    await db.user.createMany({ data: [
      { id: "teacher", role: "TEACHER" },
      { id: "other-teacher", role: "TEACHER" },
      { id: "admin", role: "SUPER_ADMIN" },
      { id: "learner-en", learningLanguage: "ENGLISH" },
      { id: "learner-ja", learningLanguage: "JAPANESE" },
      { id: "unawarded-ja", learningLanguage: "JAPANESE" },
    ] });
    await db.teacherProfile.create({
      data: { id: "profile", userId: "teacher", displayName: "Teacher", bio: "Conversation practice", instructionLanguages: ["EN", "JA"] },
    });
    await db.lessonProduct.create({ data: { id: "lesson", tier: "STANDARD", durationMin: 60, nameEn: "Class", nameJa: "授業" } });
    const endsAt = new Date("2026-11-15T15:15:00Z");
    const startsAt = new Date("2026-11-15T14:15:00Z");
    const now = new Date("2026-11-18T03:00:00Z");
    const group = await db.groupLessonSession.create({ data: { teacherId: "profile", startsAt, endsAt, capacity: 5 } });
    const lesson = { teacherId: "profile", lessonProductId: "lesson", startsAt, endsAt };
    await db.booking.createMany({ data: [
      { ...lesson, id: "group-en", studentId: "learner-en", status: "CONFIRMED", groupLessonSessionId: group.id },
      { ...lesson, id: "group-ja", studentId: "learner-ja", status: "COMPLETED", groupLessonSessionId: group.id, learningLanguage: "JAPANESE", completionNotesMd: " \n\t " },
      { ...lesson, id: "cancelled", studentId: "learner-en", status: "CANCELLED", cancelledFromStatus: "CONFIRMED", completionNotesMd: "Cancelled class." },
      { ...lesson, id: "unpaid", studentId: "learner-ja", status: "PENDING_PAYMENT" },
      { ...lesson, id: "ongoing", studentId: "learner-ja", status: "CONFIRMED", endsAt: new Date("2026-11-19T15:15:00Z") },
    ] });
    const read = () => getTeacherGallery(db, "teacher", now);
    const [a, b] = await Promise.all([read(), read()]);
    for (const cards of [a, b]) {
      expect(cards.filter(card => card.awardedAt).map(card => card.id)).toEqual(["teach-profile", "teach-booked", "teach-0001"]);
      expect(cards.find(card => card.id === "teach-0005")?.progress.value).toBe(1);
      expect(cards.some(card => card.hidden)).toBe(false);
    }
    expect(await db.teachingAchievementAward.count()).toBe(3);
    expect(await db.learningAchievementAward.count()).toBe(0);

    await db.groupLessonSession.delete({ where: { id: group.id } });
    expect((await read()).find(card => card.id === "teach-0005")?.progress.value).toBe(1);
    const thread = await db.chatThread.create({ data: { studentId: "learner-ja", teacherId: "teacher" } });
    await db.chatMessage.createMany({ data: [
      { threadId: thread.id, senderId: "teacher", recipientId: "learner-ja", body: "Hello", createdAt: startsAt },
      { threadId: thread.id, senderId: "learner-ja", recipientId: "teacher", body: "Hello", createdAt: endsAt },
    ] });
    await db.booking.create({ data: { ...lesson, id: "repeat", studentId: "learner-ja", status: "CONFIRMED", createdAt: startsAt,
      startsAt: new Date("2026-11-15T15:20:00Z"), endsAt: new Date("2026-11-15T16:20:00Z") } });
    const repeated = await read();
    expect(repeated.find(card => card.id === "teach-0005")?.progress.value).toBe(2);
    expect(repeated.find(card => card.id === "teach-return")?.awardedAt).toBeInstanceOf(Date);
    // Sunday and Monday in Tokyo are different weeks, even on the same UTC date.
    expect(repeated.some(card => card.hidden)).toBe(false);
    await db.booking.create({ data: { ...lesson, id: "notes", studentId: "learner-ja", status: "CONFIRMED",
      startsAt: new Date("2026-11-16T15:20:00Z"), endsAt: new Date("2026-11-16T16:20:00Z"),
      completionNotesMd: "Practiced introductions." } });
    await db.chatMessage.create({ data: { threadId: thread.id, senderId: "teacher", recipientId: "learner-ja",
      body: "See you in class.", createdAt: new Date("2026-11-17T03:00:00Z") } });
    const earned = await read();
    expect(earned.filter(card => card.hidden).map(card => card.id)).toEqual([
      "teach-hidden-notes", "teach-hidden-reply", "teach-hidden-second-bell",
    ]);
    await db.booking.update({ where: { id: "notes" }, data: { completionNotesMd: null } });
    expect((await read()).filter(card => card.hidden).map(card => card.awardedAt)).toEqual(
      earned.filter(card => card.hidden).map(card => card.awardedAt),
    );
    expect((await getTeacherGallery(db, "other-teacher", now)).every(card => card.awardedAt === null)).toBe(true);

    await db.learningAchievementAward.createMany({ data: [
      { userId: "learner-en", learningLanguage: "ENGLISH", achievementId: "cards-0001" },
      { userId: "learner-ja", learningLanguage: "JAPANESE", achievementId: "cards-0001" },
      { userId: "learner-en", learningLanguage: "JAPANESE", achievementId: "cards-0001" },
    ] });
    const scopes: AchievementScope[] = ["TEACHING", "LEARN_ENGLISH", "LEARN_JAPANESE"];
    for (const scope of scopes) await db.$queryRaw`SELECT refresh_achievement_unlock_snapshot(${scope}::"AchievementScope")`;
    const snapshots = await db.achievementUnlockSnapshot.findMany({ orderBy: { scope: "asc" } });
    expect(snapshots.map(({ scope, eligibleUsers }) => [scope, eligibleUsers])).toEqual([
      ["LEARN_ENGLISH", 1], ["LEARN_JAPANESE", 2], ["TEACHING", 2],
    ]);
    expect(snapshots[0].awardedCounts).toEqual({ "cards-0001": 1 });
    expect(snapshots[1].awardedCounts).toEqual({ "cards-0001": 1 });
    expect(snapshots[2].awardedCounts).toEqual({
      "teach-profile": 1, "teach-booked": 1, "teach-0001": 1, "teach-return": 1,
      "teach-hidden-notes": 1, "teach-hidden-reply": 1, "teach-hidden-second-bell": 1,
    });
  });
}, 30_000);
