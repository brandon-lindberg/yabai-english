import { expect, test } from "vitest";
import type { PrismaClient } from "@/generated/prisma/client";
import { withIsolatedPostgres } from "../../test/isolated-postgres";
import { seedJapaneseStudy, japaneseStudyAnswer } from "../../test/japanese-study-db-fixture";
import { createJapaneseStudyQueue, submitJapaneseStudyReview } from "@/lib/study/japanese-service";

test.runIf(process.env.MIRROR_TEST_DATABASE_URL)("Japanese issuance is batched and answer saving never downloads or recalculates the entire history twice", async()=>{
  await withIsolatedPostgres("20261113000000_study_runtime_references",async({db,applyMigration})=>{
    await applyMigration();await seedJapaneseStudy(db);
    const calls:string[]=[];
    const measured=db.$extends({query:{$allOperations({model,operation,args,query}){calls.push(`${model??"raw"}.${operation}`); if (operation === "$queryRaw" && "sql" in args && String(args.sql).includes('AS "statesTotal"')) calls.push("rollup");return query(args)}}}) as unknown as PrismaClient;
    const queue=await createJapaneseStudyQueue(measured,"learner",{levelCode:"N5",limit:50});
    expect(queue.cards).toHaveLength(9);
    expect(calls.filter(c=>c==="StudyReviewPrompt.findUnique")).toHaveLength(0);
    expect(calls.filter(c=>c==="StudyReviewPrompt.findMany")).toHaveLength(1);
    expect(calls.filter(c=>c==="StudyReviewPrompt.createMany")).toHaveLength(1);
    const answer=await japaneseStudyAnswer(db,queue.cards[0].question.id);
    calls.length=0;
    const saved=await submitJapaneseStudyReview(measured,"learner",answer);
    expect(saved).toMatchObject({correct:true,xpGained:12});
    expect(calls.filter(c=>c==="UserStudyCardState.findMany")).toHaveLength(0);
    expect(calls.filter(c=>c==="rollup")).toHaveLength(1);
    expect(calls.filter(c=>c==="UserStudyCardState.findUnique")).toHaveLength(1);
    expect(calls.filter(c=>c==="UserStudyLevelProgress.upsert")).toHaveLength(1);
    expect(await submitJapaneseStudyReview(measured,"learner",answer)).toEqual(saved);
  });
},30000);

test.runIf(process.env.MIRROR_TEST_DATABASE_URL)("database summaries match JavaScript rounding, practice bands, weighted latency and a single-card delta", async () => {
  await withIsolatedPostgres("20261113000000_study_runtime_references", async ({ db, applyMigration }) => {
    await applyMigration(); await seedJapaneseStudy(db);
    const { getFlashcardStatisticsByLevelId, rollupFlashcardPracticeForLevel, replaceFlashcardPracticeState } = await import("@/lib/study/study-flashcard-stats");
    const ids = (await db.studyCard.findMany({ where: { deckId: "deck-N5" }, select: { id: true } })).map(row => row.id);
    const counts = [[0,0,0], [0,1,0], [13,7,0], [131,69,4], [7,1,5], [699,101,5], [8,0,5], [1,4,0]];
    const data = counts.map(([correctCount, wrongCount, streakCorrect], i) => ({ userId: "learner", cardId: ids[i], correctCount, wrongCount, streakCorrect,
      averageAnswerMs: i === 0 ? null : 300000, latencySampleCount: i === 0 ? 4 : 100000 }));
    await db.userStudyCardState.createMany({ data });
    const before = (await getFlashcardStatisticsByLevelId(db, "learner", ["level-N5", "level-N4"])).get("level-N5")!;
    expect(before).toMatchObject({ cardsTotal: 9, cardsTouched: 6 });
    expect(before.practice).toEqual(rollupFlashcardPracticeForLevel(ids, new Map(data.map(row => [row.cardId, row]))));
    const previous = data[2], next = { ...previous, correctCount: previous.correctCount + 1, streakCorrect: 1 };
    await db.userStudyCardState.update({ where: { userId_cardId: { userId: "learner", cardId: previous.cardId } }, data: next });
    const after = (await getFlashcardStatisticsByLevelId(db, "learner", ["level-N5"])).get("level-N5")!;
    expect(replaceFlashcardPracticeState(before.practice, previous, next)).toEqual(after.practice);
    expect((await getFlashcardStatisticsByLevelId(db, "other", ["level-N5"])).get("level-N5")!.practice).toMatchObject({ newCount: 9, totalAttempts: 0 });
  });
}, 30000);
