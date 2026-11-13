import { describe, expect, it } from "vitest";
import { bankDigest, inspectBankReadiness, parseJapaneseBank } from "../bank";
import { approvedBank, draftBank } from "./fixtures";

describe("Japanese bank contracts", () => {
  it("accepts a structurally valid draft without pretending it is publishable", () => {
    const bank = parseJapaneseBank(draftBank());
    expect(inspectBankReadiness(bank)).toEqual({
      ready: false,
      issues: ["japanese-teacher-review-required", "rights-review-required", "placement-review-required"],
    });
  });

  it("requires both reviews of the exact text-only content snapshot", () => {
    expect(inspectBankReadiness(approvedBank())).toEqual({ ready: true, issues: [] });
    const bank = approvedBank();
    const item = bank.items[0];
    if (item.responseType === "choice") item.correctChoiceId = "b";
    expect(inspectBankReadiness(bank).issues).toEqual([
      "japanese-teacher-review-stale", "rights-review-stale", "placement-review-stale",
    ]);
  });

  it("binds source rights, accepted sentence orders, version and explanations to content review", () => {
    const mutations = [
      (bank: ReturnType<typeof approvedBank>) => { bank.sources[0].license = "Changed terms"; },
      (bank: ReturnType<typeof approvedBank>) => { bank.sequence.reverse(); },
      (bank: ReturnType<typeof approvedBank>) => { bank.version++; },
      (bank: ReturnType<typeof approvedBank>) => { bank.items[0].explanation.en = "Changed"; },
      (bank: ReturnType<typeof approvedBank>) => {
        const item = bank.items[5];
        if (item.responseType === "sentence_assembly") item.acceptedOrders = [["object", "topic", "verb"]];
      },
    ];
    for (const mutate of mutations) {
      const bank = approvedBank();
      mutate(bank);
      expect(inspectBankReadiness(bank).ready).toBe(false);
    }
  });

  it("hashes consistently regardless of object property order or review records", () => {
    const bank = approvedBank();
    const reordered = Object.fromEntries(Object.entries(bank).reverse());
    expect(bankDigest(reordered)).toBe(bankDigest(bank));
    bank.reviews.rights = null;
    expect(bankDigest(bank)).toBe(bank.reviews.japaneseTeacher!.bankDigest);
  });

  it.each([
    ["duplicate item identity", (bank: JapaneseBank) => { bank.items[1].id = bank.items[0].id; }],
    ["duplicate source identity", (bank: JapaneseBank) => { bank.sources.push(bank.sources[0]); }],
    ["unknown text source", (bank: JapaneseBank) => { bank.items[0].sourceIds = ["unknown"]; }],
    ["duplicate choice identity", (bank: JapaneseBank) => { const item = bank.items[0]; if (item.responseType === "choice") item.choices[1].id = "a"; }],
    ["duplicate normalized choices", (bank: JapaneseBank) => { const item = bank.items[0]; if (item.responseType === "choice") item.choices[1].text = " Fixture A  "; }],
    ["equivalent Unicode choices", (bank: JapaneseBank) => { const item = bank.items[0]; if (item.responseType === "choice") item.choices = [{ id: "a", text: "が" }, { id: "b", text: "か\u3099" }]; }],
    ["missing answer key", (bank: JapaneseBank) => { const item = bank.items[0]; if (item.responseType === "choice") item.correctChoiceId = "unknown"; }],
    ["duplicate tile identity", (bank: JapaneseBank) => { const item = bank.items[5]; if (item.responseType === "sentence_assembly") item.tiles[1].id = item.tiles[0].id; }],
    ["unknown answer tile", (bank: JapaneseBank) => { const item = bank.items[5]; if (item.responseType === "sentence_assembly") item.acceptedOrders = [["unknown", "topic", "object"]]; }],
    ["incomplete sentence key", (bank: JapaneseBank) => { const item = bank.items[5]; if (item.responseType === "sentence_assembly") item.acceptedOrders = [["topic", "verb"]]; }],
    ["repeated answer tile", (bank: JapaneseBank) => { const item = bank.items[5]; if (item.responseType === "sentence_assembly") item.acceptedOrders = [["topic", "topic", "verb"]]; }],
    ["duplicate accepted sentence", (bank: JapaneseBank) => { const item = bank.items[5]; if (item.responseType === "sentence_assembly") item.acceptedOrders.push(item.acceptedOrders[0]); }],
    ["choice question masquerading as writing", (bank: JapaneseBank) => { bank.items[0].domain = "writing"; }],
    ["writing masquerading as reading", (bank: JapaneseBank) => { bank.items[5].domain = "reading"; }],
    ["missing domain coverage", (bank: JapaneseBank) => { bank.items.pop(); bank.sequence.pop(); }],
    ["unknown sequence item", (bank: JapaneseBank) => { bank.sequence.push("unknown"); }],
    ["repeated sequence item", (bank: JapaneseBank) => { bank.sequence.push(bank.sequence[0]); }],
    ["unaccounted item", (bank: JapaneseBank) => { bank.sequence.pop(); }],
  ])("rejects %s", (_label, mutate) => {
    const bank = approvedBank();
    mutate(bank);
    expect(() => parseJapaneseBank(bank)).toThrow();
  });

  it("rejects an identical exercise even with a new id/domain", () => {
    const bank = approvedBank();
    bank.items[1] = { ...bank.items[0], id: bank.items[1].id, domain: "kanji_reading" };
    expect(() => parseJapaneseBank(bank)).toThrow(/Duplicate exercise/);
  });

  it("rejects unknown fields rather than silently accepting a foreign scoring system", () => {
    expect(() => parseJapaneseBank({ ...draftBank(), placedLevel: "BEGINNER_1" })).toThrow();
  });

  it("rejects listening domains and recording stimuli", () => {
    const bank = draftBank();
    expect(() => parseJapaneseBank({ ...bank, items: bank.items.map((item, index) => index === 5 ? { ...item, domain: "listening" } : item) })).toThrow();
    expect(() => parseJapaneseBank({ ...bank, items: bank.items.map((item, index) => index === 5 ? { ...item, stimulus: { kind: "audio", transcript: "旧形式", asset: null } } : item) })).toThrow();
  });

  it("rejects free-text writing and per-student review criteria", () => {
    const bank = draftBank();
    expect(() => parseJapaneseBank({ ...bank, items: bank.items.map((item, index) => index === 5 ? {
      ...item, responseType: "writing", writing: { minCharacters: 1, maxCharacters: 200, reviewCriteria: { en: "Manual review", ja: "個別確認" } },
    } : item) })).toThrow();
  });
});

type JapaneseBank = ReturnType<typeof approvedBank>;
