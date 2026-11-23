import { readFile } from "node:fs/promises";
import { expect, test } from "vitest";
import { withIsolatedPostgres } from "../../test/isolated-postgres";
import { recordAchievementReview } from "@/lib/achievements/learner-calendar";
import { getStudyStreak, getStudyStreakPreference, saveStudyStreakPreference } from "@/lib/study/streak-service";
import { studyStreakPreferenceSchema } from "@/lib/study/streak-preference";

const enabled = process.env.MIRROR_TEST_DATABASE_URL;
const migration = "20261123010000_achievement_events";
const repairMigration = "20261123040000_repair_study_streak_schema";
const monthlyMigration = "20261123050000_study_streak_monthly_goal";

test("weekly goals are whole numbers from one through seven", () => {
  for (const weeklyGoal of [0, 1.5, 8, "2"]) {
    expect(studyStreakPreferenceSchema.safeParse({ mode: "WEEKLY", weeklyGoal }).success).toBe(false);
  }
  expect(studyStreakPreferenceSchema.parse({ mode: "WEEKLY", weeklyGoal: 7 })).toEqual({ mode: "WEEKLY", weeklyGoal: 7 });
});

test("monthly goals are whole numbers from one through 31", () => {
  const monthly = { mode: "MONTHLY", weeklyGoal: 3 };
  for (const monthlyGoal of [0, 1.5, 32, "20"]) {
    expect(studyStreakPreferenceSchema.safeParse({ ...monthly, monthlyGoal }).success).toBe(false);
  }
  expect(studyStreakPreferenceSchema.parse({ ...monthly, monthlyGoal: 20 })).toEqual({ ...monthly, monthlyGoal: 20 });
  expect(studyStreakPreferenceSchema.parse(monthly)).toEqual(monthly);
});

test.runIf(enabled)("monthly goals use distinct study dates, retain history across goal changes, and adapt to short months", async () => {
  await withIsolatedPostgres(monthlyMigration, async ({ db, client, applyMigration, verifyDatamodel }) => {
    const owner = { userId: "monthly-learner", learningLanguage: "ENGLISH" as const };
    const other = { ...owner, learningLanguage: "JAPANESE" as const };
    const get = (day: string) => getStudyStreak(db, owner, new Date(`${day}T03:00:00Z`));
    const add = (days: string[]) => client.query(`INSERT INTO "StudyStreakDay" ("userId", "learningLanguage", day, timezone)
      SELECT $1, 'ENGLISH', day, 'Asia/Tokyo' FROM unnest($2::date[]) AS day ON CONFLICT DO NOTHING`,
      [owner.userId, days]);
    await db.user.create({ data: { id: owner.userId } });
    await add(["2025-09-29", "2025-09-30", "2025-10-01", "2025-11-01", "2025-11-02", "2025-11-03"]);
    await client.query(`UPDATE "StudyStreak" SET mode = 'MONTHLY', "weeklyGoal" = 3 WHERE "userId" = $1`, [owner.userId]);
    await applyMigration();
    await verifyDatamodel();
    expect(await get("2025-11-03")).toMatchObject({ monthlyGoal: 1, count: 3, studiedThisMonth: 3 });

    await saveStudyStreakPreference(db, owner, { mode: "MONTHLY", weeklyGoal: 3, monthlyGoal: 2 });
    expect(await get("2025-11-03")).toMatchObject({ monthlyGoal: 2, count: 1, studiedThisMonth: 3 });
    await add(["2025-10-02", "2025-11-03"]);
    expect(await get("2025-11-03")).toMatchObject({ count: 3, studiedThisMonth: 3 });
    expect(await get("2025-12-01")).toMatchObject({ count: 3, studiedThisMonth: 0 });
    await add(["2025-12-01"]);
    expect(await get("2025-12-01")).toMatchObject({ count: 3, studiedThisMonth: 1 });
    expect(await get("2026-01-01")).toMatchObject({ count: 0, studiedThisMonth: 0 });
    await saveStudyStreakPreference(db, owner, { mode: "WEEKLY", weeklyGoal: 3 });
    expect(await getStudyStreakPreference(db, owner)).toMatchObject({ monthlyGoal: 2 });
    expect(await getStudyStreakPreference(db, other)).toMatchObject({ monthlyGoal: 1 });

    await saveStudyStreakPreference(db, owner, { mode: "MONTHLY", weeklyGoal: 3, monthlyGoal: 31 });
    await add(Array.from({ length: 28 }, (_, i) => `2026-02-${String(i + 1).padStart(2, "0")}`));
    expect(await get("2026-02-28")).toMatchObject({ monthlyGoal: 31, count: 1, studiedThisMonth: 28 });
    expect(await get("2026-03-01")).toMatchObject({ monthlyGoal: 31, count: 1, studiedThisMonth: 0 });
  });
}, 30_000);

test("accepts a boolean visibility preference and preserves older settings requests", () => {
  const weekly = { mode: "WEEKLY", weeklyGoal: 3 };
  expect(studyStreakPreferenceSchema.parse({ ...weekly, enabled: false })).toEqual({ ...weekly, enabled: false });
  expect(studyStreakPreferenceSchema.safeParse({ ...weekly, enabled: "false" }).success).toBe(false);
  expect(studyStreakPreferenceSchema.parse(weekly)).toEqual(weekly);
});

test.runIf(enabled)("repairs a recorded early streak schema and preserves settings while rebuilding lesson and card history", async () => {
  await withIsolatedPostgres(repairMigration, async ({ db, client, applyMigration, verifyDatamodel }) => {
    await client.query(`
      DROP TRIGGER study_streak_on_completed_lesson ON "AchievementWork";
      DROP TRIGGER study_streak_on_new_day ON "StudyStreakDay";
      DROP FUNCTION study_streak_on_completed_lesson();
      DROP FUNCTION study_streak_on_new_day();
      DROP FUNCTION study_calendar_timezone(text, "LearningLanguage");
      DROP VIEW eligible_learning_lesson;
      DROP TABLE "StudyStreakDay";
      CREATE OR REPLACE FUNCTION study_streak_on_qualification() RETURNS trigger LANGUAGE plpgsql AS $$
      BEGIN
        RETURN NULL;
      END;
      $$;
    `);
    const owner = { userId: "legacy-student", learningLanguage: "JAPANESE" as const };
    await db.user.createMany({ data: [{ id: owner.userId }, { id: "legacy-teacher", role: "TEACHER" }] });
    await db.teacherProfile.create({ data: { id: "legacy-profile", userId: "legacy-teacher" } });
    await db.lessonProduct.create({ data: { id: "legacy-product", tier: "STANDARD", durationMin: 60, nameEn: "Lesson", nameJa: "授業" } });
    await client.query(`INSERT INTO "StudyStreak" ("userId", "learningLanguage", enabled, mode, "weeklyGoal", daily, "lastStudyDay")
      VALUES ($1, $2::"LearningLanguage", false, 'WEEKLY', 2, 5, DATE '2020-11-18')`, [owner.userId, owner.learningLanguage]);
    const cards = ["a", "b", "c", "d", "e"];
    await db.learningAchievementStudyDay.create({
      data: { ...owner, day: new Date("2020-11-16"), cardIds: cards, timezone: "Asia/Tokyo" },
    });
    await db.booking.createMany({ data: [
      { id: "legacy-completed", status: "COMPLETED", startsAt: new Date("2020-11-17T01:00:00Z"), endsAt: new Date("2020-11-17T02:00:00Z") },
      { id: "legacy-cancelled", status: "CANCELLED", startsAt: new Date("2020-11-18T01:00:00Z"), endsAt: new Date("2020-11-18T02:00:00Z") },
    ].map(booking => ({ ...booking, status: booking.status as "COMPLETED" | "CANCELLED", learningLanguage: owner.learningLanguage,
      studentId: owner.userId, teacherId: "legacy-profile", lessonProductId: "legacy-product" })) });

    await applyMigration();
    await verifyDatamodel();
    expect(await getStudyStreakPreference(db, owner)).toEqual({ enabled: false, mode: "WEEKLY", weeklyGoal: 2, monthlyGoal: 1 });
    await saveStudyStreakPreference(db, owner, { enabled: true, mode: "DAILY", weeklyGoal: 2 });
    expect(await getStudyStreak(db, owner, new Date("2020-11-17T03:00:00Z"))).toMatchObject({
      count: 2, days: [true, true, false, false, false, false, false],
    });
    for (const card of cards) await recordAchievementReview(db, owner, card, new Date("2020-11-18T03:00:00Z"));
    expect(await getStudyStreak(db, owner, new Date("2020-11-18T04:00:00Z"))).toMatchObject({
      count: 3, days: [true, true, true, false, false, false, false],
    });
    expect(await getStudyStreak(db, { ...owner, learningLanguage: "ENGLISH" }, new Date("2020-11-18T04:00:00Z"))).toMatchObject({ count: 0 });
  });
}, 30_000);

test.runIf(enabled)("the corrective migration leaves an already current streak summary untouched", async () => {
  await withIsolatedPostgres(repairMigration, async ({ db, client }) => {
    const owner = { userId: "current-learner", learningLanguage: "ENGLISH" as const };
    await db.user.create({ data: { id: owner.userId } });
    await db.learningAchievementStudyDay.create({
      data: { ...owner, day: new Date("2020-11-16"), cardIds: ["a", "b", "c", "d", "e"], timezone: "Asia/Tokyo" },
    });
    const before = await client.query('SELECT xmin::text, daily FROM "StudyStreak"');
    expect(before.rows).toMatchObject([{ daily: 1 }]);
    await client.query(await readFile(`prisma/migrations/${repairMigration}/migration.sql`, "utf8"));
    expect((await client.query('SELECT xmin::text, daily FROM "StudyStreak"')).rows).toEqual(before.rows);
  });
}, 30_000);

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
    await saveStudyStreakPreference(db, learner, { enabled: false, mode: "WEEKLY", weeklyGoal: 2 });
    await study("2026-11-25");
    expect(await get("2026-11-25")).toBeNull();
    await saveStudyStreakPreference(db, learner, { mode: "WEEKLY", weeklyGoal: 2 });
    expect(await get("2026-11-25")).toBeNull();
    expect(await getStudyStreak(db, japanese, date("2026-11-25"))).toMatchObject({ enabled: true, mode: "DAILY" });
    await saveStudyStreakPreference(db, learner, { enabled: true, mode: "WEEKLY", weeklyGoal: 2 });
    expect(await get("2026-11-25")).toMatchObject({ mode: "WEEKLY", count: 3, studiedThisWeek: 3 });
    await saveStudyStreakPreference(db, learner, { mode: "MONTHLY", weeklyGoal: 2 });
    expect(await get("2026-12-01")).toMatchObject({ mode: "MONTHLY", count: 2, studiedThisMonth: 0 });
    await study("2026-12-01");
    expect(await get("2026-12-01")).toMatchObject({ mode: "MONTHLY", count: 3, studiedThisMonth: 1 });
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
      enabled: true, count: 3, days: [true, true, true, false, false, false, false],
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
    expect(await getStudyStreak(db, owner, december)).toMatchObject({ count: 2, studiedThisMonth: 1 });
  });
}, 30_000);
