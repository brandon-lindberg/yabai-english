import { expect, test } from "vitest";
import { achievementCollection, crossedStudyMilestones } from "../gallery";
import { teachingCollection } from "../teaching-catalogue";
import { xpToAdvanceFromRank } from "@/lib/study/rpg-xp";

test("68 distinct cards and rank five qualify for three badges even without a lesson", () => {
  const entries = achievementCollection({ cards: 68, mastered: 0, rank: 5, lessons: 0, completedLevels: 0 });
  expect(entries.filter(entry => entry.qualified).map(entry => entry.id)).toEqual(["cards-0001", "cards-0025", "rank-0005"]);
  expect(entries.find(entry => entry.id === "cards-0100")?.progress).toEqual({ value: 68, target: 100 });
  expect(entries.find(entry => entry.id === "study-streak-0003")?.progress).toEqual({ value: 0, target: 3 });
});

test("the public catalogue covers 36 bilingual works and reveals no secret achievements", () => {
  const entries = achievementCollection({ cards: 0, mastered: 0, rank: 1, lessons: 1, completedLevels: 1 });
  expect(new Set(entries.filter(entry => !entry.hidden).map(entry => entry.id)).size).toBe(36);
  expect(entries.every(entry => entry.title.length === 2 && entry.rule.length === 2)).toBe(true);
  expect(entries.filter(entry => entry.qualified).map(entry => entry.id)).toEqual(["level-first", "lessons-0001"]);
  expect(entries.some(entry => !entry.hidden && /return-|irregular-/.test(entry.id))).toBe(false);
});

test("qualifies all reached mastery tiers and announces only the milestone crossed on a save", () => {
  const entries = achievementCollection({ cards: 68, mastered: 12, rank: 1, lessons: 0, completedLevels: 0 });
  expect(entries.filter(entry => entry.id.startsWith("mastery-") && entry.qualified).map(entry => entry.id))
    .toEqual(["mastery-0001", "mastery-0010"]);
  expect(entries.find(entry => entry.id === "mastery-0050")?.progress).toEqual({ value: 12, target: 50 });
  expect(crossedStudyMilestones({ newMasteredTotal: 10, totalXp: 12, xpGained: 12 }).map(entry => entry.id))
    .toEqual(["mastery-0010"]);
});

test("one study answer can cross card and rank milestones without replaying past milestones", () => {
  expect(crossedStudyMilestones({ newCardTotal: 25, totalXp: 1264, xpGained: 12 }).map(entry => entry.id))
    .toEqual(["cards-0025", "rank-0005"]);
  expect(crossedStudyMilestones({ newCardTotal: 26, totalXp: 1276, xpGained: 12 })).toEqual([]);
});

test("every published learner badge, including all three hidden badges, can qualify", () => {
  const entries = achievementCollection({ cards: 1000, mastered: 250, rank: 25, lessons: 100, completedLevels: 1,
    studyStreak: 30, lessonWeeks: 12, studyDays: 250, loyalty3: 1, loyalty6: 1, loyalty12: 1,
    comeback: 90, irregular: 1, mixedWeek: 1,
  });
  expect(entries.filter(entry => entry.qualified)).toHaveLength(39);
  expect(entries.filter(entry => entry.hidden).map(entry => entry.id)).toEqual(["return-0014d", "return-0090d", "irregular-0001"]);
});

test("all eleven teacher badges are reachable and each class threshold is exact", () => {
  const evidence = { completeProfile: true, firstBooking: true, classes: 100, repeatLearner: true,
    lessonNotes: true, studentReply: true, twoTeachingDays: true };
  const entries = teachingCollection(evidence);
  expect(entries.filter(entry => entry.qualified)).toHaveLength(11);
  expect(entries.filter(entry => entry.hidden)).toHaveLength(3);
  for (const entry of entries.filter(entry => /^teach-\d/.test(entry.id))) {
    const at = (classes: number) => teachingCollection({ ...evidence, classes }).find(card => card.id === entry.id)?.qualified;
    expect(at(entry.progress.target - 1), entry.id).toBe(false);
    expect(at(entry.progress.target), entry.id).toBe(true);
  }
});

test("every card, mastery and rank tier fires on its threshold during a live review", () => {
  const targets = [
    ...[1, 25, 100, 250, 500, 1000].map(value => ({ family: "cards", value, counter: "newCardTotal" })),
    ...[1, 10, 50, 100, 250].map(value => ({ family: "mastery", value, counter: "newMasteredTotal" })),
  ];
  for (const { family, value, counter } of targets) {
    const id = family + "-" + String(value).padStart(4, "0");
    const grants = (count: number) => crossedStudyMilestones({ [counter]: count, totalXp: 12, xpGained: 12 }).map(entry => entry.id);
    expect(grants(value - 1), id).not.toContain(id);
    expect(grants(value), id).toEqual([id]);
    expect(grants(value + 1), id).not.toContain(id);
  }
  for (const rank of [5, 10, 25]) {
    let xp = 0;
    for (let previous = 1; previous < rank; previous++) xp += xpToAdvanceFromRank(previous);
    const id = "rank-" + String(rank).padStart(4, "0");
    const grants = (totalXp: number) => crossedStudyMilestones({ totalXp, xpGained: 1 }).map(entry => entry.id);
    expect(grants(xp - 1)).toEqual([]);
    expect(grants(xp)).toEqual([id]);
    expect(grants(xp + 1)).toEqual([]);
  }
});
