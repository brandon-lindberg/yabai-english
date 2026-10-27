import { access } from "node:fs/promises";
import { expect, test } from "vitest";
import { loadJapaneseStudyArtifacts } from "../study-artifacts";
import { loadJapaneseStudyContentReview } from "../study-content-review";
import { expectReviewedExamples } from "./reviewed-card-assertions";

const cached = await access(".cache/japanese-content/study-v1.json").then(() => true, () => false);

test.runIf(cached)("the final N4 cohort distinguishes particles, multipliers, names, idioms and changed quantities", async () => {
  const { source } = await loadJapaneseStudyArtifacts(process.cwd());
  for (const [id, sentenceIds] of new Map<string, number[]>([
    ["b3f18d07d4", []], // Comparison/approximation particles differ from the selected extent noun.
    ["b7dd1f219b", []], // Fivefold and tenfold are not double.
    ["b80da200ff", []], // Checkout/cashier differs from the register device.
    ["ba74488833", []], // Month differs from Moon; the companion is an unanchored prediction.
    ["ba8831572d", [211029]], // The emergency instruction omits necessary context.
    ["be7c090b8e", [196468]], // The shared gloves mismatch stays omitted on both associations.
    ["cd7dd383c9", [222569]], // 200 differs from over 200.
    ["d051720806", []], // Shift scheduling and components do not teach this part-time-work definition cleanly.
    ["d1a343e501", []], // Relations and among differ from physical space.
    ["d48ed47f5e", [221976]], // Contrary differs from opposition.
    ["d64432f194", [224283]], // Watching traffic does not specify driving.
    ["e5cfcfab45", [167832]], // Bell the surname is not the ringing instrument.
    ["eb7247f404", []], // The undeclared みんな reading cannot be inferred from unannotated 皆.
    ["ee0c991348", [126410]], // The blanket owl blindness claim is unsuitable.
    ["f2a77c1c6d", [172307]], // やっとる is a verb contraction, not at last.
    ["f2c38f9517", [230565]], // Currency exchange differs from change after a purchase.
    ["f71b64fa1e", [148261]], // Circumference differs from surroundings.
    ["fb53d716c6", [143698]], // Anticipation differs from enjoyment.
  ])) {
    const card = expectReviewedExamples(source, id, sentenceIds);
    expect(card.originalContent?.examples).toHaveLength(2);
    expect(card.content.reading).toBe(card.meaningReviewBefore?.reading);
    expect(card.content.level).toBe(card.meaningReviewBefore?.level);
  }
  const condiment = expectReviewedExamples(source, "fcf790e186", []);
  expect(condiment.originalContent?.examples).toHaveLength(1);
  expect(condiment.content.meanings).toEqual(["miso", "fermented condiment usu. made from soybeans"]);
}, 30_000);

test.runIf(cached)("N4 bitter taste and clothing suit retain their definitions with eligible contextual citations", async () => {
  const { records } = await loadJapaneseStudyContentReview(process.cwd());
  for (const [id, text, entryId, gloss] of [
    ["e1cfd51839", "bitter", "1244310", "bitter (taste)"],
    ["eb0f717433", "suit", "1066680", "suit (clothing)"],
  ]) {
    const row = records.find(row => row.id === `ja-vocabulary:${id}`);
    if (!row || !("written" in row)) throw new Error(`Missing vocabulary ${id}`);
    expect(row.meanings).toEqual([{ text, status: "reviewed-equivalent", evidence: [{ entryId, sense: 1, gloss }] }]);
    expect(row.meaningReview?.action).toBe("retain");
    expect(row.meaningReviewBefore?.meanings).toEqual([text]);
  }
  const { source } = await loadJapaneseStudyArtifacts(process.cwd());
  expectReviewedExamples(source, "e1cfd51839", [223800, 223286]);
  expectReviewedExamples(source, "eb0f717433", [215065, 145487]);
}, 30_000);

test.runIf(cached)("finishes the N4 example queue while accounting for all nine pre-existing empty members", async () => {
  const { records, summary } = await loadJapaneseStudyContentReview(process.cwd());
  const n4 = records.filter(row => "written" in row).filter(row => row.introductionLevel === "N4");
  expect(n4).toHaveLength(643);
  expect(n4.filter(row => row.examples.length && !row.meaningReview?.examples)).toHaveLength(0);
  expect(n4.filter(row => row.meaningReview?.examples)).toHaveLength(634);
  const empty = n4.filter(row => !row.meaningReview?.examples);
  expect(empty.map(row => row.id)).toEqual([
    "ja-vocabulary:1fb9d39cd6", "ja-vocabulary:376ccb94c4", "ja-vocabulary:3cd723d544",
    "ja-vocabulary:776c4df05f", "ja-vocabulary:88d4196563", "ja-vocabulary:bc25dff617",
    "ja-vocabulary:reference-3a58ddc0fcdaa6b8541186b2", "ja-vocabulary:reference-a95e02e34ec3920938f30c5e",
    "ja-vocabulary:reference-f0298a2375dd407683167768",
  ]);
  const { source } = await loadJapaneseStudyArtifacts(process.cwd());
  for (const row of empty) {
    expect(row.examples).toEqual([]);
    const card = expectReviewedExamples(source, row.id.replace("ja-vocabulary:", ""), []);
    expect((card.originalContent ?? card.content).examples).toEqual([]);
    expect((card.meaningReviewBefore ?? card.content).examples).toEqual([]);
  }
  const cohort = n4.filter(row => {
    const selection = row.meaningReview?.examples;
    return selection && [...selection.keep, ...selection.omit].some(decision => decision.reason.startsWith("N4 final literal example cohort:"));
  });
  expect(cohort).toHaveLength(138);
  expect(cohort[0]?.id).toBe("ja-vocabulary:b3c360789e");
  expect(cohort.at(-1)?.id).toBe("ja-vocabulary:ff9e385277");
  expect(n4.filter(row => row.meaningReview?.reason.startsWith("N4 final literal example cohort:"))).toHaveLength(99);
  expectReviewedExamples(source, "c6815e7618", [224760, 91684]);
  expectReviewedExamples(source, "cb029e617e", [74683, 79109]);
  expectReviewedExamples(source, "d8623369cb", [223241, 221100]);
  expectReviewedExamples(source, "da4198f39c", [210309, 142575]);
  expectReviewedExamples(source, "de9d61dd71", [106339, 75362]);
  expectReviewedExamples(source, "fbb6245e8b", [159019, 122131]);
  expect(summary.counts).toMatchObject({ units: 10291, sourceRecords: 10307, meaningsToReview: 6, constructionMeanings: 0, phraseAttestedMeanings: 6 });
  expect(summary.publicationChanged).toBe(false);
}, 30_000);

test.runIf(cached)("the second N4 literal cohort preserves numerical boundaries, word identities and translation propositions", async () => {
  const { source } = await loadJapaneseStudyArtifacts(process.cwd());
  for (const [id, sentenceIds] of new Map<string, number[]>([
    ["629362dbfc", []], // Inclusive 以下 differs from under; following is also a separate sense.
    ["6365c5ac47", [201483]], // At least does not mean day after day.
    ["6693b4e9f7", [179923]], // Your store uses the addressee sense, not your house.
    ["67fb8c065d", [199403]], // Views/aspects differ from visible dots.
    ["69678bc04e", [165392]], // The blanket condor claim and grow/breed translation are unsuitable.
    ["721424863e", []], // Paper face and outside differ from the selected front sense.
    ["72df46ea9c", [143038]], // Star symbols differ from celestial bodies.
    ["78c6412e35", [209467]], // Job security differs from anatomical neck.
    ["7962f0cea1", [228372]], // Japanese people and Japan's residents are different populations.
    ["7d940762d2", [187463]], // The companion has a missing action construction.
    ["845a23790b", [219821]], // Working in law differs from obeying it.
    ["8ff4f12975", [206940]], // Excessive cooling differs from asking how to repair it.
    ["95f7288e1b", []], // Amount and whole-day uses differ from the selected full-state adjective.
    ["9b799806d8", [184373]], // Halfway through an undertaking differs from en route.
    ["9c0ee7cfcc", [195599]], // A mouthful is not a defined medical dose.
    ["a02c2a6790", []], // Rapid flow and a misannotated 急ぐ form do not illustrate urgent/steep.
    ["a2a012c05f", [83095]], // The traditional kimono sense must be established.
    ["ab366b6c9d", []], // Disposition and a fickleness idiom differ from spirit/mood.
    ["b1573ec234", [3222725]], // The companion has an extra に in the ease construction.
    ["b377c7b2ea", [192707]], // Knowing differs from consenting.
  ])) {
    const card = expectReviewedExamples(source, id, sentenceIds);
    expect(card.originalContent?.examples).toHaveLength(2);
    expect(card.content.reading).toBe(card.meaningReviewBefore?.reading);
    expect(card.content.level).toBe(card.meaningReviewBefore?.level);
  }
  const relativeWeek = expectReviewedExamples(source, "a6678a1d99", []);
  expect(relativeWeek.originalContent?.examples).toHaveLength(1);
  expect(relativeWeek.content.meanings).toEqual(["the week after next"]);
}, 30_000);

test.runIf(cached)("N4 selects noun stereo and aspiration dream without replacing their existing definitions", async () => {
  const { records } = await loadJapaneseStudyContentReview(process.cwd());
  for (const [id, text, status, entryId, sense, gloss] of [
    ["9071f08832", "stereo", "reviewed-equivalent", "1070650", 2, "stereo (player, set)"],
    ["79e62e3c87", "dream", "exact", "1529410", 2, "dream"],
  ] as const) {
    const row = records.find(row => row.id === `ja-vocabulary:${id}`);
    if (!row || !("written" in row)) throw new Error(`Missing vocabulary ${id}`);
    expect(row.meanings).toEqual([{ text, status, evidence: [{ entryId, sense, gloss }] }]);
    expect(row.meaningReview?.action).toBe("retain");
    expect(row.meaningReviewBefore?.meanings).toEqual([text]);
  }
  const { source } = await loadJapaneseStudyArtifacts(process.cwd());
  expectReviewedExamples(source, "9071f08832", [161560, 214601]);
  expectReviewedExamples(source, "79e62e3c87", [233006]);
}, 30_000);

test.runIf(cached)("reviews the next 150 N4 records while retaining declared forms, contrasts and contextual senses", async () => {
  const { records, summary } = await loadJapaneseStudyContentReview(process.cwd());
  const n4 = records.filter(row => "written" in row).filter(row => row.introductionLevel === "N4");
  const cohort = n4.filter(row => {
    const selection = row.meaningReview?.examples;
    return selection && [...selection.keep, ...selection.omit].some(decision => decision.reason.startsWith("N4 second literal example cohort:"));
  });
  expect(cohort).toHaveLength(150);
  expect(cohort[0]?.id).toBe("ja-vocabulary:5fd0c77ef5");
  expect(cohort.at(-1)?.id).toBe("ja-vocabulary:b377c7b2ea");
  expect(n4.filter(row => row.meaningReview?.reason.startsWith("N4 second literal example cohort:"))).toHaveLength(104);
  const { source } = await loadJapaneseStudyArtifacts(process.cwd());
  expectReviewedExamples(source, "6a4011f27f", [229847, 9628722]);
  expectReviewedExamples(source, "6b240c6105", [226227, 125561]);
  expectReviewedExamples(source, "8063587e53", [210673, 210672]);
  expectReviewedExamples(source, "912c269668", [166408, 104990]);
  const computer = expectReviewedExamples(source, "918e096f88", [213069, 217271]);
  expect(computer.content).toMatchObject({ word: "コンピュータ", reading: "コンピュータ" });
  expect(computer.content.other_readings).toContain("コンピューター");
  const expectedForm = expectReviewedExamples(source, "7a0b48d3e5", []);
  expect(expectedForm.content.other_readings).toContain("やっぱり");
  expect(summary.counts).toMatchObject({ units: 10291, sourceRecords: 10307, meaningsToReview: 6, constructionMeanings: 0, phraseAttestedMeanings: 6 });
  expect(summary.publicationChanged).toBe(false);
}, 30_000);

test.runIf(cached)("N4 literal targets distinguish senses, grammatical roles and changed translation propositions", async () => {
  const { source } = await loadJapaneseStudyArtifacts(process.cwd());
  for (const [id, sentenceIds] of new Map<string, number[]>([
    ["0039e17a55", []], // About time differs from soon/gradually.
    ["038f67b635", [123723]], // Nominalization differs from thing/matter.
    ["06aec1d647", [205610]], // Beneficiary differs from in-order-to purpose.
    ["074e70b529", []], // To it differs from moreover; reciprocity is also added in the companion.
    ["0787fd5472", [148987]], // Amusement rides differ from transport vehicles.
    ["1ad2f6d941", []], // Meals as food objects differ from the reviewed having-a-meal activity.
    ["1f5a7d8e07", []], // The addressee's daughter differs from young lady.
    ["29b43fab16", [124975]], // Awkward smile differs from smirk; male is also added.
    ["2ef2e06612", [79549]], // Please remember differs from I must remind you.
    ["34071d7901", [208274]], // Another helping differs from substitution.
    ["3d1727a56f", [191503]], // Unreasonable differs from impossible.
    ["4bdd43130b", []], // Receipt differs from reception desk; the companion translation also needs repair.
    ["4fbc32438d", []], // Missing temperature scale and figurative enthusiasm do not teach the medical-fever sense.
    ["505c1fd62e", [207838]], // Worm differs from the selected insect sense.
    ["53162e310d", [236216]], // A courthouse differs from the metropolitan government office.
    ["56a36774ce", [212861]], // Ancestry differs from bodily blood.
    ["5c27cba3be", [158961]], // Girls differs from familial daughter.
  ])) {
    const card = expectReviewedExamples(source, id, sentenceIds);
    expect(card.originalContent?.examples).toHaveLength(2);
    expect(card.content.reading).toBe(card.meaningReviewBefore?.reading);
    expect(card.content.level).toBe(card.meaningReviewBefore?.level);
  }
}, 30_000);

test.runIf(cached)("reviews the first 150 remaining N4 records while retaining valid senses, permission and natural translations", async () => {
  const { records, summary } = await loadJapaneseStudyContentReview(process.cwd());
  const n4 = records.filter(row => "written" in row).filter(row => row.introductionLevel === "N4");
  const cohort = n4.filter(row => {
    const selection = row.meaningReview?.examples;
    return selection && [...selection.keep, ...selection.omit].some(decision => decision.reason.startsWith("N4 first literal example cohort:"));
  });
  expect(cohort).toHaveLength(150);
  expect(cohort[0]?.id).toBe("ja-vocabulary:0039e17a55");
  expect(cohort.at(-1)?.id).toBe("ja-vocabulary:5f81e206e3");
  expect(n4.filter(row => row.meaningReview?.reason.startsWith("N4 first literal example cohort:"))).toHaveLength(110);
  const { source } = await loadJapaneseStudyArtifacts(process.cwd());
  expectReviewedExamples(source, "0963c50b58", [75797, 163186]);
  expectReviewedExamples(source, "25d649bd20", [193543, 79702]);
  expectReviewedExamples(source, "42f05076b3", [200604, 194206]);
  expectReviewedExamples(source, "4c9297421b", [197661]);
  expectReviewedExamples(source, "4e5dab579c", [79711, 84780]);
  expectReviewedExamples(source, "5bd8adf14c", [198836, 161183]);
  expectReviewedExamples(source, "5f81e206e3", [233649, 150058]);
  const partner = cohort.find(row => row.id === "ja-vocabulary:0963c50b58");
  expect(partner?.meaningReview?.examples?.keep.map(({ index, sense }) => ({ index, sense }))).toEqual([
    { index: 0, sense: 1 }, { index: 1, sense: 2 },
  ]);
  expect(summary.counts).toMatchObject({ units: 10291, sourceRecords: 10307, meaningsToReview: 6, constructionMeanings: 0, phraseAttestedMeanings: 6 });
  expect(summary.publicationChanged).toBe(false);
}, 30_000);

test.runIf(cached)("N4 examples distinguish movement, appearance, auxiliaries, readings and translation propositions", async () => {
  const { source } = await loadJapaneseStudyArtifacts(process.cwd());
  for (const [id, sentenceIds, meanings] of [
    ["0c27b9183f", [234410], ["to be in sight"]], // Seeming nice differs from being visible.
    ["2139fab218", [229318], ["to do"]], // Went does not match the annotated おこなった.
    ["47cc7185d5", [], ["(humble) to receive"]], // Receiving an object differs from the beneficiary auxiliary.
    ["4c3461199c", [], ["tomorrow"]], // Neither example establishes this card's あす reading.
    ["5d8e0ae01f", [90382], ["to withdraw"]], // Bringing out qualities differs from withdrawing money.
    ["6701f8cbba", [], ["to exceed"]], // Excessive-degree suffix and elapsed time differ from exceeding.
    ["76d4bcd098", [], ["within"]], // A different reading and one's home do not illustrate within.
    ["8fbe6ab329", [], ["stubborn", "firm (not viscous or easily moved)"]], // Tight and formal differ from these senses.
    ["981ee66f59", [], ["to fall", "to drop"]], // Exam failure and server downtime differ from physical falling.
    ["99de4451f7", [80506], ["to wake"]], // Sitting up differs from waking someone.
    ["d177796b00", [], ["to continue"]], // Continuative auxiliaries differ from the selected standalone verb.
  ] as const) {
    const card = expectReviewedExamples(source, id, [...sentenceIds]);
    expect(card.originalContent?.examples).toHaveLength(2);
    expect(card.content.meanings).toEqual(meanings);
    expect(card.content.reading).toBe(card.meaningReviewBefore?.reading);
    expect(card.content.level).toBe(card.meaningReviewBefore?.level);
  }
}, 30_000);

test.runIf(cached)("N4 retains conjugations, eligible spellings, numeric forms and named subjects", async () => {
  const { source } = await loadJapaneseStudyArtifacts(process.cwd());
  for (const [id, sentenceIds] of new Map<string, number[]>([
    ["0114521256", [124179, 154867]], // Imperative and past train transfers.
    ["45d920815a", [141160, 203764]], // Eligible 船 spelling on the 舟 card.
    ["5bb88bc7a4", [215175, 217080]], // ご存知 spelling of knowing.
    ["69589e0288", [209615, 223218]], // Photographing and copying retain separate citations.
    ["8065461ace", [200305, 198161]], // 空いて explicitly annotates すいて.
    ["ced6d3f112", [234850]], // FAX spelling stays; the concessive mistranslation does not.
    ["de718a81e9", [174492, 143780]], // Physical depth, including productive 深さ.
    ["e9c1a3ae2c", [152721]], // Physical passage, rather than going by a name.
    ["ec43853e0f", [225672, 114273]], // Cookie is a proper name in the raising example.
    ["eef262a7dd", [161991]], // Numeric spelling preserves a two-storey building.
    ["ef537ea4a9", [208034]], // Grasping a hand differs from hailing a taxi.
    ["fceb1b247e", [166220, 197141]], // Kana and katakana grapes.
  ])) expectReviewedExamples(source, id, sentenceIds);

}, 30_000);

test.runIf(cached)("N4 depth, passage and grasping select eligible senses while preserving existing English definitions", async () => {
  const { records } = await loadJapaneseStudyContentReview(process.cwd());
  for (const [id, text, entryId, gloss] of [
    ["de718a81e9", "deep", "1362640", "deep (hole, forest, snow, etc.)"],
    ["e9c1a3ae2c", "to go through", "1433030", "to pass through"],
  ]) {
    const row = records.find(row => row.id === `ja-vocabulary:${id}`);
    if (!row || !("written" in row)) throw new Error(`Missing vocabulary ${id}`);
    expect(row.meanings).toEqual([{ text, status: "reviewed-equivalent", evidence: [{ entryId, sense: 1, gloss }] }]);
    expect(row.meaningReview?.action).toBe("retain");
    expect(row.meaningReviewBefore?.meanings).toEqual([text]);
  }
  const grasp = records.find(row => row.id === "ja-vocabulary:ef537ea4a9");
  if (!grasp || !("written" in grasp)) throw new Error("Missing grasping record");
  expect(grasp.meanings).toEqual([{ text: "to seize", status: "exact", evidence: [{ entryId: "1597780", sense: 2, gloss: "to seize" }] }]);
}, 30_000);

test.runIf(cached)("accounts for the complete N4 nonliteral cohort without treating valid retained forms as errors", async () => {
  const { records, summary } = await loadJapaneseStudyContentReview(process.cwd());
  const n4 = records.filter(row => "written" in row).filter(row => row.introductionLevel === "N4");
  expect(n4).toHaveLength(643);
  expect(n4.filter(row => row.examples.some(example => !example.literalTarget) && !row.meaningReview?.examples)).toHaveLength(0);
  const cohort = n4.filter(row => {
    const selection = row.meaningReview?.examples;
    return selection && [...selection.keep, ...selection.omit].some(decision => decision.reason.startsWith("N4 nonliteral example cohort:"));
  });
  expect(cohort).toHaveLength(177);
  expect(cohort[0]?.id).toBe("ja-vocabulary:0114521256");
  expect(cohort.at(-1)?.id).toBe("ja-vocabulary:fceb1b247e");
  expect(n4.filter(row => row.meaningReview?.reason.startsWith("N4 nonliteral example cohort:"))).toHaveLength(118);
  expect(summary.counts).toMatchObject({ units: 10291, sourceRecords: 10307, meaningsToReview: 6, constructionMeanings: 0, phraseAttestedMeanings: 6 });
  expect(summary.publicationChanged).toBe(false);
}, 30_000);
