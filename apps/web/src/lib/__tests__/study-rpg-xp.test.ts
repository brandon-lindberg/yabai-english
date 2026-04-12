import { describe, expect, it } from "vitest";
import {
  RPG_RANK_XP_BASE,
  RPG_RANK_XP_STEP,
  studyRpgProgressFromTotalXp,
  xpToAdvanceFromRank,
} from "../study/rpg-xp";

describe("xpToAdvanceFromRank", () => {
  it("grows gently by rank", () => {
    expect(xpToAdvanceFromRank(1)).toBe(RPG_RANK_XP_BASE);
    expect(xpToAdvanceFromRank(2)).toBe(RPG_RANK_XP_BASE + RPG_RANK_XP_STEP);
    expect(xpToAdvanceFromRank(3)).toBe(RPG_RANK_XP_BASE + 2 * RPG_RANK_XP_STEP);
  });
});

describe("studyRpgProgressFromTotalXp", () => {
  it("starts at rank 1 with empty bar", () => {
    const p = studyRpgProgressFromTotalXp(0);
    expect(p.rank).toBe(1);
    expect(p.xpIntoRank).toBe(0);
    expect(p.xpForNextRank).toBe(RPG_RANK_XP_BASE);
    expect(p.progressPercent).toBe(0);
  });

  it("fills bar toward next rank", () => {
    const p = studyRpgProgressFromTotalXp(140);
    expect(p.rank).toBe(1);
    expect(p.xpIntoRank).toBe(140);
    expect(p.progressPercent).toBe(50);
  });

  it("rolls over rank when crossing tier threshold", () => {
    const p = studyRpgProgressFromTotalXp(RPG_RANK_XP_BASE);
    expect(p.rank).toBe(2);
    expect(p.xpIntoRank).toBe(0);
    expect(p.progressPercent).toBe(0);
    expect(p.xpForNextRank).toBe(RPG_RANK_XP_BASE + RPG_RANK_XP_STEP);
  });

  it("uses a wider segment at rank 2", () => {
    const seg2 = xpToAdvanceFromRank(2);
    const p = studyRpgProgressFromTotalXp(RPG_RANK_XP_BASE + Math.floor(seg2 / 2));
    expect(p.rank).toBe(2);
    expect(p.xpForNextRank).toBe(seg2);
    expect(p.progressPercent).toBe(50);
  });

  it("handles multiple ranks with scaling segments", () => {
    const s1 = xpToAdvanceFromRank(1);
    const s2 = xpToAdvanceFromRank(2);
    const t = s1 + s2 + 10;
    const p = studyRpgProgressFromTotalXp(t);
    expect(p.rank).toBe(3);
    expect(p.xpIntoRank).toBe(10);
    expect(p.xpForNextRank).toBe(xpToAdvanceFromRank(3));
  });
});
