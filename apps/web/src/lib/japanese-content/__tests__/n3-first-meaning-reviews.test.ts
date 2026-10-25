import { access } from "node:fs/promises";
import { expect, test } from "vitest";
import { loadJapaneseStudyArtifacts } from "../study-artifacts";
import { loadJapaneseStudyContentReview } from "../study-content-review";

const cached = await access(".cache/japanese-content/study-v1.json").then(() => true, () => false);

test.runIf(cached)("selects actual injury and checking examples rather than substring matches or another check sense", async () => {
  const { source } = await loadJapaneseStudyArtifacts(process.cwd());
  const injury = source.cards.find(card => card.id === "ja-vocabulary:8fb005254a");
  if (injury?.kind !== "vocabulary") throw new Error("Missing injury construction");
  expect(injury.content.meanings).toEqual(["to be injured"]);
  expect(injury.content.examples).toEqual([]);
  expect(injury.originalContent?.examples[0].ja).toContain("胸やけがする");
  const check = source.cards.find(card => card.id === "ja-vocabulary:83a456da88");
  if (check?.kind !== "vocabulary") throw new Error("Missing check construction");
  expect(check.content.examples.map(example => example.tatoeba_id)).toEqual([9238000]);
}, 30_000);

test.runIf(cached)("corrects false N3 senses while independently evidencing legitimate homonyms", async () => {
  const { source } = await loadJapaneseStudyArtifacts(process.cwd());
  const expected: Record<string, string[]> = {
    "0294bdc5ab": ["lighter", "writer"],
    "17c0d3a658": ["girl (usu. between 7 and 17)", "young lady"],
    "1be11a9bbe": ["clear", "precise", "definite"],
    "107fb6f26b": ["slowly", "little by little", "gradually", "steadily"],
  };
  for (const [id, meanings] of Object.entries(expected)) {
    const card = source.cards.find(card => card.id === `ja-vocabulary:${id}`);
    if (card?.kind !== "vocabulary") throw new Error(`Missing vocabulary ${id}`);
    expect(card.content.meanings).toEqual(meanings);
    expect(card.originalContent).toBeDefined();
    expect(card.content.word).toBe(card.meaningReviewBefore?.word);
    expect(card.content.reading).toBe(card.meaningReviewBefore?.reading);
  }
  for (const [id, entry] of [["0294bdc5ab", "2844121"], ["23556d634a", "2847461"], ["242a0bb0ea", "2861508"], ["2a04aa688d", "2844545"]]) {
    const card = source.cards.find(card => card.id === `ja-vocabulary:${id}`);
    if (card?.kind !== "vocabulary") throw new Error(`Missing vocabulary ${id}`);
    expect(card.dictionaryEvidence.entryIds).toContain(entry);
  }
}, 30_000);

test.runIf(cached)("resolves all N4 construction signals and the explicitly bounded first 150 N3 records", async () => {
  const { records, summary } = await loadJapaneseStudyContentReview(process.cwd());
  expect(records.filter(row => row.kind === "vocabulary" && row.introductionLevel === "N4" && row.meanings.some(meaning => !["exact", "reviewed-equivalent"].includes(meaning.status))).map(row => row.id)).toEqual([]);
  expect(records.filter(row => row.kind === "vocabulary" && row.introductionLevel === "N3" && row.id <= "ja-vocabulary:38191588bb" && row.meanings.some(meaning => meaning.status === "needs-review")).map(row => row.id)).toEqual([]);
  expect(summary.counts).toMatchObject({ units: 10291, sourceRecords: 10307 });
  expect(summary.publicationChanged).toBe(false);
}, 30_000);

test.runIf(cached)("the next N3 meanings preserve people, duration, reading and overtaking boundaries", async () => {
  const { source } = await loadJapaneseStudyArtifacts(process.cwd());
  const expected: Record<string, string[]> = {
    "41766d271a": ["unmarried", "single"],
    "56d7bebebd": ["(town) market", "marketplace"],
    "72f846250a": ["player (of a sport)", "team member"],
    "86d6931c5b": ["week"],
    "6d74c09476": ["to catch up (with)", "to draw level"],
    "59d7b934c6": ["rotation"],
    "63d9f749c6": ["article", "goods"],
  };
  for (const [id, meanings] of Object.entries(expected)) {
    const card = source.cards.find(card => card.id === `ja-vocabulary:${id}`);
    if (card?.kind !== "vocabulary") throw new Error(`Missing vocabulary ${id}`);
    expect(card.content.meanings).toEqual(meanings);
    expect(card.originalContent).toBeDefined();
    expect(card.content.word).toBe(card.meaningReviewBefore?.word);
    expect(card.content.reading).toBe(card.meaningReviewBefore?.reading);
    expect(card.content.level).toBe(card.meaningReviewBefore?.level);
    if (id === "6d74c09476") expect(card.content.examples.map(example => example.tatoeba_id)).toEqual([200162]);
    if (id === "59d7b934c6") expect(card.content.examples).toEqual([]);
  }
  const grand = source.cards.find(card => card.id === "ja-vocabulary:53f7d1e6a9");
  if (grand?.kind !== "vocabulary") throw new Error("Missing grand");
  expect(grand.content.examples.map(example => example.tatoeba_id)).toEqual([12072710]);
  const around = source.cards.find(card => card.id === "ja-vocabulary:f71b64fa1e");
  expect(around?.content.meanings).toEqual(["surroundings"]);
}, 30_000);

test.runIf(cached)("resolves the next bounded 200 N3 records without deleting legitimate loanword homonyms", async () => {
  const { records, summary } = await loadJapaneseStudyContentReview(process.cwd());
  expect(records.filter(row => row.kind === "vocabulary" && row.introductionLevel === "N3" && row.id <= "ja-vocabulary:8822903a55" && row.meanings.some(meaning => meaning.status === "needs-review")).map(row => row.id)).toEqual([]);
  const { source } = await loadJapaneseStudyArtifacts(process.cwd());
  for (const [id, entry, meaning] of [["38dd5eb4a0", "1123750", "bowl"], ["42d999cbab", "2850185", "(running) track"], ["5d154c188d", "2843595", "deuce"], ["62682a6308", "2849826", "Miss"], ["771ae04338", "1076860", "diamond"]]) {
    const card = source.cards.find(card => card.id === `ja-vocabulary:${id}`);
    if (card?.kind !== "vocabulary") throw new Error(`Missing vocabulary ${id}`);
    expect(card.dictionaryEvidence.entryIds).toContain(entry);
    expect(card.content.meanings).toContain(meaning);
  }
  expect(summary.counts).toMatchObject({ units: 10291, sourceRecords: 10307 });
  expect(summary.publicationChanged).toBe(false);
}, 30_000);

test.runIf(cached)("the final N3 cohort distinguishes readings, people, agreement and verb direction", async () => {
  const { source } = await loadJapaneseStudyArtifacts(process.cwd());
  const expected: Record<string, string[]> = {
    "9923ca40cb": ["to support", "to sustain", "to hold at bay"],
    "8b180f444a": ["directly", "in person", "firsthand"],
    "8ae84a079b": ["talent", "function", "noh (theatre)"],
    "b0fe98d49c": ["land", "shore"],
    "b1905d8e82": ["residence", "housing"],
    "c84ab5b83d": ["life", "destiny"],
    "d9627ee0f6": ["people", "(all) persons"],
    "def0fe1435": ["stinking", "smelly", "suspicious"],
    "e957aa6df9": ["to finish", "to get through with"],
    "e62a18d68e": ["to be raised (e.g. child)", "to be brought up", "to grow (up)"],
    "b91001d17a": ["word", "vocabulary"],
    "9af40a4fd4": ["all members", "all hands", "whole crew"],
  };
  for (const [id, meanings] of Object.entries(expected)) {
    const card = source.cards.find(card => card.id === `ja-vocabulary:${id}`);
    if (card?.kind !== "vocabulary") throw new Error(`Missing vocabulary ${id}`);
    expect(card.content.meanings).toEqual(meanings);
    expect(card.originalContent).toBeDefined();
    expect(card.content.word).toBe(card.meaningReviewBefore?.word);
    expect(card.content.reading).toBe(card.meaningReviewBefore?.reading);
    expect(card.content.level).toBe(card.meaningReviewBefore?.level);
    if (id === "def0fe1435") expect(card.content.examples.map(example => example.tatoeba_id)).toEqual([234678]);
  }
  const prefix = source.cards.find(card => card.id === "ja-vocabulary:9c851c43f7");
  if (prefix?.kind !== "vocabulary") throw new Error("Missing honorific prefix");
  expect(prefix.content.meanings).toEqual(["honorific/polite/humble prefix"]);
  expect(prefix.content.examples).toEqual([]);
  expect(prefix.originalContent?.examples).toHaveLength(2);
}, 30_000);

test.runIf(cached)("finishes N3 meaning signals while preserving independently evidenced homonyms", async () => {
  const { records, summary } = await loadJapaneseStudyContentReview(process.cwd());
  expect(records.filter(row => row.kind === "vocabulary" && row.introductionLevel === "N3" && row.meanings.some(meaning => !["exact", "reviewed-equivalent"].includes(meaning.status))).map(row => row.id)).toEqual([]);
  const { source } = await loadJapaneseStudyArtifacts(process.cwd());
  for (const [id, entry, meaning] of [["9c3ddb98b7", "2855837", "cord"], ["9c3ddb98b7", "2855838", "chord"], ["c139bcdcb4", "2848325", "curd"], ["cb012edb7f", "2849429", "van"], ["cb012edb7f", "2156750", "value-added network"], ["cd42c9314f", "2862534", "locket"], ["e11ef6d7e3", "2855797", "home"], ["f5b7534060", "2219590", "former"]]) {
    const card = source.cards.find(card => card.id === `ja-vocabulary:${id}`);
    if (card?.kind !== "vocabulary") throw new Error(`Missing vocabulary ${id}`);
    expect(card.dictionaryEvidence.entryIds).toContain(entry);
    expect(card.content.meanings).toContain(meaning);
  }
  expect(summary.counts).toMatchObject({ units: 10291, sourceRecords: 10307 });
  expect(summary.publicationChanged).toBe(false);
}, 30_000);
