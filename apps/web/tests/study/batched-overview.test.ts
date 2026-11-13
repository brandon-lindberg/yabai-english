import { expect, test, vi } from "vitest";
import type { PrismaClient } from "@/generated/prisma/client";
import { getStudyTrackOverview } from "@/lib/study/get-overview";

test("English overview reads access, mastery, progress and assessments in batches instead of per level", async () => {
  const codes = ["BEGINNER_1","BEGINNER_2","BEGINNER_3","INTERMEDIATE_1","INTERMEDIATE_2","INTERMEDIATE_3","ADVANCED_1","ADVANCED_2","ADVANCED_3"];
  const levels=codes.map((levelCode,sortOrder)=>({id:levelCode,levelCode,sortOrder,titleJa:levelCode,titleEn:levelCode}));
  const progress=[{levelId:"INTERMEDIATE_2",xp:24,assessmentPassedAt:new Date(0),completedAt:null}];
  const db={
    studyTrack:{findUnique:vi.fn().mockResolvedValue({id:"track",slug:"english-flashcards",levels})},
    user:{findUnique:vi.fn().mockResolvedValue({role:"STUDENT",studentProfile:{placedLevel:"INTERMEDIATE",placedSubLevel:2}})},
    studentProfile:{findUnique:vi.fn(()=>{throw new Error("Read the profile with the actor once")})},
    userStudyLevelProgress:{findMany:vi.fn().mockResolvedValue(progress),findUnique:vi.fn(()=>{throw new Error("Per-level progress read")}),aggregate:vi.fn(()=>{throw new Error("Use already loaded XP")})},
    studyAssessment:{findMany:vi.fn().mockResolvedValue([{id:"exit",levelId:"BEGINNER_1"}])},
    studyDeck:{findMany:vi.fn().mockResolvedValue(levels.map(l=>({levelId:l.id,_count:{cards:10}})))},
    studyCard:{findMany:vi.fn(()=>{throw new Error("Do not load card IDs to count mastery")})},
    $queryRaw:vi.fn().mockResolvedValue([]),
  };
  const result=await getStudyTrackOverview(db as unknown as PrismaClient,"learner","english-flashcards");
  expect(result?.levels.map(l=>l.locked)).toEqual([false,false,false,false,false,false,true,true,true]);
  expect(result?.levels[0]).toMatchObject({exitAssessmentId:"exit",cardsTotal:10,cardsTouched:0});
  expect(db.user.findUnique).toHaveBeenCalledTimes(1);
  expect(db.userStudyLevelProgress.findMany).toHaveBeenCalledTimes(1);
  expect(db.studyAssessment.findMany).toHaveBeenCalledTimes(1);
  expect(db.$queryRaw).toHaveBeenCalledTimes(1);
});

test("the shared English access calculation rejects another language's level codes for every role", async () => {
  const { studyLevelAccess } = await import("@/lib/study/access");
  expect(studyLevelAccess({ role: "SUPER_ADMIN", levelCode: "N5", previousPassed: true })).toBe(false);
  expect(studyLevelAccess({ role: "STUDENT", levelCode: "N3", placedLevel: "ADVANCED", placedSubLevel: 3, previousPassed: true })).toBe(false);
});
