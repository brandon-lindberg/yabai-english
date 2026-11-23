import { expect, test } from "vitest";
import { withIsolatedPostgres } from "../../test/isolated-postgres";
import { drainAchievementWork, readRecentAwardNotices } from "@/lib/achievements/achievement-work";
import { recordAchievementReview } from "@/lib/achievements/learner-calendar";
import { subscribeToUserRealtime, type RealtimeEvent } from "@/lib/realtime-bus";

const enabled = process.env.MIRROR_TEST_DATABASE_URL;
const migration = "20261123010000_achievement_events";

test.runIf(enabled)("fifth distinct graded card queues the study streak, and one batched event reveals the award", async () => {
  await withIsolatedPostgres(migration, async ({ db, applyMigration }) => {
    await applyMigration();
    await db.user.create({ data: { id: "learner" } });
    await db.studentProfile.create({ data: { userId: "learner", timezone: "invalid legacy timezone" } });
    const messages: RealtimeEvent[] = [];
    const unsubscribe = subscribeToUserRealtime("learner", event => messages.push(event));
    const owner = { userId: "learner", learningLanguage: "JAPANESE" as const };
    try {
      for (const day of ["2026-09-03", "2026-09-04", "2026-09-05"]) {
        const now = new Date(day + "T02:00:00Z");
        for (const card of ["a", "b", "c", "d", "d"]) {
          expect(await recordAchievementReview(db, owner, card, now)).toBe(false);
        }
        expect(await recordAchievementReview(db, owner, "e", now)).toBe(true);
        expect(await recordAchievementReview(db, owner, "f", now)).toBe(false);
        await drainAchievementWork(db, now, true);
      }
      expect(messages).toEqual([{ event: "achievements:unlocked", payload: [expect.objectContaining({ id: "study-streak-0003", scope: "LEARN_JAPANESE" })] }]);
      expect(await db.learningAchievementAward.count({ where: { learningLanguage: "ENGLISH" } })).toBe(0);
      expect((await readRecentAwardNotices(db, "learner", "LEARN_JAPANESE")).map(card => card.id)).toEqual(["study-streak-0003"]);
      expect(await readRecentAwardNotices(db, "learner", "LEARN_ENGLISH")).toEqual([]);
      expect(await db.achievementWork.count()).toBe(0);
    } finally { unsubscribe(); }
  });
}, 30_000);

test.runIf(enabled)("bookings fire for participants after the retained end time, with cancellations and group seats handled once", async () => {
  await withIsolatedPostgres(migration, async ({ db, applyMigration, verifyDatamodel }) => {
    await applyMigration();
    await verifyDatamodel();
    await db.user.createMany({ data: [{ id: "teacher", role: "TEACHER" }, { id: "learner-one" }, { id: "learner-two" }] });
    await db.teacherProfile.create({ data: { id: "profile", userId: "teacher", displayName: "Teacher", bio: "Japanese practice", instructionLanguages: ["JA"] } });
    await db.lessonProduct.create({ data: { id: "product", tier: "STANDARD", durationMin: 60, nameEn: "Class", nameJa: "授業" } });
    const now = new Date(Date.now() + 5_000);
    const startsAt = new Date(now.getTime() + 86400_000);
    const endsAt = new Date(startsAt.getTime() + 3600_000);
    const session = await db.groupLessonSession.create({ data: { teacherId: "profile", startsAt, endsAt, capacity: 2 } });
    const lesson = { teacherId: "profile", lessonProductId: "product", startsAt, endsAt, groupLessonSessionId: session.id, status: "CONFIRMED" as const };
    await db.booking.createMany({ data: [
      { ...lesson, id: "seat-one", studentId: "learner-one", learningLanguage: "JAPANESE" },
      { ...lesson, id: "seat-two", studentId: "learner-two", learningLanguage: "ENGLISH" },
    ] });
    const events: RealtimeEvent[] = [];
    const cleanups = ["teacher", "learner-one", "learner-two"].map(user => subscribeToUserRealtime(user, event => events.push(event)));
    try {
      await drainAchievementWork(db, now, true);
      expect(events).toEqual([{ event: "achievements:unlocked", payload: expect.arrayContaining([
        expect.objectContaining({ id: "teach-profile", scope: "TEACHING" }),
        expect.objectContaining({ id: "teach-booked", scope: "TEACHING" }),
      ]) }]);
      await db.booking.update({ where: { id: "seat-two" }, data: { status: "CANCELLED", cancelledFromStatus: "CONFIRMED" } });
      await drainAchievementWork(db, endsAt, true);
      expect(events.flatMap(event => event.event === "achievements:unlocked" ? event.payload.map(badge => badge.id) : [])).toEqual(
        expect.arrayContaining(["teach-0001", "lessons-0001"]),
      );
      expect(await db.learningAchievementAward.findMany()).toMatchObject([{ userId: "learner-one", learningLanguage: "JAPANESE", achievementId: "lessons-0001" }]);
      expect(await db.teachingAchievementAward.count({ where: { achievementId: "teach-0001" } })).toBe(1);
      await drainAchievementWork(db, endsAt, true);
      expect(await db.achievementWork.count()).toBe(0);
    } finally { for (const cleanup of cleanups) cleanup(); }
  });
}, 30_000);

test.runIf(enabled)("records all 39 learner badges in each independent subject and all 11 teaching badges", async () => {
  await withIsolatedPostgres(migration, async ({ db, applyMigration }) => {
    await applyMigration();
    const { getLearnerGallery } = await import("@/lib/achievements/learner-gallery");
    const { getTeacherGallery } = await import("@/lib/achievements/teacher-gallery");
    const { learnerBadges } = await import("@/lib/achievements/gallery");
    const { teachingMilestones } = await import("@/lib/achievements/teaching-catalogue");
    const { xpToAdvanceFromRank } = await import("@/lib/study/rpg-xp");
    await db.user.createMany({ data: [{ id: "teacher", role: "TEACHER" }, { id: "learner" }, { id: "observer" }] });
    await db.teacherProfile.create({ data: { id: "profile", userId: "teacher", displayName: "Teacher", bio: "Conversation", instructionLanguages: ["EN", "JA"] } });
    await db.lessonProduct.create({ data: { id: "product", tier: "STANDARD", durationMin: 60, nameEn: "Class", nameJa: "授業" } });
    const date = (year: number, month: number, day: number) => new Date(Date.UTC(year, month - 1, day, 1));
    await db.achievementTracking.update({ where: { id: 1 }, data: { startedAt: date(2023,1,1) } });
    const studyDays = [date(2023,1,1), date(2023,1,5), date(2023,1,9), date(2023,1,13), date(2023,4,16),
      ...Array.from({ length: 250 }, (_, i) => date(2024,1,1 + i)),
      ...Array.from({ length: 12 }, (_, i) => date(2025,1 + i,1))];
    let xp = 0;
    for (let rank = 1; rank < 25; rank++) xp += xpToAdvanceFromRank(rank);
    for (const language of ["ENGLISH", "JAPANESE"] as const) {
      await db.studyTrack.create({ data: {
        id: language, slug: language.toLowerCase() + "-flashcards", titleEn: language, titleJa: language, learningLanguage: language,
        levels: { create: { id: language + "-level", levelCode: language === "ENGLISH" ? "BEGINNER_1" : "N5", titleEn: "First", titleJa: "初級",
          decks: { create: { id: language + "-deck", titleEn: "First", titleJa: "初級" } } } },
      } });
      const cards = Array.from({ length: 1000 }, (_, i) => ({ id: language + "-" + i, deckId: language + "-deck", frontJa: "猫", backEn: "cat" }));
      await db.studyCard.createMany({ data: cards });
      await db.userStudyCardState.createMany({ data: cards.map((card, i) => ({ userId: "learner", cardId: card.id,
        correctCount: i < 250 ? 8 : 1, streakCorrect: i < 250 ? 8 : 1 })) });
      await db.userStudyLevelProgress.create({ data: { userId: "learner", levelId: language + "-level", xp, completedAt: date(2025,1,1),
        ...(language === "ENGLISH" ? { assessmentPassedAt: date(2025,1,1) } : {}) } });
      await db.learningAchievementStudyDay.createMany({ data: studyDays.map(day => ({
        userId: "learner", learningLanguage: language, day, timezone: "Asia/Tokyo", cardIds: ["a", "b", "c", "d", "e"],
      })) });
      await db.booking.createMany({ data: Array.from({ length: 100 }, (_, i) => {
        const endsAt = date(2024,1,1 + i * 7 + Number(i > 0)); // first two classes fall on distinct local Mondays/Tuesday weeks
        return { id: language + "-" + i, teacherId: "profile", studentId: "learner", lessonProductId: "product", learningLanguage: language,
          startsAt: new Date(endsAt.getTime() - 3_600_000), endsAt, status: "CONFIRMED" as const, createdAt: date(2023,1,1),
          ...(i === 0 ? { completionNotesMd: "A real note." } : {}) };
      }) });
      const collection = await getLearnerGallery(db, "learner", language);
      expect(collection.filter(card => card.awardedAt).map(card => card.id).sort(), language).toEqual(learnerBadges.map(card => card.id).sort());
    }
    await db.booking.create({ data: { id: "second-bell", teacherId: "profile", studentId: "learner", lessonProductId: "product",
      startsAt: date(2024,1,3), endsAt: new Date(date(2024,1,3).getTime() + 3600_000), status: "CONFIRMED" } });
    const thread = await db.chatThread.create({ data: { studentId: "learner", teacherId: "teacher" } });
    await db.chatMessage.createMany({ data: [
      { threadId: thread.id, senderId: "learner", recipientId: "teacher", body: "Hello", createdAt: date(2024,1,1) },
      { threadId: thread.id, senderId: "teacher", recipientId: "learner", body: "Hello", createdAt: date(2024,1,2) },
    ] });
    const teaching = await getTeacherGallery(db, "teacher");
    expect(teaching.filter(card => card.awardedAt).map(card => card.id).sort()).toEqual(teachingMilestones.map(card => card.id).sort());
    expect(await db.learningAchievementAward.count()).toBe(78);
    expect(await db.teachingAchievementAward.count()).toBe(11);
    expect((await getLearnerGallery(db, "observer", "ENGLISH")).every(card => !card.awardedAt && !card.hidden)).toBe(true);
  });
}, 30_000);
