import { beforeEach, expect, test, vi } from "vitest";
import type { PrismaClient } from "@/generated/prisma/client";
import { withIsolatedPostgres } from "../../test/isolated-postgres";
import { POST } from "@/app/api/study/review/route";
import { studyRpgProgressFromTotalXp } from "@/lib/study/rpg-xp";
import { getLearnerGallery } from "@/lib/achievements/learner-gallery";

const mocks = vi.hoisted(() => ({ db: null as unknown as PrismaClient, notify: vi.fn(), role: "STUDENT" }));
vi.mock("@/lib/prisma", () => ({ get prisma() { return mocks.db; } }));
vi.mock("@/auth", () => ({ auth: async () => ({ user: { id: "learner", role: mocks.role, learningLanguage: "ENGLISH" } }) }));
vi.mock("@/lib/study/rpg-rank-notification", () => ({ notifyStudyRankUpIfNeeded: mocks.notify }));
beforeEach(() => { mocks.notify.mockClear(); mocks.role = "STUDENT"; });

const review = (cardId = "card-0", chosenAnswer = "cat") => POST(new Request("http://localhost/api/study/review", {
  method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ cardId, chosenAnswer, answerTimeMs: 2000 }),
}));

async function seed(db: PrismaClient) {
  await db.user.create({ data: { id: "learner", role: "STUDENT" } });
  await db.studyTrack.create({ data: { id: "english", slug: "english-flashcards", titleJa: "英語", titleEn: "English", levels: { create: {
    id: "level", levelCode: "BEGINNER_1", titleJa: "初級", titleEn: "Beginner", decks: { create: { id: "deck", titleJa: "語彙", titleEn: "Vocabulary" } },
  } } } });
  await db.studyCard.createMany({ data: Array.from({ length: 5 }, (_, i) => ({ id: `card-${i}`, deckId: "deck", frontJa: "猫", backEn: "cat" })) });
}

test.runIf(process.env.MIRROR_TEST_DATABASE_URL)("opening the gallery reconciles historical grades once per learner and subject", async () => {
  await withIsolatedPostgres("20261119000000_learning_achievement_awards", async ({ db, applyMigration }) => {
    await applyMigration();
    await seed(db);
    await db.user.create({ data: { id: "another-learner" } });
    await db.userStudyCardState.createMany({ data: [
      { userId: "learner", cardId: "card-0", wrongCount: 68 },
      { userId: "learner", cardId: "card-1", correctCount: 1 },
      { userId: "learner", cardId: "card-2" },
    ] });
    await db.userStudyLevelProgress.create({ data: { userId: "learner", levelId: "level", xp: 1516 } });
    const read = () => getLearnerGallery(db, "learner", "ENGLISH");
    const visits = await Promise.all(Array.from({ length: 5 }, read));
    for (const cards of visits) {
      expect(cards.filter(card => card.awardedAt).map(card => card.id)).toEqual(["cards-0001", "rank-0005"]);
      expect(cards.find(card => card.id === "cards-0025")?.progress?.value).toBe(2);
    }
    expect(await db.learningAchievementAward.count()).toBe(2);
    for (const cards of [await getLearnerGallery(db, "learner", "JAPANESE"), await getLearnerGallery(db, "another-learner", "ENGLISH")]) {
      expect(cards.filter(card => card.awardedAt)).toHaveLength(0);
    }
    await db.userStudyCardState.deleteMany({ where: { userId: "learner" } });
    expect((await read()).find(card => card.id === "cards-0001")?.awardedAt).toEqual(visits[0][0].awardedAt);
  });
}, 30_000);

test.runIf(process.env.MIRROR_TEST_DATABASE_URL)("English saves read XP once inside the learner lock and fetch only the required card context", async () => {
  await withIsolatedPostgres("20261113000000_study_runtime_references", async ({ db, applyMigration }) => {
    await applyMigration(); await seed(db);
    const operations: string[] = [];
    let selectedCard: unknown;
    mocks.db = db.$extends({ query: { $allOperations({ model, operation, args, query }) {
      operations.push(`${model ?? "sql"}.${operation}`);
      if (model === "StudyCard" && operation === "findUnique") selectedCard = args;
      return query(args);
    } } }) as typeof db;
    const response = await review();
    expect(response.status).toBe(200);
    expect(await response.json()).toMatchObject({ correct: true, xpGained: 12, levelXp: 12, masteryScore: 20,
      correctCount: 1, wrongCount: 0, averageAnswerMs: 2000, rpg: { totalStudyXp: 12 } });
    expect(operations.filter(op => op === "UserStudyLevelProgress.aggregate")).toHaveLength(1);
    expect(operations.indexOf("sql.$queryRaw")).toBeLessThan(operations.indexOf("UserStudyLevelProgress.aggregate"));
    expect(operations).not.toContain("User.findUnique"); // Entry level needs no placement or role lookup.
    expect(selectedCard).toEqual({ where: { id: "card-0" }, select: {
      id: true, kind: true, frontJa: true, backEn: true, exerciseJson: true,
      deck: { select: { level: { select: { id: true, trackId: true, levelCode: true } } } },
    } });
    expect(operations.filter(op => op === "StudyTrack.findUnique")).toHaveLength(1);
  });
}, 30_000);

test.runIf(process.env.MIRROR_TEST_DATABASE_URL)("five concurrent English answers retain every score and cross a rank boundary once", async () => {
  await withIsolatedPostgres("20261113000000_study_runtime_references", async ({ db, applyMigration }) => {
    await applyMigration(); await seed(db); mocks.db = db;
    await db.userStudyLevelProgress.create({ data: { userId: "learner", levelId: "level", xp: 276 } });
    const responses = await Promise.all(Array.from({ length: 5 }, (_, i) => review(`card-${i}`)));
    expect(responses.map(response => response.status)).toEqual([200, 200, 200, 200, 200]);
    const results = await Promise.all(responses.map(response => response.json()));
    expect(results.map(result => result.rpg.totalStudyXp).sort((a, b) => a - b)).toEqual([288, 300, 312, 324, 336]);
    expect(results.map(result => result.masteryScore).sort((a, b) => a - b)).toEqual([20, 40, 60, 80, 100]);
    const crossings = mocks.notify.mock.calls.map(([input]) => input).filter(input =>
      studyRpgProgressFromTotalXp(input.newTotalXp).rank > studyRpgProgressFromTotalXp(input.previousTotalXp).rank);
    expect(crossings).toEqual([{ userId: "learner", previousTotalXp: 276, newTotalXp: 288 }]);
    expect(await db.userStudyLevelProgress.findUniqueOrThrow({ where: { userId_levelId: { userId: "learner", levelId: "level" } } }))
      .toMatchObject({ xp: 336, masteryScore: 100 });
    expect(await db.userStudyCardState.count({ where: { userId: "learner", correctCount: 1 } })).toBe(5);
  });
}, 30_000);

test.runIf(process.env.MIRROR_TEST_DATABASE_URL)("a failed English mastery update rolls back the answer and XP together", async () => {
  await withIsolatedPostgres("20261113000000_study_runtime_references", async ({ db, applyMigration }) => {
    await applyMigration(); await seed(db);
    mocks.db = db.$extends({ query: { userStudyLevelProgress: { update() { throw new Error("Injected mastery failure"); } } } }) as typeof db;
    await expect(review()).rejects.toThrow("Injected mastery failure");
    expect(await db.userStudyCardState.count()).toBe(0);
    expect(await db.userStudyLevelProgress.count()).toBe(0);
    expect(mocks.notify).not.toHaveBeenCalled();
    mocks.db = db;
    const response = await review("card-0", "dog");
    expect(await response.json()).toMatchObject({ correct: false, xpGained: 2, levelXp: 2, masteryScore: 0, correctCount: 0, wrongCount: 1 });
  });
}, 30_000);

test.runIf(process.env.MIRROR_TEST_DATABASE_URL)("English save access still respects publication, placement, progression and teacher privileges", async () => {
  await withIsolatedPostgres("20261113000000_study_runtime_references", async ({ db, applyMigration }) => {
    await applyMigration(); await seed(db); mocks.db = db;
    await db.studyLevel.create({ data: { id: "higher", trackId: "english", levelCode: "BEGINNER_2", titleEn: "Next", titleJa: "次", decks: { create: {
      id: "higher-deck", titleEn: "Next", titleJa: "次", cards: { create: { id: "higher-card", frontJa: "猫", backEn: "cat" } },
    } } } });
    expect((await review("higher-card")).status).toBe(403);
    await db.studentProfile.create({ data: { userId: "learner", placedLevel: "BEGINNER", placedSubLevel: 2 } });
    expect((await review("higher-card")).status).toBe(200);
    await db.studentProfile.update({ where: { userId: "learner" }, data: { placedLevel: "UNSET", placedSubLevel: null } });
    await db.userStudyLevelProgress.create({ data: { userId: "learner", levelId: "level", assessmentPassedAt: new Date() } });
    expect((await review("higher-card")).status).toBe(200);
    await db.userStudyLevelProgress.update({ where: { userId_levelId: { userId: "learner", levelId: "level" } }, data: { assessmentPassedAt: null } });
    await db.user.update({ where: { id: "learner" }, data: { role: "TEACHER" } }); mocks.role = "TEACHER";
    expect((await review("higher-card")).status).toBe(200);
    await db.studyTrack.update({ where: { id: "english" }, data: { publicationStatus: "DRAFT" } });
    expect((await review()).status).toBe(403);
    await db.studyTrack.update({ where: { id: "english" }, data: { publicationStatus: "PUBLISHED", learningLanguage: "JAPANESE" } });
    expect((await review()).status).toBe(403);
  });
}, 30_000);
