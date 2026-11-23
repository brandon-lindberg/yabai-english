import { expect, test } from "vitest";
import { withIsolatedPostgres } from "../../test/isolated-postgres";
import { recordAchievementReview } from "@/lib/achievements/learner-calendar";
import { getStudyStreak, saveStudyStreakPreference } from "@/lib/study/streak-service";
import { studyStreakPreferenceSchema } from "@/lib/study/streak-preference";

const enabled = process.env.MIRROR_TEST_DATABASE_URL;
const migration = "20261123010000_achievement_events";

test("weekly goals are whole numbers from one through seven", () => {
  for (const weeklyGoal of [0, 1.5, 8, "2"]) {
    expect(studyStreakPreferenceSchema.safeParse({ mode: "WEEKLY", weeklyGoal }).success).toBe(false);
  }
  expect(studyStreakPreferenceSchema.parse({ mode: "WEEKLY", weeklyGoal: 7 })).toEqual({ mode: "WEEKLY", weeklyGoal: 7 });
});

test.runIf(enabled)("preserves previous study days, handles late dates, and derives each cadence without sharing progress across subjects", async () => {
  await withIsolatedPostgres(migration, async ({ db, client, applyMigration }) => {
    await applyMigration();
    await db.user.create({ data: { id: "learner" } });
    await db.studentProfile.create({ data: { userId: "learner", timezone: "Asia/Tokyo" } });
    const learner = { userId: "learner", learningLanguage: "ENGLISH" as const };
    const japanese = { ...learner, learningLanguage: "JAPANESE" as const };
    const date = (day: string) => new Date(day + "T03:00:00Z");
    const get = (day: string) => getStudyStreak(db, learner, date(day));
    const study = async (day: string, numberOfCards = 5) => {
      await db.$transaction(async tx => {
        for (let card = 0; card < numberOfCards; card++) await recordAchievementReview(tx, learner, String(card), date(day));
      });
    };
    expect(await get("2026-11-23")).toMatchObject({ mode: "DAILY", weeklyGoal: 1, count: 0 });
    for (const day of ["2026-10-26", "2026-11-02", "2026-11-09", "2026-11-10", "2026-11-16", "2026-11-17", "2026-11-19"]) await study(day);
    await study("2026-11-18"); // A delayed previous-day write also joins the run.
    await study("2026-11-20", 4);
    expect(await get("2026-11-20")).toMatchObject({
      mode: "DAILY", count: 4,
      days: [true, true, true, true, false, false, false],
    });
    expect(await get("2026-11-21")).toMatchObject({ mode: "DAILY", count: 0 });
    await saveStudyStreakPreference(db, learner, { mode: "WEEKLY", weeklyGoal: 2 });
    expect(await get("2026-11-23")).toMatchObject({ mode: "WEEKLY", count: 2, studiedThisWeek: 0 });
    expect(await get("2026-11-30")).toMatchObject({ mode: "WEEKLY", count: 0 });
    await study("2026-11-23");
    expect(await get("2026-11-23")).toMatchObject({ mode: "WEEKLY", count: 2, studiedThisWeek: 1 });
    await study("2026-11-24");
    expect(await get("2026-11-24")).toMatchObject({ mode: "WEEKLY", count: 3, studiedThisWeek: 2 });
    await saveStudyStreakPreference(db, learner, { mode: "MONTHLY", weeklyGoal: 2 });
    expect(await get("2026-12-01")).toMatchObject({ mode: "MONTHLY", count: 2, studiedThisMonth: false });
    await study("2026-12-01");
    expect(await get("2026-12-01")).toMatchObject({ mode: "MONTHLY", count: 3, studiedThisMonth: true });
    expect(await get("2027-02-01")).toMatchObject({ mode: "MONTHLY", count: 0 });
    expect(await getStudyStreak(db, japanese, date("2026-12-01"))).toMatchObject({ mode: "DAILY", count: 0 });
    const rows = await client.query('SELECT count(*)::int AS total FROM "StudyStreak"');
    expect(rows.rows[0].total).toBe(1);
  });
}, 30_000);

test.runIf(enabled)("the migration combines existing graded dates and completed lessons", async () => {
  await withIsolatedPostgres("20261123020000_study_streak_preferences", async ({ db, applyMigration, verifyDatamodel }) => {
    await db.user.createMany({ data: [{ id: "returning" }, { id: "previous-teacher", role: "TEACHER" }] });
    await db.teacherProfile.create({ data: { id: "previous-profile", userId: "previous-teacher" } });
    await db.lessonProduct.create({ data: { id: "previous-lesson", tier: "STANDARD", durationMin: 60, nameEn: "Lesson", nameJa: "授業" } });
    const owner = { userId: "returning", learningLanguage: "ENGLISH" as const };
    for (const [day, size] of [["2020-11-16", 5], ["2020-11-17", 5], ["2020-11-18", 4]] as const) {
      await db.learningAchievementStudyDay.create({
        data: { ...owner, day: new Date(day), timezone: "Asia/Tokyo", cardIds: Array.from({ length: size }, (_, i) => String(i)) },
      });
    }
    await db.booking.createMany({ data: [
      { id: "old-lesson", status: "COMPLETED", startsAt: new Date("2020-11-18T01:00:00Z"), endsAt: new Date("2020-11-18T02:00:00Z") },
      { id: "old-cancelled", status: "CANCELLED", startsAt: new Date("2020-11-19T01:00:00Z"), endsAt: new Date("2020-11-19T02:00:00Z") },
    ].map(booking => ({ ...booking, status: booking.status as "COMPLETED" | "CANCELLED",
      teacherId: "previous-profile", studentId: owner.userId, lessonProductId: "previous-lesson" })) });
    await applyMigration();
    await verifyDatamodel();
    expect(await getStudyStreak(db, owner, new Date("2020-11-19T03:00:00Z"))).toMatchObject({
      count: 3, days: [true, true, true, false, false, false, false],
    });
  });
}, 30_000);

test.runIf(enabled)("eligible completed lessons extend all streak modes on their end date without double credit", async () => {
  await withIsolatedPostgres(migration, async ({ db, applyMigration }) => {
    const { drainAchievementWork } = await import("@/lib/achievements/achievement-work");
    await applyMigration();
    await db.user.createMany({ data: [{ id: "student" }, { id: "teacher", role: "TEACHER" }] });
    await db.studentProfile.create({ data: { userId: "student", timezone: "Asia/Tokyo" } });
    await db.teacherProfile.create({ data: { id: "teacher-profile", userId: "teacher" } });
    await db.lessonProduct.create({ data: { id: "lesson", tier: "STANDARD", durationMin: 60, nameEn: "Lesson", nameJa: "授業" } });
    const owner = { userId: "student", learningLanguage: "ENGLISH" as const };
    const booking = async (id: string, timestamp: string, status: "CONFIRMED" | "COMPLETED" | "CANCELLED" | "PENDING_PAYMENT", learningLanguage = owner.learningLanguage as "ENGLISH" | "JAPANESE") => {
      const endsAt = new Date(timestamp);
      return db.booking.create({ data: {
        id, teacherId: "teacher-profile", studentId: owner.userId, lessonProductId: "lesson",
        learningLanguage, status, startsAt: new Date(endsAt.getTime() - 3_600_000), endsAt,
      } });
    };
    // These two Monday lessons have the same Tokyo date. Tuesday also has a full review set.
    await booking("monday", "2026-11-15T15:00:00Z", "CONFIRMED");
    await booking("monday-second", "2026-11-16T10:00:00Z", "COMPLETED");
    await booking("tuesday", "2026-11-17T01:00:00Z", "COMPLETED");
    await booking("cancelled", "2026-11-18T01:00:00Z", "CANCELLED");
    await booking("unpaid", "2026-11-18T02:00:00Z", "PENDING_PAYMENT");
    await booking("wrong-language", "2026-11-18T03:00:00Z", "COMPLETED", "JAPANESE");
    const future = await booking("rescheduled", "2026-11-18T04:00:00Z", "CONFIRMED");
    await db.booking.update({ where: { id: future.id }, data: { endsAt: new Date("2026-12-01T04:00:00Z") } });
    for (const card of ["a", "b", "c", "d", "e"]) await recordAchievementReview(db, owner, card, new Date("2026-11-17T03:00:00Z"));
    const wednesday = new Date("2026-11-18T05:00:00Z");
    await drainAchievementWork(db, wednesday, true);
    await drainAchievementWork(db, wednesday, true);
    expect(await getStudyStreak(db, owner, wednesday)).toMatchObject({ count: 2, studiedThisWeek: 2,
      days: [true, true, false, false, false, false, false] });
    const japanese = { ...owner, learningLanguage: "JAPANESE" as const };
    expect(await getStudyStreak(db, japanese, wednesday)).toMatchObject({ count: 1, days: [false, false, true, false, false, false, false] });
    await saveStudyStreakPreference(db, owner, { mode: "WEEKLY", weeklyGoal: 2 });
    expect(await getStudyStreak(db, owner, wednesday)).toMatchObject({ count: 1, studiedThisWeek: 2 });

    await saveStudyStreakPreference(db, owner, { mode: "MONTHLY", weeklyGoal: 2 });
    const december = new Date("2026-12-01T05:00:00Z");
    await drainAchievementWork(db, december, true);
    expect(await getStudyStreak(db, owner, december)).toMatchObject({ count: 2, studiedThisMonth: true });
  });
}, 30_000);
