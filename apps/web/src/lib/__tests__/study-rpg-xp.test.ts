import { describe, expect, it } from "vitest";
import { RPG_XP_PER_RANK, studyRpgProgressFromTotalXp } from "../study/rpg-xp";

describe("studyRpgProgressFromTotalXp", () => {
  it("starts at rank 1 with empty bar", () => {
    const p = studyRpgProgressFromTotalXp(0);
    expect(p.rank).toBe(1);
    expect(p.xpIntoRank).toBe(0);
    expect(p.xpForNextRank).toBe(RPG_XP_PER_RANK);
    expect(p.progressPercent).toBe(0);
  });

  it("fills bar toward next rank", () => {
    const p = studyRpgProgressFromTotalXp(140);
    expect(p.rank).toBe(1);
    expect(p.xpIntoRank).toBe(140);
    expect(p.progressPercent).toBe(50);
  });

  it("rolls over rank when crossing tier threshold", () => {
    const p = studyRpgProgressFromTotalXp(RPG_XP_PER_RANK);
    expect(p.rank).toBe(2);
    expect(p.xpIntoRank).toBe(0);
    expect(p.progressPercent).toBe(0);
  });

  it("handles multiple ranks", () => {
    const p = studyRpgProgressFromTotalXp(RPG_XP_PER_RANK * 2 + 10);
    expect(p.rank).toBe(3);
    expect(p.xpIntoRank).toBe(10);
  });
});
