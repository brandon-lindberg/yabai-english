import { describe, expect, test } from "vitest";
import { teachingCollection } from "../teaching-catalogue";
import { achievementRarity, achievementScope } from "../rarity";

describe("teaching milestones", () => {
  test("uses teaching evidence and distinct thresholds for the eight artwork pieces", () => {
    const badges = teachingCollection({ completeProfile: true, firstBooking: true, classes: 5, repeatLearner: false });
    expect(badges.filter(badge => !badge.hidden)).toHaveLength(8);
    expect(badges.filter(badge => badge.qualified).map(badge => badge.id)).toEqual([
      "teach-profile", "teach-booked", "teach-0001", "teach-0005",
    ]);
    expect(badges.find(badge => badge.id === "teach-0025")?.progress).toEqual({ value: 5, target: 25 });
  });

  test("recognizes a returning learner separately from teaching volume", () => {
    const badges = teachingCollection({ completeProfile: false, firstBooking: true, classes: 2, repeatLearner: true });
    expect(badges.find(badge => badge.id === "teach-return")?.qualified).toBe(true);
    expect(badges.find(badge => badge.id === "teach-profile")?.qualified).toBe(false);
  });

  test("keeps the three surprises separate from public teaching milestones", () => {
    const badges = teachingCollection({
      completeProfile: false, firstBooking: false, classes: 0, repeatLearner: false,
      lessonNotes: true, studentReply: false, twoTeachingDays: true,
    });
    const hidden = badges.filter(badge => badge.hidden);
    expect(hidden).toHaveLength(3);
    expect(hidden.filter(badge => badge.qualified).map(badge => badge.id)).toEqual([
      "teach-hidden-notes", "teach-hidden-second-bell",
    ]);
  });
});

describe("community unlock rates", () => {
  test("separates teachers from both learner subjects", () => {
    expect(achievementScope(true, "ENGLISH")).toBe("TEACHING");
    expect(achievementScope(true, "JAPANESE")).toBe("TEACHING");
    expect(achievementScope(false, "ENGLISH")).toBe("LEARN_ENGLISH");
    expect(achievementScope(false, "JAPANESE")).toBe("LEARN_JAPANESE");
  });

  test("uses the unrounded percentage for the strict 10% cutoff", () => {
    expect(achievementRarity(99, 991)).toEqual({ fraction: 0.0998, rare: true, belowMinimum: false });
    expect(achievementRarity(1, 10)).toEqual({ fraction: 0.1, rare: false, belowMinimum: false });
    expect(achievementRarity(1, 3)).toEqual({ fraction: 0.3333, rare: false, belowMinimum: false });
  });

  test("distinguishes zero unlocks from a missing cohort", () => {
    expect(achievementRarity(0, 30)).toEqual({ fraction: 0, rare: false, belowMinimum: false });
    expect(achievementRarity(0, 0)).toBeNull();
  });

  test("uses a known personal award when the community snapshot still says zero", () => {
    expect(achievementRarity(0, 5, true)).toEqual({ fraction: 0.2, rare: false, belowMinimum: false });
    expect(achievementRarity(0, 10_000, true)).toEqual({ fraction: 0.0001, rare: true, belowMinimum: false });
    expect(achievementRarity(1, 10_001, true)).toEqual({ fraction: 0.0001, rare: true, belowMinimum: true });
    expect(achievementRarity(2, 10, true)).toMatchObject({ fraction: 0.2 });
  });
});
