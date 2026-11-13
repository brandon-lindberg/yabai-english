import { expect, test } from "vitest";
import { describeJapaneseUsage, japaneseVocabularyUsage } from "@/lib/study/japanese-usage";

test("describes grammar codes in both locales without conflating case-sensitive spelling tags", () => {
  expect(describeJapaneseUsage("adj-na", "en")).toMatchObject({ text: "Na-adjective", lang: "en", translated: true });
  expect(describeJapaneseUsage("v5r", "ja")).toMatchObject({ text: "五段動詞（る）", lang: "ja", translated: true });
  expect(describeJapaneseUsage("rK", "en").text).toBe("Rare kanji spelling");
  expect(describeJapaneseUsage("rk", "en").text).toBe("Rare kana spelling");
});

test("preserves source notes and unknown values with an honest language fallback", () => {
  expect(describeJapaneseUsage("verbatim source note", "ja")).toEqual({ text: "verbatim source note", lang: "en", translated: false });
  expect(describeJapaneseUsage("future-code", "en")).toEqual({ text: "future-code", lang: "en", translated: false });
  expect(describeJapaneseUsage("toString", "ja").text).toBe("toString");
});

test("translates the pinned source usage notes without changing their source identity", () => {
  expect(describeJapaneseUsage("after an author's name", "ja").text).toBe("著者名の後に付く");
  expect(describeJapaneseUsage("陸 is used in legal documents", "ja").text).toBe("「陸」は法的文書で使う");
  expect(describeJapaneseUsage("concerning the actions of the listener or concerning the ideas expressed or understood by the listener; with a neg. sentence, implies that something isn't as much as one might think", "en").text).toContain("negative sentence");
});

test("extracts exact member usage once without losing notes or merging case-sensitive codes", () => {
  const record = { content: { pos: ["n", "adj-no", "n"] }, referenceSupplement: {
    written: { tags: ["rK"] }, reading: { tags: ["rk"] },
    senses: [{ misc: ["uk"], info: ["source note"], field: ["Buddh"], dialect: ["ksb"] }],
  } };
  const before = structuredClone(record);
  expect(japaneseVocabularyUsage(record)).toEqual(["n", "adj-no", "rK", "rk", "uk", "source note", "Buddh", "ksb"]);
  expect(record).toEqual(before);
});
