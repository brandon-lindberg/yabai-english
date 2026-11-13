import { access } from "node:fs/promises";
import { expect, test } from "vitest";
import { loadJapaneseStudyArtifacts } from "../study-artifacts";
import { loadJapaneseStudyContentReview } from "../study-content-review";
import { expectReviewedCard, hasMeaningCohortReview } from "./reviewed-card-assertions";

const cached = await access(".cache/japanese-content/study-v1.json").then(() => true, () => false);

test.runIf(cached)("the final N2 dictionary cohort preserves spelling, pronouns, dates and construction meaning", async () => {
  const { source } = await loadJapaneseStudyArtifacts(process.cwd());
  const expected: Record<string, string[]> = {
    "d5ecec7c41": ["masterpiece", "fine piece of work", "absurd (e.g. blunder)"],
    "db99f3b069": ["to cure", "to heal"],
    "ec0bba0a33": ["horizontal", "level", "even"],
    "ec0dc25400": ["pitch-dark", "completely dark", "utterly hopeless"],
    "ef02a97b60": ["humanities", "arts"],
    "f1c3e724c1": ["21st to the last day of a month"],
    "f52c85beb6": ["completion", "finish", "workmanship", "result"],
    "f81222045a": ["political party"],
    "fbc4e2c947": ["before oneself", "this side (of a location)", "I", "me", "you"],
    "28ba375980": ["even more", "still more", "much more", "further"],
  };
  for (const [id, meanings] of Object.entries(expected)) {
    const card = expectReviewedCard(source, id, meanings);
    if (id === "db99f3b069") {
      expect(card.content.examples.map(example => example.tatoeba_id)).toEqual([231216]);
      expect(card.originalContent?.examples.map(example => example.tatoeba_id)).toEqual([231216, 85247]);
    }
    if (id === "f52c85beb6") {
      expect(card.content.examples).toEqual([]);
      expect(card.originalContent?.examples.map(example => example.tatoeba_id)).toEqual([200429, 217887]);
    }
  }
}, 30_000);

test.runIf(cached)("finishes N2 dictionary/construction flags while preserving the four separately attested phrases", async () => {
  const { records, summary } = await loadJapaneseStudyContentReview(process.cwd());
  const n2 = records.filter(row => row.kind === "vocabulary" && row.introductionLevel === "N2");
  expect(n2.flatMap(row => row.meanings.filter(meaning => ["needs-review", "construction"].includes(meaning.status)).map(meaning => [row.id, meaning.text]))).toEqual([]);
  const phrases = n2.filter(row => row.meanings.some(meaning => meaning.status === "phrase-attested"));
  expect(phrases.map(row => row.id)).toEqual(["ja-vocabulary:321ba5716a", "ja-vocabulary:3db8531d3b", "ja-vocabulary:91b50bd069", "ja-vocabulary:feb110fb03"]);
  expect(phrases.flatMap(row => row.meanings)).toHaveLength(6);
  const { source, study } = await loadJapaneseStudyArtifacts(process.cwd());
  for (const [id, entry, meaning] of [["eedac601c6", "2862559", "tap"], ["f1135a84c1", "2850287", "chip"]]) {
    const card = source.cards.find(card => card.id === `ja-vocabulary:${id}`);
    if (card?.kind !== "vocabulary") throw new Error(`Missing vocabulary ${id}`);
    expect(card.dictionaryEvidence.entryIds).toContain(entry);
    expect(card.content.meanings).toContain(meaning);
  }
  expect(study.recordToUnit["ja-vocabulary:251266e6d5"]).toBe(study.recordToUnit["ja-vocabulary:bd3e76856f"]);
  expect(n2.filter(row => hasMeaningCohortReview(row))).toHaveLength(712);
  expect(summary.counts).toMatchObject({ units: 10291, sourceRecords: 10307 });
  expect(summary.publicationChanged).toBe(false);
}, 30_000);

test.runIf(cached)("the fourth N2 cohort separates effort, statistics, verb direction and material-specific bowls", async () => {
  const { source, study } = await loadJapaneseStudyArtifacts(process.cwd());
  const expected: Record<string, string[]> = {
    "a2d96b6d4b": ["to separate (by distance, time, etc.)", "to isolate"],
    "a86f29464a": ["being comfortable", "relaxing"],
    "ad4ecf843d": ["to endeavor (to do)", "to try hard", "to make an effort"],
    "b321aa2d85": ["concentration", "density"],
    "b4e3b45b3f": ["statistics"],
    "bec933e924": ["to put clothes on (someone)", "to dress", "to clothe"],
    "bf1161cb2c": ["bowl (wooden)"],
    "bfe15d1832": ["to mix", "to stir", "to blend"],
    "c1a788035c": ["bowl (ceramic, porcelain)"],
    "c5553fccf6": ["crescent moon", "young moon"],
    "c99bd9459c": ["maintenance", "servicing", "preparation"],
    "d3825b176d": ["name and address (on an envelope, etc.)", "addressee"],
  };
  for (const [id, meanings] of Object.entries(expected)) expectReviewedCard(source, id, meanings);
  expect(study.recordToUnit["ja-vocabulary:bf1161cb2c"]).toBeDefined();
  expect(study.recordToUnit["ja-vocabulary:c1a788035c"]).toBeDefined();
  expect(study.recordToUnit["ja-vocabulary:bf1161cb2c"]).not.toBe(study.recordToUnit["ja-vocabulary:c1a788035c"]);
}, 30_000);

test.runIf(cached)("resolves the fourth 150-record N2 cohort and independently preserves the chock/chalk homonyms", async () => {
  const { records, summary } = await loadJapaneseStudyContentReview(process.cwd());
  const cohort = records.filter(row => row.kind === "vocabulary" && row.introductionLevel === "N2" && row.id > "ja-vocabulary:a1b5b4da89" && row.id <= "ja-vocabulary:d5be746bde");
  expect(cohort.flatMap(row => row.meanings.filter(meaning => meaning.status === "needs-review").map(meaning => [row.id, meaning.text]))).toEqual([]);
  // The final review also resolves the two supported constructions in this range.
  expect(cohort.filter(row => hasMeaningCohortReview(row))).toHaveLength(152);
  const { source } = await loadJapaneseStudyArtifacts(process.cwd());
  const chalk = source.cards.find(card => card.id === "ja-vocabulary:ba569eb176");
  if (chalk?.kind !== "vocabulary") throw new Error("Missing chalk/chock record");
  expect(chalk.dictionaryEvidence.entryIds).toEqual(["1078240", "2854421"]);
  expect(chalk.content.meanings).toEqual(["chock (wedge placed under a wheel)", "chalk"]);
  expect(summary.counts).toMatchObject({ units: 10291, sourceRecords: 10307 });
  expect(summary.publicationChanged).toBe(false);
}, 30_000);

test.runIf(cached)("the third N2 cohort preserves thresholds, school classes and primary-spelling restrictions", async () => {
  const { source } = await loadJapaneseStudyArtifacts(process.cwd());
  const expected: Record<string, string[]> = {
    "6a80a317f3": ["pocket money", "spending money", "allowance"],
    "6c5c091b7a": ["classic (work, esp. book)", "the classics"],
    "7137e5312a": ["long (time)", "prolonged"],
    "72d8fe6720": ["to be involved (in)", "to have to do with", "to (seriously) affect"],
    "833372d072": ["faculty (of a university)", "department"],
    "855762ebcc": ["rounding (off; a number)", "rounding half away from zero"],
    "91e86d0aa5": ["growth (of a plant)"],
    "95806db8ce": ["koto (13-stringed Japanese zither)"],
    "988eff8e12": ["district", "county"],
    "9cae12b7c2": ["to be saved", "to be rescued", "to survive", "to be helped", "to be saved trouble"],
    "9ceaaec557": ["(school) class"],
  };
  for (const [id, meanings] of Object.entries(expected)) {
    const card = expectReviewedCard(source, id, meanings);
    if (id === "7137e5312a") {
      expect(card.content.examples.map(example => example.tatoeba_id)).toEqual([203060]);
      expect(card.originalContent?.examples.map(example => example.tatoeba_id)).toEqual([203060, 118529]);
    }
  }
}, 30_000);

test.runIf(cached)("resolves the third 150-record N2 cohort without erasing the specialized ESC sense", async () => {
  const { records, summary } = await loadJapaneseStudyContentReview(process.cwd());
  const cohort = records.filter(row => row.kind === "vocabulary" && row.introductionLevel === "N2" && row.id > "ja-vocabulary:69caece3b1" && row.id <= "ja-vocabulary:a1b5b4da89");
  expect(cohort.flatMap(row => row.meanings.filter(meaning => meaning.status === "needs-review").map(meaning => [row.id, meaning.text]))).toEqual([]);
  expect(cohort.filter(row => hasMeaningCohortReview(row))).toHaveLength(150);
  expect(cohort.find(row => row.id === "ja-vocabulary:7f59e7581c")?.meanings.find(meaning => meaning.text === "escape (ESC)")).toMatchObject({ status: "reviewed-equivalent", evidence: [{ entryId: "1205220", sense: 2, gloss: "escape" }] });
  expect(summary.counts).toMatchObject({ units: 10291, sourceRecords: 10307 });
  expect(summary.publicationChanged).toBe(false);
}, 30_000);

test.runIf(cached)("corrects N2 verb direction, spelling and sense context while retaining the source", async () => {
  const { source } = await loadJapaneseStudyArtifacts(process.cwd());
  const expected: Record<string, string[]> = {
    "049cebeff8": ["to serve as", "to act as", "to hold (a position)"],
    "0a81eafbf4": ["to rub", "to scrub", "to scrape"],
    "0aa9e30a0b": ["brush"],
    "0fed46ef78": ["to be put in order", "to be disposed of", "to be solved", "to be finished"],
    "209e53b171": ["to wrap up (in)", "to roll up (in)"],
    "2502f0652f": ["front", "frontage"],
    "29a6468ef2": ["to be erected", "to be built"],
    "34b4191f3c": ["dam"],
  };
  for (const [id, meanings] of Object.entries(expected)) {
    const card = expectReviewedCard(source, id, meanings);
    if (id === "049cebeff8") {
      expect(card.content.examples.map(example => example.tatoeba_id)).toEqual([89621]);
      expect(card.originalContent?.examples.map(example => example.tatoeba_id)).toEqual([89621, 227466]);
    }
    if (id === "0fed46ef78") expect(card.content.examples.map(example => example.tatoeba_id)).toEqual([224208, 163575]);
  }
}, 30_000);

test.runIf(cached)("the next N2 meanings separate readings, returning, dates and expressions of dislike", async () => {
  const { source } = await loadJapaneseStudyArtifacts(process.cwd());
  const expected: Record<string, string[]> = {
    "3882078df6": ["to turn back", "to return", "to retrace one's steps"],
    "50b6055d9b": ["date (of a planned event, act, etc.)", "(number of) days"],
    "5f2c3ba54c": ["devising (a way)", "idea", "plan"],
    "4c7d50b5bb": ["weight"],
    "5fdec08677": ["white hair", "grey hair", "gray hair"],
    "608f79c4f1": ["to express dislike", "to seem to hate", "to appear uncomfortable (with)"],
    "68ea97a684": ["middle ten days of a month", "11th to 20th day of a month"],
    "69caece3b1": ["slovenly (appearance, work, etc.)", "sloppy", "untidy", "undisciplined", "loose"],
  };
  for (const [id, meanings] of Object.entries(expected)) {
    const card = expectReviewedCard(source, id, meanings);
    if (id === "50b6055d9b") expect(card.content.examples.map(example => example.tatoeba_id)).toEqual([185315, 122926]);
  }
}, 30_000);

test.runIf(cached)("resolves the next 150 N2 records while independently evidencing boat-launch and collar meanings", async () => {
  const { records, summary } = await loadJapaneseStudyContentReview(process.cwd());
  const cohort = records.filter(row => row.kind === "vocabulary" && row.introductionLevel === "N2" && row.id > "ja-vocabulary:3744253331" && row.id <= "ja-vocabulary:69caece3b1");
  expect(cohort.flatMap(row => row.meanings.filter(meaning => meaning.status === "needs-review").map(meaning => [row.id, meaning.text]))).toEqual([]);
  expect(cohort.filter(row => hasMeaningCohortReview(row))).toHaveLength(150);
  const { source } = await loadJapaneseStudyArtifacts(process.cwd());
  for (const [id, entry, meaning] of [["4418a98992", "2854169", "launch (boat)"], ["5f2087a06a", "2853151", "collar"]]) {
    const card = source.cards.find(card => card.id === `ja-vocabulary:${id}`);
    if (card?.kind !== "vocabulary") throw new Error(`Missing vocabulary ${id}`);
    expect(card.dictionaryEvidence.entryIds).toContain(entry);
    expect(card.content.meanings).toContain(meaning);
  }
  expect(summary.counts).toMatchObject({ units: 10291, sourceRecords: 10307 });
  expect(summary.publicationChanged).toBe(false);
}, 30_000);

test.runIf(cached)("resolves exactly the first bounded N2 meaning cohort through 3744253331", async () => {
  const { records, summary } = await loadJapaneseStudyContentReview(process.cwd());
  const cohort = records.filter(row => row.kind === "vocabulary" && row.introductionLevel === "N2" && row.id <= "ja-vocabulary:3744253331");
  expect(cohort.flatMap(row => row.meanings.filter(meaning => meaning.status === "needs-review").map(meaning => [row.id, meaning.text]))).toEqual([]);
  // 冠 and 納める were reviewed in the initial cross-level sense-restriction batch.
  const earlierReviews = ["ja-vocabulary:0221781ce9", "ja-vocabulary:1be15a39e4"];
  // The final review also resolves やたらに and 一段と in this range.
  expect(cohort.filter(row => !earlierReviews.includes(row.id) && hasMeaningCohortReview(row))).toHaveLength(152);
  const fluid = cohort.find(row => row.id === "ja-vocabulary:002731ca75");
  expect(fluid?.meanings.find(meaning => meaning.text === "fluid")).toMatchObject({ status: "reviewed-equivalent", evidence: [{ entryId: "1175030", sense: 1, gloss: "liquid" }] });
  expect(summary.counts).toMatchObject({ units: 10291, sourceRecords: 10307 });
  expect(summary.publicationChanged).toBe(false);
}, 30_000);
