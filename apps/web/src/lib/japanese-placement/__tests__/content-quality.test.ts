import { beforeAll, describe, expect, it } from "vitest";
import { loadContentCatalog } from "../content-files";
import type { JapaneseContentPack } from "../content-pack";

let pack: JapaneseContentPack;
beforeAll(async () => { ({ pack } = await loadContentCatalog("data/japanese-placement")); });
const passage = (id: string) => pack.passages.find((entry) => entry.id === id)!;

describe("Japanese editorial regression cases", () => {
  it("asks specifically about the multilingual festival assignment, not other work the narrator also performed", () => {
    expect(passage("japaneseness-the-town-festival").questions[0].prompt).toContain("三つの言語");
  });

  it("asks about the third day's planning rule rather than an unspecified possible destination", () => {
    expect(passage("japaneseness-planning-a-trip").questions[1].prompt).toContain("予定をどう");
  });

  it("distinguishes waking at the last minute from never being able to wake up", () => {
    expect(passage("morning-habit").questions[0].prompt).toContain("ぎりぎり");
    expect(passage("morning-habit").questions[1].supportingQuotes?.join(" ")).toContain("スマホをふとんに持っていかない");
  });

  it("removes the broad picture-book distractor that also encompassed the keyed physical-sharing answer", () => {
    const q = passage("yomitaku-sim-togo4").questions[1];
    expect(q.choices.filter((choice) => choice.id !== q.correctChoiceId).map((choice) => choice.text)).not.toContain("絵本の本質は何かという捉え方");
    expect(q.prompt).toContain("親子の関わり");
  });

  it("preserves the sale's original excerpt but removes its contradictory all-products discount claim from the displayed adaptation", () => {
    const entry = passage("japaneseness-a-sale-advert");
    expect(entry.original).toContain("品物が すべて 二十パーセントびき");
    expect(entry.text).not.toContain("品物が すべて");
    expect(entry.text).toContain("食品と 本は セールの たいしょう外");
  });

  it("states the weather assumption for the waterworks date", () => {
    expect(passage("japaneseness-a-notice").questions[0].prompt).toContain("雨");
  });

  it("supports arithmetic and eligibility keys with all of their premises", () => {
    const menu = passage("jlptsuccess-read-017").questions;
    expect(menu[0].supportingQuotes?.join(" ")).toContain("ケーキ：500円");
    expect(menu[1].supportingQuotes?.join(" ")).toContain("コーヒー：300円");
    const volunteer = passage("volunteer-japanese-class").questions[1];
    expect(volunteer.supportingQuotes?.join(" ")).toContain("経験がなくてもかまいません");
    expect(volunteer.supportingQuotes?.join(" ")).toContain("ゆっくり聞く気持ち");
  });

  it.each(["garden-views", "translation-views"])("retains evidence from both writers for the shared claim in %s", (id) => {
    const entry = passage(id);
    const [a, b] = entry.text.split(/【(?:意見|担当者)Ｂ】/u);
    const q = entry.questions[0];
    expect(a).toContain(q.evidenceQuote);
    expect(q.supportingQuotes?.some((quote) => b.includes(quote))).toBe(true);
  });

  it("replaces a valid casual missed-meal distractor with a contextual meaning task", () => {
    const entry = pack.wordItems.find((item) => item.id === "grammar-sobireru" && item.band === "N1")!;
    expect(entry.choices.map((choice) => choice.text)).not.toContain("そびれてたの");
    expect(entry.choices.find((choice) => choice.id === entry.correctChoiceId)?.text).toBe("食べそびれた");
    expect(entry.prompt.ja).toContain("機会を逃し");
    expect(entry.completion).toBe(entry.original);
  });
});
