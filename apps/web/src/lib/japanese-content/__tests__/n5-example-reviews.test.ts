import { access } from "node:fs/promises";
import { expect, test } from "vitest";
import { loadJapaneseStudyArtifacts } from "../study-artifacts";
import { loadJapaneseStudyContentReview } from "../study-content-review";
import { expectReviewedExamples } from "./reviewed-card-assertions";

const cached = await access(".cache/japanese-content/study-v1.json").then(() => true, () => false);

test.runIf(cached)("the final N5 cohort separates proper names, grammar, homophones and translation claims", async () => {
  const { source } = await loadJapaneseStudyArtifacts(process.cwd());
  for (const [id, sentenceIds] of new Map<string, number[]>([
    ["9ac35c3990", [220200]], // A street name does not demonstrate counting five objects.
    ["9dda296d47", []], // The comparison marker differs from a direction/side.
    ["ae534d4ca8", [92969]], // An ordinal suffix differs from eye.
    ["b48d0c99d4", []], // Soap differs from the independently evidenced economy homophone.
    ["cb29ccdd2a", [210824]], // Not understanding does not assert that the content is nonsensical.
    ["d33540fe8e", [202137]], // Topic/location particles differ from the discourse conjunction.
    ["d5c2e69813", [159334]], // The retained sentence explicitly annotates わたくし.
    ["dc29195f18", [75827]], // A field/career differs from a physical street.
    ["e75777d218", []], // Doing so is different from the selected conjunction.
    ["eac7a22620", []], // Humble receiving/drinking differs from the meal formula.
    ["ec5bd86b72", [230059]],
    ["f1046f3190", [230059]], // The money-throughflow idiom is different from literal direction.
  ])) {
    const card = expectReviewedExamples(source, id, sentenceIds);
    expect(card.originalContent?.examples).toHaveLength(2);
    expect(card.content.reading).toBe(card.meaningReviewBefore?.reading);
    expect(card.content.level).toBe(card.meaningReviewBefore?.level);
  }
}, 30_000);

test.runIf(cached)("finishes every N5 record that had examples while accounting for the thirteen pre-existing empty records", async () => {
  const { records, summary } = await loadJapaneseStudyContentReview(process.cwd());
  const n5 = records.filter(row => "written" in row).filter(row => row.introductionLevel === "N5");
  expect(n5).toHaveLength(690);
  expect(n5.filter(row => row.examples.length && !row.meaningReview?.examples)).toHaveLength(0);
  expect(n5.filter(row => row.meaningReview?.examples)).toHaveLength(677);
  const empty = n5.filter(row => !row.meaningReview?.examples);
  expect(empty.map(row => row.id)).toEqual([
    "ja-vocabulary:05123676c2", "ja-vocabulary:098e9e7e67", "ja-vocabulary:2da7034c1e", "ja-vocabulary:6d4596ae46",
    "ja-vocabulary:71e2aefb9d", "ja-vocabulary:92b3bb727e", "ja-vocabulary:b21477c7db", "ja-vocabulary:cb1c02a574",
    "ja-vocabulary:d0fb41651f", "ja-vocabulary:d727a76b22", "ja-vocabulary:reference-30a51a1ad9c261949f6131cf",
    "ja-vocabulary:reference-367ca325e078e702938096cd", "ja-vocabulary:reference-b6944a5fe27104bc23ea28d3",
  ]);
  for (const row of empty) expect(row.examples).toEqual([]);
  const cohort = n5.filter(row => {
    const selection = row.meaningReview?.examples;
    return selection && [...selection.keep, ...selection.omit].some(decision => decision.reason.startsWith("N5 final literal example cohort:"));
  });
  expect(cohort).toHaveLength(189);
  expect(cohort[0]?.id).toBe("ja-vocabulary:992fc07339");
  expect(cohort.at(-1)?.id).toBe("ja-vocabulary:ffa3dda331");
  expect(n5.filter(row => row.meaningReview?.reason.startsWith("N5 final literal example cohort:"))).toHaveLength(152);
  const { source, study } = await loadJapaneseStudyArtifacts(process.cwd());
  expectReviewedExamples(source, "9b08365493", [202896, 202931]);
  expectReviewedExamples(source, "a7c72d9bb1", [199298, 204301]);
  expectReviewedExamples(source, "ee85169acd", [217962, 198943]);
  expectReviewedExamples(source, "feae64eac4", [214207, 214132]);
  const soap = expectReviewedExamples(source, "018b71a3e2", [197617, 142356]);
  expect(soap.content).toMatchObject({ meanings: ["soap"], jmdict_id: 1382590 });
  expect(expectReviewedExamples(source, "b48d0c99d4", []).content).toMatchObject({ meanings: ["economy"], jmdict_id: 1386220 });
  expect(study.recordToUnit["ja-vocabulary:018b71a3e2"]).not.toBe(study.recordToUnit["ja-vocabulary:b48d0c99d4"]);
  expect(expectReviewedExamples(source, "d5c2e69813", [159334]).content.reading).toBe("わたくし");
  expect(expectReviewedExamples(source, "reference-b6944a5fe27104bc23ea28d3", []).content.reading).toBe("わたし");
  expect(study.recordToUnit["ja-vocabulary:d5c2e69813"]).not.toBe(study.recordToUnit["ja-vocabulary:reference-b6944a5fe27104bc23ea28d3"]);
  expect(summary.counts).toMatchObject({ units: 10291, sourceRecords: 10307, meaningsToReview: 6, constructionMeanings: 0, phraseAttestedMeanings: 6 });
  expect(summary.publicationChanged).toBe(false);
}, 30_000);

test.runIf(cached)("the second N5 literal cohort rejects substrings, unrelated senses and changed English propositions", async () => {
  const { source } = await loadJapaneseStudyArtifacts(process.cwd());
  for (const [id, sentenceIds] of new Map<string, number[]>([
    ["50b217ed0b", [212598]], // Famous is different from able.
    ["51a671ec17", [199202]], // Inexperienced is different from blue.
    ["5538df2bce", []], // Program and Instagram do not illustrate the weight unit gram.
    ["5b9670420a", []], // A handle and a strategy are different from the selected hand sense.
    ["6156bfb418", []], // 生き字引 is the separately attested walking-dictionary compound.
    ["78fd1a0e8a", [196376]], // Being struck by a car does not assert death.
    ["7f7ef4abe8", [87193]], // Someone/anyone is different from a who question.
    ["898b067287", [200083]], // A chair's back is different from height/stature.
    ["85eb994887", [234825]], // A classroom is different from an aerobics course.
    ["93b9cec3d4", [201303]], // A first-meeting greeting is different from sending regards.
    ["978a2cefa5", [216490]], // Repeated sometimes is different from a single unspecified sometime.
  ])) {
    const card = expectReviewedExamples(source, id, sentenceIds);
    expect(card.originalContent?.examples).toHaveLength(2);
    expect(card.content.reading).toBe(card.meaningReviewBefore?.reading);
    expect(card.content.level).toBe(card.meaningReviewBefore?.level);
  }
}, 30_000);

test.runIf(cached)("reviews the next 150 N5 records while retaining negative-answer conventions, accepted readings and confections", async () => {
  const { records, summary } = await loadJapaneseStudyContentReview(process.cwd());
  const n5 = records.filter(row => "written" in row).filter(row => row.introductionLevel === "N5");
  const cohort = n5.filter(row => {
    const selection = row.meaningReview?.examples;
    return selection && [...selection.keep, ...selection.omit].some(decision => decision.reason.startsWith("N5 second literal example cohort:"));
  });
  expect(cohort).toHaveLength(150);
  expect(cohort[0]?.id).toBe("ja-vocabulary:50525927ee");
  expect(cohort.at(-1)?.id).toBe("ja-vocabulary:98eace7008");
  expect(n5.filter(row => row.meaningReview?.reason.startsWith("N5 second literal example cohort:"))).toHaveLength(122);
  expect(n5.find(row => row.id === "ja-vocabulary:60dd63379e")?.meanings).toEqual([
    { text: "over there", status: "exact", evidence: [{ entryId: "1483185", sense: 4, gloss: "over there" }] },
  ]);
  const { source, study } = await loadJapaneseStudyArtifacts(process.cwd());
  expectReviewedExamples(source, "542f39c93d", [236422, 198381]);
  expectReviewedExamples(source, "669019c625", [194419, 223955]);
  expectReviewedExamples(source, "771fbe6b4d", [81361, 152788]);
  expectReviewedExamples(source, "83700909d4", [81248, 81243]);
  const nine = expectReviewedExamples(source, "8f81565ad7", [108121, 179548]);
  expect(nine.content.reading).toBe("きゅう");
  expect(nine.content.other_readings).toContain("く");
  expect(study.recordToUnit["ja-vocabulary:50525927ee"]).not.toBe(study.recordToUnit["ja-vocabulary:fbe9c362bd"]);
  expect(summary.counts).toMatchObject({ units: 10291, sourceRecords: 10307, meaningsToReview: 6, constructionMeanings: 0, phraseAttestedMeanings: 6 });
  expect(summary.publicationChanged).toBe(false);
}, 30_000);

test.runIf(cached)("N5 example curation removes different senses and translation mismatches while retaining complete originals", async () => {
  const { source } = await loadJapaneseStudyArtifacts(process.cwd());
  const expected = new Map<string, number[]>([
    ["0ce2b98d3b", [236074]], // A phone call, rather than putting something on food.
    ["19f270c68f", [145648]], // Switching off a light, rather than extinguishing a candle.
    ["1a7c32fbcb", [217547]], // Physical roundness, rather than peaceful settlement.
    ["397b682fa7", []], // Blown fuses and topic skipping are separate senses from flying/hopping.
    ["687082e55c", []], // Engine starting and an aspectual suffix do not mean taking time/money.
    ["9661cbac61", []], // Raising a hand or speed does not illustrate giving.
    ["a21ba677f2", []], // Temporal nearness and a mistranslated statement do not illustrate spatial near.
    ["bee501faf0", [234395]], // A separate euphemistic sense does not illustrate over there.
    ["d106dac023", [229384]], // A tendency is separate from dislike.
    ["e05de4981d", [122958]], // Adnominal copula なる differs from becoming.
  ]);
  for (const [id, sentenceIds] of expected) {
    const card = source.cards.find(card => card.id === `ja-vocabulary:${id}`);
    if (card?.kind !== "vocabulary") throw new Error(`Missing vocabulary ${id}`);
    expect(card.content.examples.map(example => example.tatoeba_id), card.content.word).toEqual(sentenceIds);
    expect(card.originalContent?.examples, card.content.word).toHaveLength(2);
    expect(card.content.reading).toBe(card.meaningReviewBefore?.reading);
    expect(card.content.level).toBe(card.meaningReviewBefore?.level);
  }
}, 30_000);

test.runIf(cached)("N5 literal examples preserve negation scope, grammatical roles and selected meanings", async () => {
  const { source } = await loadJapaneseStudyArtifacts(process.cwd());
  for (const [id, sentenceIds] of new Map<string, number[]>([
    ["0139a208fe", [77996]], // Not both is different from neither.
    ["0e8f798dbf", [81634]], // 本 as a bottle counter is different from book.
    ["19db29fbbb", []], // Welcoming and reproach differ from often/well.
    ["20fcc4f54f", []], // Continuation and physical direction differ from future/previous.
    ["3f71089c32", []], // The no-matter particle differs from the but conjunction.
    ["3fb1b70809", [158458]], // Counting a person differs from being alone.
    ["3c039918ba", []], // A phone call is different from the selected device sense.
    ["2dbe65ee1d", []], // Mailboxes differ from a job/position post.
    ["4df6eda2a2", [197242]], // If possible is a condition, not an assertion of possibility.
  ])) {
    const card = expectReviewedExamples(source, id, sentenceIds);
    expect(card.originalContent?.examples).toHaveLength(2);
    expect(card.content.reading).toBe(card.meaningReviewBefore?.reading);
    expect(card.content.level).toBe(card.meaningReviewBefore?.level);
  }
}, 30_000);

test.runIf(cached)("reviews the first 150 remaining N5 example records while retaining clothing, reading and measurement evidence", async () => {
  const { records, summary } = await loadJapaneseStudyContentReview(process.cwd());
  const n5 = records.filter(row => "written" in row).filter(row => row.introductionLevel === "N5");
  const cohort = n5.filter(row => {
    const selection = row.meaningReview?.examples;
    return selection && [...selection.keep, ...selection.omit].some(decision => decision.reason.startsWith("N5 first literal example cohort:"));
  });
  expect(cohort).toHaveLength(150);
  expect(cohort[0]?.id).toBe("ja-vocabulary:0020b9ee4e");
  expect(cohort.at(-1)?.id).toBe("ja-vocabulary:5028971b39");
  expect(n5.filter(row => row.meaningReview?.reason.startsWith("N5 first literal example cohort:"))).toHaveLength(112);
  const { source, study } = await loadJapaneseStudyArtifacts(process.cwd());
  expectReviewedExamples(source, "04ab635f4b", [192366, 196251]);
  expectReviewedExamples(source, "39fff8fc4b", [169654, 169693]);
  expectReviewedExamples(source, "36016e0c51", [196669, 221393]);
  expectReviewedExamples(source, "4f0f6b6ae7", [79848]);
  expect(expectReviewedExamples(source, "3fb1b70809", [158458]).content.reading).toBe("ひとり");
  const formalSingle = "reference-f04ff8f7ae0c4a1df8550c9e";
  expect(expectReviewedExamples(source, formalSingle, []).content).toMatchObject({ word: "一人", reading: "いちにん", level: "N1" });
  expect(study.recordToUnit["ja-vocabulary:3fb1b70809"]).not.toBe(study.recordToUnit[`ja-vocabulary:${formalSingle}`]);
  expect(n5.find(row => row.id === "ja-vocabulary:04ab635f4b")?.meanings).toMatchObject([
    { text: "button", status: "reviewed-equivalent", evidence: [{ entryId: "1123880", sense: 1, gloss: "button (clothing)" }] },
  ]);
  expect(n5.find(row => row.id === "ja-vocabulary:4f0f6b6ae7")?.meaningReview?.meanings).toMatchObject([
    { text: "problem", relation: "exact", entryId: "1536010", sense: 5, gloss: "problem" },
  ]);
  expect(summary.counts).toMatchObject({ units: 10291, sourceRecords: 10307, meaningsToReview: 6, constructionMeanings: 0, phraseAttestedMeanings: 6 });
  expect(summary.publicationChanged).toBe(false);
}, 30_000);

test.runIf(cached)("finishes the N5 nonliteral example cohort without deleting valid conjugations, numeric dates or alternate spellings", async () => {
  const { records, summary } = await loadJapaneseStudyContentReview(process.cwd());
  const n5 = records.filter(row => "written" in row).filter(row => row.introductionLevel === "N5");
  expect(n5.filter(row => row.examples.some(example => !example.literalTarget) && !row.meaningReview?.examples)).toHaveLength(0);
  const newCohort = n5.filter(row => row.meaningReview?.reason.startsWith("N5 nonliteral example cohort:"));
  // Existing meaning decisions are extended in place; unreviewed exact wording receives a retain decision.
  expect(newCohort).toHaveLength(111);
  expect(n5.filter(row => {
    const decisions = row.meaningReview?.examples;
    return decisions && [...decisions.keep, ...decisions.omit].some(decision => decision.reason.startsWith("N5 nonliteral example cohort:"));
  })).toHaveLength(174);
  const expected = new Map<string, number[]>([
    ["018b71a3e2", [197617, 142356]], // 石けん spelling.
    ["04015c3825", [155413, 158950]], // Conjugated 無くす.
    ["07a4101167", [226439, 231343]], // Animal sounds in past/conditional forms.
    ["1713d0bbe8", [236068, 168024]], // Calendar and duration senses remain distinct.
    ["2e2abd26ca", [236043, 78725]], // Irregular 来る conjugations.
    ["749f78c9d1", [186606, 202394]], // 花びん spelling.
    ["c65a346458", [4707, 161998]], // Numeric ２０歳 remains a valid age expression.
  ]);
  for (const [id, sentenceIds] of expected) {
    const row = n5.find(row => row.id === `ja-vocabulary:${id}`);
    expect(row?.examples.map(example => example.source.tatoeba_id)).toEqual(sentenceIds);
    expect(row?.meaningReview?.examples?.keep).toHaveLength(2);
  }
  expect(summary.counts).toMatchObject({ units: 10291, sourceRecords: 10307, meaningsToReview: 6, constructionMeanings: 0, phraseAttestedMeanings: 6 });
  expect(summary.publicationChanged).toBe(false);
}, 30_000);
