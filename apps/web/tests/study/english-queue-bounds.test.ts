import { expect, test, vi } from "vitest";
import type { PrismaClient } from "@/generated/prisma/client";
import { prepareEnglishStudyQueue } from "@/lib/study/english-queue";

test("English schedules metadata first, reads selected content and a bounded distractor pool, preserving exercise formats", async () => {
  const rows = Array.from({ length: 500 }, (_, i) => ({ id: String(i), deckId: "deck", frontJa: `日本語 ${i}`, backEn: `English ${i}`, exerciseJson: null }));
  rows[0].exerciseJson = { kind: "reorder", tokens: [{id:"a",text:"I"},{id:"b",text:"study"}] } as never;
  const calls: {select: Record<string,unknown>;where:Record<string,unknown>;take?:number}[]=[];
  const db = { studyCard: { findMany: vi.fn(async args => {
    calls.push(args);
    if (!args.select.frontJa) return rows.map(({id})=>({id}));
    if (args.take) return rows.slice(0,args.take);
    return rows.filter(row => args.where.id.in.includes(row.id));
  }) }, userStudyCardState: { findMany: vi.fn().mockResolvedValue([]) } };
  const progress=vi.fn();
  const queue=await prepareEnglishStudyQueue(db as unknown as PrismaClient,"learner","level",{limit:24,focus:"mixed"},progress);
  expect(queue.cards).toHaveLength(24);
  expect(calls.filter(c=>c.select.frontJa)).toHaveLength(2);
  expect(calls.find(c=>c.take)?.take).toBeLessThanOrEqual(96);
  expect(calls.filter(c=>c.select.frontJa && !c.take)[0].where.id).toEqual({in:expect.any(Array)});
  expect(progress.mock.calls.at(-1)?.[0]).toMatchObject({completed:24,total:25});
  expect(JSON.stringify(queue)).not.toContain("backEn");
});

test("bounded English queues retain reorder, multi-step and MCQ exercises without private answer fields", async () => {
  const rows = [
    { id: "reorder", frontJa: "並べ替えてください", backEn: "I study", exerciseJson: { kind: "reorder", tokens: [{id:"a",text:"I"},{id:"b",text:"study"}], correctTokenIds: ["a","b"] } },
    { id: "multi", frontJa: "答えてください", backEn: "private multi answer", exerciseJson: { kind: "multi_step", steps: [{prompt:"A",canonical:"private-a"},{prompt:"B",canonical:"private-b"}] } },
    { id: "mcq", frontJa: "私は英語を勉強します", backEn: "I study English", exerciseJson: null },
  ].map(row => ({...row,deckId:"deck"}));
  const db = { studyCard: { findMany: vi.fn(async args => !args.select.frontJa ? rows.map(({id})=>({id})) : args.take ? rows : rows.filter(row=>args.where.id.in.includes(row.id))) },
    userStudyCardState: { findMany: vi.fn().mockResolvedValue([]) } };
  const queue = await prepareEnglishStudyQueue(db as unknown as PrismaClient,"learner","level",{limit:3,focus:"mixed"});
  expect(queue.cards.map(card=>card.kind).sort()).toEqual(["mcq","multi_step","reorder"]);
  expect(JSON.stringify(queue)).not.toMatch(/canonical|correctTokenIds|private-a|private-b/);
  expect(queue.cards.find(card=>card.kind==="multi_step")).toMatchObject({steps:[{prompt:"A"},{prompt:"B"}]});
});
