import { expect, test } from "vitest";
import { achievementCollection, crossedStudyMilestones } from "../gallery";

test("68 distinct cards and rank five qualify for three badges even without a lesson", () => {
  const entries = achievementCollection({ cards: 68, rank: 5, lessons: 0, completedLevels: 0 });
  expect(entries.filter(entry => entry.qualified).map(entry => entry.id)).toEqual(["cards-0001", "cards-0025", "rank-0005"]);
  expect(entries.find(entry => entry.id === "cards-0100")?.progress).toEqual({ value: 68, target: 100 });
  expect(entries.find(entry => entry.id === "study-streak-0003")?.progress).toBeNull();
});

test("the public catalogue covers 36 bilingual works and reveals no secret achievements", () => {
  const entries = achievementCollection({ cards: 0, rank: 1, lessons: 1, completedLevels: 1 });
  expect(new Set(entries.map(entry => entry.id)).size).toBe(36);
  expect(entries.every(entry => entry.title.length === 2 && entry.rule.length === 2)).toBe(true);
  expect(entries.filter(entry => entry.qualified).map(entry => entry.id)).toEqual(["level-first", "lessons-0001"]);
  expect(entries.some(entry => /return-|irregular-/.test(entry.id))).toBe(false);
});

test("one study answer can cross card and rank milestones without replaying past milestones", () => {
  expect(crossedStudyMilestones({ newCardTotal: 25, totalXp: 1264, xpGained: 12 }).map(entry => entry.id))
    .toEqual(["cards-0025", "rank-0005"]);
  expect(crossedStudyMilestones({ newCardTotal: 26, totalXp: 1276, xpGained: 12 })).toEqual([]);
});
