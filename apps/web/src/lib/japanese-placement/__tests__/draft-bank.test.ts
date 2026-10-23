import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { inspectBankReadiness, JAPANESE_PLACEMENT_DOMAINS, parseJapaneseBank } from "../bank";

describe("checked-in Japanese review samples", () => {
  it("accounts for twelve original draft exercises, two per skill, with no publication approval", () => {
    const bank = parseJapaneseBank(JSON.parse(readFileSync("data/japanese-placement/review-bank.json", "utf8")));
    expect(bank.items).toHaveLength(12);
    for (const domain of JAPANESE_PLACEMENT_DOMAINS) {
      expect(bank.items.filter((item) => item.domain === domain)).toHaveLength(2);
    }
    expect(bank.sources.every((source) => source.origin === "original")).toBe(true);
    expect(inspectBankReadiness(bank)).toEqual({
      ready: false,
      issues: ["japanese-teacher-review-required", "rights-review-required", "placement-review-required", "assessment-calibration-required"],
    });
    const writing = bank.items.filter((item) => item.domain === "writing");
    expect(writing).toHaveLength(2);
    expect(writing.every((item) => item.responseType === "sentence_assembly")).toBe(true);
    expect(bank.items.every((item) => item.stimulus.kind === "text")).toBe(true);
    for (const item of writing) {
      if (item.responseType !== "sentence_assembly") continue;
      for (const order of item.acceptedOrders) {
        const solution = order.map((id) => item.tiles.find((tile) => tile.id === id)!.text).join("");
        expect(item.prompt.ja).not.toContain(solution);
      }
    }
  });
});
