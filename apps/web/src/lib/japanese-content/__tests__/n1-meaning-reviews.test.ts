import { access } from "node:fs/promises";
import { expect, test } from "vitest";
import { loadJapaneseStudyArtifacts } from "../study-artifacts";
import { loadJapaneseStudyContentReview } from "../study-content-review";
import { expectReviewedCard } from "./reviewed-card-assertions";

const cached = await access(".cache/japanese-content/study-v1.json").then(() => true, () => false);

test.runIf(cached)("the final N1 cohort separates ethnicity, readings, counters, grammatical roles and quantities", async () => {
  const { source } = await loadJapaneseStudyArtifacts(process.cwd());
  const expected: Record<string, string[]> = {
    "ebea08a82f": ["antipathy", "animosity", "antagonism"],
    "ed378b5868": ["previously", "already", "for some time"],
    "edb3e0745a": ["the teaching profession"],
    "eda690b2a4": ["type (of goods)", "kind", "breed", "variety", "cultivar"],
    "f7acf9c5b4": ["as much as possible", "to the best of one's ability", "diligently"],
    "f95af79628": ["people", "race", "nation", "ethnic group"],
    "fbe9c362bd": ["hero", "warrior", "manly person"],
    "fc4763325c": ["really (seem, appear, etc.)", "in that way"],
    "f3d5f7044e": ["counter for questions"],
    "fe6273e5ef": ["series", "chain", "two reams (i.e. 1000 sheets of paper)"],
    "f907fc3a9b": ["confiscation", "forfeiture"],
    "f332f3e366": ["timely", "run-scoring hit", "RBI hit"],
    "f37b92c192": ["clinical records", "patient's chart"],
    "f3f52aaa64": ["democracy", "popular sovereignty"],
    "f8ba57f00f": ["name of an imperial era (e.g. Heisei, Shōwa)", "Japanese era name"],
    "f72997fceb": ["throwing in", "investment", "commitment (of funds, personnel, etc.)"],
    "f773197117": ["cooperation", "conciliation", "harmony"],
    "ff02641ef7": ["to be used to", "to train", "to teach manners", "to baste", "to tack (in needlework)", "to plant (esp. rice seedlings)"],
    "fe60adf28d": ["mobilization", "going into action", "being dispatched"],
    "fac8d25e69": ["saliva", "spit", "spittle"],
    "f3c62d6d70": ["one breath", "pause", "small amount of effort"],
    "f3203359ee": ["servant (esp. a samurai's attendant)", "chivalrous man (Edo period)"],
    "fd5a222e6e": ["counter for small animals", "roll of cloth"],
  };
  for (const [id, meanings] of Object.entries(expected)) {
    const card = expectReviewedCard(source, id, meanings);
    if (id === "ed378b5868") {
      expect(card.content.examples).toEqual([]);
      expect(card.originalContent?.examples).toHaveLength(1);
    }
    if (id === "fbe9c362bd") expect(card.content.reading).toBe("じょうふ");
    if (id === "f3203359ee") expect(card.content.reading).toBe("やっこ");
    if (id === "f95af79628") expect(card.content.examples.map(example => example.tatoeba_id)).toEqual([210648]);
    if (id === "ff02641ef7") expect(card.content.examples.map(example => example.tatoeba_id)).toEqual([175232, 106534]);
  }
}, 30_000);

test.runIf(cached)("finishes N5–N1 dictionary and construction meaning flags while preserving separate phrase attestations", async () => {
  const { records, summary } = await loadJapaneseStudyContentReview(process.cwd());
  const vocabulary = records.filter(row => row.kind === "vocabulary");
  expect(vocabulary.flatMap(row => row.meanings.filter(meaning => ["needs-review", "construction"].includes(meaning.status))).length).toBe(0);
  const n1 = vocabulary.filter(row => row.introductionLevel === "N1");
  expect(n1.filter(row => "meaningReview" in row && row.meaningReview)).toHaveLength(1325);
  expect(n1.filter(row => row.id > "ja-vocabulary:ea13ce8188" && "meaningReview" in row && row.meaningReview)).toHaveLength(116);
  const construction = vocabulary.find(row => row.id === "ja-vocabulary:24113c7b64");
  expect(construction).toMatchObject({
    meanings: [
      { text: "brilliantly", status: "reviewed-equivalent", evidence: [{ entryId: "1569020", sense: 1, gloss: "brilliant" }] },
      { text: "brightly", status: "reviewed-equivalent", evidence: [{ entryId: "1569020", sense: 1, gloss: "bright" }] },
    ],
    meaningReview: { action: "retain", meanings: [{ relation: "equivalent" }, { relation: "equivalent" }] },
    dictionarySenses: [{ entryId: "1569020", pairAllowed: false }],
  });
  const phrases = vocabulary.filter(row => row.meanings.some(meaning => meaning.status === "phrase-attested"));
  expect(phrases.map(row => row.id)).toEqual(["ja-vocabulary:321ba5716a", "ja-vocabulary:3db8531d3b", "ja-vocabulary:91b50bd069", "ja-vocabulary:feb110fb03"]);
  expect(phrases.flatMap(row => row.meanings)).toHaveLength(6);
  const { source, study } = await loadJapaneseStudyArtifacts(process.cwd());
  for (const [id, primary, entry, meanings] of [
    ["ed2719ab9d", "1108540", "2844127", ["fan", "fun"]],
    ["ef321ac2d3", "1119210", "2845313", ["base", "bass"]],
    ["f6ece0aafc", "1124390", "2853387", ["volt", "bolt"]],
  ] as const) {
    const card = source.cards.find(card => card.id === `ja-vocabulary:${id}`);
    if (card?.kind !== "vocabulary") throw new Error(`Missing vocabulary ${id}`);
    expect(card.dictionaryEvidence.entryIds).toEqual(expect.arrayContaining([primary, entry]));
    expect(card.content.meanings).toEqual(meanings);
  }
  const bright = source.cards.find(card => card.id === "ja-vocabulary:24113c7b64");
  if (bright?.kind !== "vocabulary") throw new Error("Missing 煌々と construction");
  expect(bright.content.examples.map(example => example.tatoeba_id)).toEqual([3468683, 408935]);
  expect(study.recordToUnit["ja-vocabulary:f95af79628"]).not.toBe(study.recordToUnit["ja-vocabulary:78fbae6020"]);
  expect(study.recordToUnit["ja-vocabulary:fbe9c362bd"]).not.toBe(study.recordToUnit["ja-vocabulary:50525927ee"]);
  expect(summary.counts).toMatchObject({ units: 10291, sourceRecords: 10307, meaningsToReview: 6, constructionMeanings: 0, phraseAttestedMeanings: 6 });
  expect(summary.publicationChanged).toBe(false);
}, 30_000);

test.runIf(cached)("the eighth N1 cohort preserves active guidance, primary readings, degree categories and possession", async () => {
  const { source } = await loadJapaneseStudyArtifacts(process.cwd());
  const expected: Record<string, string[]> = {
    "cfaa0c9c42": ["to guide", "to lead", "to show the way"],
    "d6c56bc73f": ["during the night", "at night"],
    "d16c7a5e1e": ["precedent", "example"],
    "d19fa15a3f": ["chic", "stylish", "refined"],
    "d43a9fda61": ["tumour", "growth", "boil", "ulcer", "abscess", "rash", "pimple"],
    "ddff5ba694": ["master's (degree)"],
    "e1ea2bb61d": ["starting from scratch", "making a fresh start", "redoing", "visiting again"],
    "e02b1d0bdc": ["three-stringed Japanese lute", "shamisen"],
    "d7c788ac00": ["original text"],
    "deb93f291c": ["(personnel) change", "transfer", "reassignment"],
    "ddb35e549d": ["side (of something, or taking someone's side)", "part", "(watch) case"],
    "e7ce133582": ["hit", "success", "per", "each", "bite (of a fish on a hook)"],
    "cd8e0693bd": ["revision (of a rule, price, etc.)", "alteration", "change"],
    "e1ffadc5ac": ["revision (of text)", "alteration", "change"],
    "da6e6e95fb": ["to be granted", "to be given", "to give", "to bestow"],
    "dbe0f53624": ["prefix for forming ordinal numbers"],
    "e642ca265e": ["kotatsu", "table over an electric heater, with a hanging quilt to retain heat (orig. over a charcoal brazier in a floor well)"],
    "e4705834e5": ["possession", "having (on one's person)", "carrying (with one)"],
    "d777353b7e": ["the top (e.g. top ten)", "the best"],
  };
  for (const [id, meanings] of Object.entries(expected)) {
    const card = expectReviewedCard(source, id, meanings);
    if (["d6c56bc73f", "e1ea2bb61d", "da6e6e95fb", "e642ca265e"].includes(id)) {
      expect(card.content.examples).toEqual([]);
      expect(card.originalContent?.examples.length).toBeGreaterThan(0);
    }
    if (id === "d6c56bc73f") expect(card.content.reading).toBe("やちゅう");
    if (id === "d16c7a5e1e") expect(card.content.reading).toBe("ためし");
    if (id === "d19fa15a3f") expect(card.content.reading).toBe("いき");
    if (id === "cfaa0c9c42") expect(card.content.examples.map(example => example.tatoeba_id)).toEqual([86201, 96739]);
    if (id === "e7ce133582") expect(card.content.examples.map(example => example.tatoeba_id)).toEqual([187531, 74909]);
  }
}, 30_000);

test.runIf(cached)("resolves the eighth 150 N1 records while independently preserving ramp and rare eligible treasure", async () => {
  const { records, summary } = await loadJapaneseStudyContentReview(process.cwd());
  const cohort = records.filter(row => row.kind === "vocabulary" && row.introductionLevel === "N1" && row.id > "ja-vocabulary:cd7c2b10e4" && row.id <= "ja-vocabulary:ea13ce8188");
  expect(cohort.flatMap(row => row.meanings.filter(meaning => meaning.status === "needs-review")).length).toBe(0);
  // 落ち葉 and 乳 were already corrected in the initial reading/sense review.
  expect(cohort.filter(row => !["ja-vocabulary:db320989e5", "ja-vocabulary:df0cb2db26"].includes(row.id) && "meaningReview" in row && row.meaningReview)).toHaveLength(150);
  const { source, study } = await loadJapaneseStudyArtifacts(process.cwd());
  const lamp = source.cards.find(card => card.id === "ja-vocabulary:d0cc8bf9a9");
  if (lamp?.kind !== "vocabulary") throw new Error("Missing lamp/ramp record");
  expect(lamp.dictionaryEvidence.entryIds).toEqual(expect.arrayContaining(["1140360", "2842180"]));
  expect(lamp.content.meanings).toEqual(["lamp", "ramp", "headlight", "light"]);
  const writing = source.cards.find(card => card.id === "ja-vocabulary:d8a877df8f");
  if (writing?.kind !== "vocabulary") throw new Error("Missing したためる record");
  expect(writing.content.reading).toBe("したためる");
  expect(writing.content.meanings).toEqual(["to write up"]);
  expect(writing.content.examples.map(example => example.tatoeba_id)).toEqual([110091]);
  const treasure = source.cards.find(card => card.id === "ja-vocabulary:e33292ff3a");
  if (treasure?.kind !== "vocabulary") throw new Error("Missing 重宝 record");
  expect(treasure.content.meanings).toContain("priceless treasure");
  expect(study.recordToUnit["ja-vocabulary:cd8e0693bd"]).not.toBe(study.recordToUnit["ja-vocabulary:e1ffadc5ac"]);
  expect(study.recordToUnit["ja-vocabulary:d8a877df8f"]).not.toBe(study.recordToUnit["ja-vocabulary:e086a9e024"]);
  expect(summary.counts).toMatchObject({ units: 10291, sourceRecords: 10307 });
  expect(summary.publicationChanged).toBe(false);
}, 30_000);

test.runIf(cached)("the seventh N1 cohort separates anatomy, readings, ratios, institutions and transformations", async () => {
  const { source } = await loadJapaneseStudyArtifacts(process.cwd());
  const expected: Record<string, string[]> = {
    "b8b395d09e": ["thigh"],
    "c117100746": ["serious matter", "major incident"],
    "c6304d0283": ["magnification", "scale factor", "applicant-to-acceptance ratio"],
    "b966033b0e": ["to exchange (messages, greetings, arguments, etc.)"],
    "be2f217a46": ["to be stumped", "to be at a loss", "to be fed up", "to be annoyed"],
    "bb8010df59": ["dojo", "hall used for martial arts training", "manda (place of Buddhist practice or meditation, esp. the place under the bodhi tree where Buddha attained enlightenment)"],
    "bbe8e8b83e": ["nurturing", "rearing", "childcare", "day care"],
    "c59d6e396d": ["to disguise oneself (as)", "to take the form of (esp. in ref. to a spirit, fox, raccoon dog, etc.)", "to change (into)", "to change radically (for the better)"],
    "c73ec3073c": ["nth district of a town", "nth city block"],
    "cc76244cd1": ["inspector (third highest of the four administrative ranks of the ritsuryō system)", "old man"],
    "c261df67ce": ["slow", "gradual", "steady"],
    "bacad0baf0": ["department (of a university or hospital)", "branch of study", "family"],
    "cd7c2b10e4": ["cram school", "private tutoring school", "juku"],
    "b6d0a7d9d0": ["to get entangled", "to twine", "to be involved (e.g. of money in a matter)", "to pester"],
  };
  for (const [id, meanings] of Object.entries(expected)) {
    const card = expectReviewedCard(source, id, meanings);
    if (id === "c117100746") expect(card.content.reading).toBe("おおごと");
    if (id === "cc76244cd1") expect(card.content.reading).toBe("じょう");
    if (id === "c73ec3073c") {
      expect(card.content.examples).toEqual([]);
      expect(card.originalContent?.examples[0].en).toContain("40th Street");
    }
    if (id === "c261df67ce") expect(card.content.examples.map(example => example.tatoeba_id)).toEqual([88713]);
    if (id === "bacad0baf0") expect(card.content.examples.map(example => example.tatoeba_id)).toEqual([227598]);
    if (id === "b6d0a7d9d0") expect(card.content.examples.map(example => example.tatoeba_id)).toEqual([76235]);
  }
}, 30_000);

test.runIf(cached)("resolves the seventh 150 N1 records and independently preserves both lever and liver", async () => {
  const { records, summary } = await loadJapaneseStudyContentReview(process.cwd());
  const cohort = records.filter(row => row.kind === "vocabulary" && row.introductionLevel === "N1" && row.id > "ja-vocabulary:aec7b25baf" && row.id <= "ja-vocabulary:cd7c2b10e4");
  expect(cohort.flatMap(row => row.meanings.filter(meaning => meaning.status === "needs-review")).length).toBe(0);
  expect(cohort.filter(row => "meaningReview" in row && row.meaningReview)).toHaveLength(150);
  const { source, study } = await loadJapaneseStudyArtifacts(process.cwd());
  const lever = source.cards.find(card => card.id === "ja-vocabulary:bfef822f66");
  if (lever?.kind !== "vocabulary") throw new Error("Missing lever/liver record");
  expect(lever.dictionaryEvidence.entryIds).toEqual(expect.arrayContaining(["1145720", "2855138"]));
  expect(lever.content.meanings).toEqual(["lever", "liver"]);
  expect(lever.content.examples.map(example => example.tatoeba_id)).toEqual([192340, 74508]);
  expect(study.recordToUnit["ja-vocabulary:c117100746"]).not.toBe(study.recordToUnit["ja-vocabulary:de9d61dd71"]);
  expect(summary.counts).toMatchObject({ units: 10291, sourceRecords: 10307 });
  expect(summary.publicationChanged).toBe(false);
}, 30_000);

test.runIf(cached)("the sixth N1 cohort separates readings, area scale, sensitivity, grammar and transitive verbs", async () => {
  const { source } = await loadJapaneseStudyArtifacts(process.cwd());
  const expected: Record<string, string[]> = {
    "99d671e7c9": ["first sign of the Chinese calendar"],
    "a6da3499d8": ["variable measure of fabric (28.8 cm in width)", "for kimonos: at least 10 m in length", "300 tsubo (991.74 meters square, 0.24506 acres)"],
    "aa35e35b5e": ["sensitivity (e.g. of a measuring instrument)", "sensitivity (of film)"],
    "a8b71cab9b": ["to get twisted", "to get crooked", "to get warped"],
    "ad9000928d": ["to (make something) quiver", "to shake", "to vibrate"],
    "a017bb3c0c": ["honorific/polite/humble prefix"],
    "a5c6236db2": ["inflecting dependent word (in Japanese)", "bound auxiliary", "auxiliary verb (in languages other than Japanese)"],
    "a55ef652d7": ["capable person", "talented person"],
    "a50ce976f1": ["-like", "-ish", "-ical", "-ive"],
    "9ed26e130c": ["(wrestling) ring", "forum (e.g. for discussion)"],
    "a0f10b94be": ["tuberculosis", "TB", "concretion"],
    "9c552d88c0": ["therefore", "consequently", "accordingly", "for that reason"],
    "ade60dd5fd": ["to fit into (a box, frame, category, etc.)", "to settle down (into)", "to settle into (one's position)", "to be delivered", "to be paid (e.g. taxes)", "to be satisfied (e.g. with an answer)"],
  };
  for (const [id, meanings] of Object.entries(expected)) {
    const card = expectReviewedCard(source, id, meanings);
    if (["a8b71cab9b", "9c552d88c0", "ade60dd5fd"].includes(id)) {
      expect(card.content.examples).toEqual([]);
      expect(card.originalContent?.examples.length).toBeGreaterThan(0);
    }
    if (id === "99d671e7c9") expect(card.content.reading).toBe("きのえ");
    if (id === "a017bb3c0c") expect(card.content.reading).toBe("ご");
    if (id === "ad9000928d") expect(card.content.examples.map(example => example.tatoeba_id)).toEqual([87735, 107909]);
    if (id === "a5c6236db2") expect(card.content.examples.map(example => example.tatoeba_id)).toEqual([75172]);
    if (id === "a50ce976f1") expect(card.content.examples.map(example => example.tatoeba_id)).toEqual([75997]);
  }
}, 30_000);

test.runIf(cached)("resolves the sixth 150 N1 records while preserving independent readings and existing valid senses", async () => {
  const { records, summary } = await loadJapaneseStudyContentReview(process.cwd());
  const cohort = records.filter(row => row.kind === "vocabulary" && row.introductionLevel === "N1" && row.id > "ja-vocabulary:91a314706a" && row.id <= "ja-vocabulary:aec7b25baf");
  expect(cohort.flatMap(row => row.meanings.filter(meaning => meaning.status === "needs-review")).length).toBe(0);
  // 有様 was already corrected in the initial reading/sense review.
  expect(cohort.filter(row => row.id !== "ja-vocabulary:92893bbd77" && "meaningReview" in row && row.meaningReview)).toHaveLength(150);
  const { source, study } = await loadJapaneseStudyArtifacts(process.cwd());
  const birth = source.cards.find(card => card.id === "ja-vocabulary:a41e86909d");
  if (birth?.kind !== "vocabulary") throw new Error("Missing birth/production record");
  expect(birth.content.meanings).toEqual(["(child)birth", "delivery", "production (of goods)"]);
  expect(study.recordToUnit["ja-vocabulary:a017bb3c0c"]).not.toBe(study.recordToUnit["ja-vocabulary:9c851c43f7"]);
  expect(summary.counts).toMatchObject({ units: 10291, sourceRecords: 10307 });
  expect(summary.publicationChanged).toBe(false);
}, 30_000);

test.runIf(cached)("the fifth N1 cohort distinguishes folk customs, morae, subfamilies, giving and primary readings", async () => {
  const { source } = await loadJapaneseStudyArtifacts(process.cwd());
  const expected: Record<string, string[]> = {
    "7533eeec58": ["(not) well", "(not) enough", "(not) sufficiently"],
    "75abef3a63": ["bed", "sickbed", "alcove", "straw \"core\" of a tatami mat"],
    "771504a003": ["characteristic (of)", "peculiar (to)", "inherent (in)", "eigen-"],
    "78fbae6020": ["folk customs", "folkways", "ethnic customs"],
    "7911dfc293": ["France"],
    "8598ddba78": ["sentiment", "emotions", "one's feelings", "one's heart"],
    "8645802338": ["subfamily"],
    "873a4f5e09": ["tanka", "31-mora Japanese poem"],
    "88c5764dde": ["waste (of money, time, etc.)", "squandering", "frittering away"],
    "898777096e": ["10^32", "hundred nonillion"],
    "8ddba4675b": ["to give", "to do ..."],
    "8ee5c7c8db": ["dancer (in a Japanese dance performance)"],
    "904529718c": ["lavish", "luxurious", "showy", "gaudy"],
    "911636ba99": ["evening glow", "red sunset", "afterglow (of sunset)"],
  };
  for (const [id, meanings] of Object.entries(expected)) {
    const card = expectReviewedCard(source, id, meanings);
    if (id === "873a4f5e09") expect(card.content.examples).toEqual([]);
    if (id === "7911dfc293") expect(card.content.reading).toBe("ふつ");
    if (id === "904529718c") expect(card.content.reading).toBe("かしゃ");
    if (id === "8ee5c7c8db") expect(card.content.reading).toBe("たちかた");
    if (id === "873a4f5e09") expect(card.originalContent?.examples[0].en).toContain("31-syllable");
  }
  const loose = expectReviewedCard(source, "8cb7651d8e", ["careless (with something, esp. time, money, promises, etc.)", "loose-fitting"]);
  expect(loose.content.examples.map(example => example.tatoeba_id)).toEqual([2414194]);
  expect(loose.originalContent?.examples.map(example => example.tatoeba_id)).toEqual([2414194, 3154130]);
}, 30_000);

test.runIf(cached)("resolves the fifth 150 N1 records while preserving independently evidenced lace and existing rare senses", async () => {
  const { records, summary } = await loadJapaneseStudyContentReview(process.cwd());
  const cohort = records.filter(row => row.kind === "vocabulary" && row.introductionLevel === "N1" && row.id > "ja-vocabulary:74638a00a2" && row.id <= "ja-vocabulary:91a314706a");
  expect(cohort.flatMap(row => row.meanings.filter(meaning => meaning.status === "needs-review").map(meaning => [row.id, meaning.text]))).toEqual([]);
  expect(cohort.filter(row => "meaningReview" in row && row.meaningReview)).toHaveLength(150);
  const { source, study } = await loadJapaneseStudyArtifacts(process.cwd());
  const lace = source.cards.find(card => card.id === "ja-vocabulary:77aabada2a");
  if (lace?.kind !== "vocabulary") throw new Error("Missing race/lace record");
  expect(lace.dictionaryEvidence.entryIds).toEqual(expect.arrayContaining(["1144380", "2848479"]));
  expect(lace.content.meanings).toEqual(["race", "lace"]);
  const protagonist = source.cards.find(card => card.id === "ja-vocabulary:818ef1c8d8");
  if (protagonist?.kind !== "vocabulary") throw new Error("Missing protagonist record");
  expect(protagonist.content.meanings).toContain("head of household");
  expect(study.recordToUnit["ja-vocabulary:78fbae6020"]).not.toBe(study.recordToUnit["ja-vocabulary:f95af79628"]);
  expect(summary.counts).toMatchObject({ units: 10291, sourceRecords: 10307 });
  expect(summary.publicationChanged).toBe(false);
}, 30_000);

test.runIf(cached)("the fourth N1 cohort separates negation, gatherings, heat quantity and transitive acceptance", async () => {
  const { source } = await loadJapaneseStudyArtifacts(process.cwd());
  const expected: Record<string, string[]> = {
    "5b32f6a19b": ["(young) girl", "young lady", "maiden"],
    "5b9fc8d12f": ["to accept", "to receive (an application)"],
    "5d1ad6cf31": ["no", "nay"],
    "5da1033412": ["gathering (esp. Buddhist, festive, etc.)"],
    "5dd7bb9fa5": ["decision", "settlement", "confirmation"],
    "5e72c71c76": ["burying in the ground", "having underground deposits"],
    "5f947c1f81": ["counter for laps or circuits", "perimeter", "Chou dynasty"],
    "61a475aebb": ["hail (esp. hailballs under 5 mm)", "roasted mochi pieces (usu. flavoured with soy sauce, etc.)"],
    "64e8f7eda0": ["quantity of heat (e.g. in calories, BTU, etc.)", "heat value", "calorific value"],
    "661870fff1": ["umeboshi", "pickled dried plum"],
    "6c00760239": ["measurement error", "calculation error", "discrepancy"],
    "6f6edac49d": ["involving only the parties concerned", "tete-a-tete"],
    "6fd972e632": ["timetable", "schedule"],
    "6fed3799fa": ["one line", "earnest", "single-minded"],
  };
  for (const [id, meanings] of Object.entries(expected)) {
    const card = expectReviewedCard(source, id, meanings);
    if (["5b32f6a19b", "5da1033412", "6f6edac49d", "6fed3799fa"].includes(id)) {
      expect(card.content.examples).toEqual([]);
      expect(card.originalContent?.examples).toHaveLength(["5da1033412", "6f6edac49d"].includes(id) ? 1 : 2);
    }
    if (id === "5b32f6a19b") expect(card.content.reading).toBe("おとめ");
    if (id === "5da1033412") expect(card.content.reading).toBe("え");
  }
}, 30_000);

test.runIf(cached)("resolves the fourth 150 N1 records while independently retaining fish, south, understanding and crab meanings", async () => {
  const { records, summary } = await loadJapaneseStudyContentReview(process.cwd());
  const cohort = records.filter(row => row.kind === "vocabulary" && row.introductionLevel === "N1" && row.id > "ja-vocabulary:5aa2622835" && row.id <= "ja-vocabulary:74638a00a2");
  expect(cohort.flatMap(row => row.meanings.filter(meaning => meaning.status === "needs-review").map(meaning => [row.id, meaning.text]))).toEqual([]);
  // 収まる was already reviewed in the initial sense-restriction batch.
  expect(cohort.filter(row => row.id !== "ja-vocabulary:6ebf36ca63" && "meaningReview" in row && row.meaningReview)).toHaveLength(150);
  const { source, study } = await loadJapaneseStudyArtifacts(process.cwd());
  expect(study.recordToUnit["ja-vocabulary:67f7a8d49f"]).not.toBe(study.recordToUnit["ja-vocabulary:84e465b526"]);
  for (const [id, entry, meaning] of [["64eb41fae7", "1000525", "saw-edged perch (Niphon spinosus)"], ["67f7a8d49f", "2869020", "south"], ["6325479166", "2511770", "understanding"], ["74638a00a2", "2846405", "crab"]]) {
    const card = source.cards.find(card => card.id === `ja-vocabulary:${id}`);
    if (card?.kind !== "vocabulary") throw new Error(`Missing vocabulary ${id}`);
    expect(card.dictionaryEvidence.entryIds).toContain(entry);
    expect(card.content.meanings).toContain(meaning);
  }
  expect(summary.counts).toMatchObject({ units: 10291, sourceRecords: 10307 });
  expect(summary.publicationChanged).toBe(false);
}, 30_000);

test.runIf(cached)("the third N1 cohort preserves readings, passive dyeing, grammatical roles and word categories", async () => {
  const { source } = await loadJapaneseStudyArtifacts(process.cwd());
  const expected: Record<string, string[]> = {
    "3f741eec1a": ["together with", "both", "all", "neither", "including ..."],
    "40679c4e7e": ["threat", "menace", "coercion", "blackmail"],
    "4445a67af3": ["all people", "everybody"],
    "46d28a7430": ["self-awareness", "awareness (of one's position, abilities, duty, etc.)"],
    "48c30478f7": ["Japanese word of Chinese origin", "Sino-Japanese word"],
    "49b24ec6dc": ["true state", "actual condition", "reality"],
    "4b235d70bd": ["correct answer", "right solution", "correct interpretation"],
    "4d13045508": ["to be dyed", "to be tainted", "to be steeped"],
    "4f60e61ae2": ["first visit to inn, restaurant, etc. without an introduction"],
    "4fcd36d323": ["long work", "(full-length) novel", "feature-length film"],
    "52a27aec4f": ["onset of an illness", "falling ill"],
    "553d0c1010": ["investigation (e.g. into someone's guilt)", "questioning", "catching up"],
    "578447ed67": ["qian (one of the trigrams of the I Ching: heaven, northwest)"],
    "5aa2622835": ["proposal", "request", "offer"],
  };
  for (const [id, meanings] of Object.entries(expected)) {
    const card = expectReviewedCard(source, id, meanings);
    if (id === "578447ed67") {
      expect(card.content.reading).toBe("けん");
      expect(card.content.examples).toEqual([]);
      expect(card.originalContent?.examples).toHaveLength(2);
    }
    if (id === "4445a67af3") {
      expect(card.content.reading).toBe("ばんじん");
      expect(card.content.examples.map(example => example.tatoeba_id)).toEqual([168149]);
      expect(card.originalContent?.examples.map(example => example.tatoeba_id)).toEqual([168149, 220666]);
    }
  }
}, 30_000);

test.runIf(cached)("resolves the third 150 N1 records with independently evidenced pear and vest homonyms", async () => {
  const { records, summary } = await loadJapaneseStudyContentReview(process.cwd());
  const cohort = records.filter(row => row.kind === "vocabulary" && row.introductionLevel === "N1" && row.id > "ja-vocabulary:3c74d17c1d" && row.id <= "ja-vocabulary:5aa2622835");
  expect(cohort.flatMap(row => row.meanings.filter(meaning => meaning.status === "needs-review").map(meaning => [row.id, meaning.text]))).toEqual([]);
  // 水気 and 上手 were already reviewed in the initial sense-restriction batch.
  expect(cohort.filter(row => !["ja-vocabulary:434fc61861", "ja-vocabulary:4436cfdbab"].includes(row.id) && "meaningReview" in row && row.meaningReview)).toHaveLength(150);
  const { source } = await loadJapaneseStudyArtifacts(process.cwd());
  for (const [id, entry, meaning] of [["47e4de1f65", "2849141", "European pear"], ["4f4b90bb7c", "2856634", "vest"]]) {
    const card = source.cards.find(card => card.id === `ja-vocabulary:${id}`);
    if (card?.kind !== "vocabulary") throw new Error(`Missing vocabulary ${id}`);
    expect(card.dictionaryEvidence.entryIds).toContain(entry);
    expect(card.content.meanings).toContain(meaning);
  }
  expect(summary.counts).toMatchObject({ units: 10291, sourceRecords: 10307 });
  expect(summary.publicationChanged).toBe(false);
}, 30_000);

test.runIf(cached)("the second N1 cohort separates ordinal position, primary readings, false friends and verb direction", async () => {
  const { source } = await loadJapaneseStudyArtifacts(process.cwd());
  const expected: Record<string, string[]> = {
    "1e2cd74d5d": ["the Rabbit (fourth sign of the Chinese zodiac)", "hour of the Rabbit (around 6am, 5-7am, or 6-8am)", "east", "second month in the lunar calendar"],
    "1f05b6ec3e": ["weakness", "the weak", "a little less than"],
    "1f3b016d79": ["top and bottom", "up and down", "high and low"],
    "208f1838bd": ["hostage"],
    "21d892acef": ["the nth ..."],
    "26c17d8895": ["coast (esp. as seen from the water)", "shore", "countryside"],
    "27d78c0d94": ["style", "manner", "way"],
    "32afdf9540": ["occasionally", "now and then", "sometimes"],
    "337e74cd80": ["cheating (on an examination)", "cribbing"],
    "339518d459": ["incision"],
    "376a26250c": ["tone color", "tone quality", "timbre"],
    "3837730fa3": ["to consist of", "to be concluded (e.g. of an agreement)", "to hold true (e.g. of a theory)", "to be viable (of a business, lifestyle, etc.)"],
    "3c74d17c1d": ["younger brother (of an older brother)", "younger sister (of an older sister)"],
  };
  for (const [id, meanings] of Object.entries(expected)) {
    const card = expectReviewedCard(source, id, meanings);
    if (["26c17d8895", "27d78c0d94", "3c74d17c1d"].includes(id)) {
      expect(card.content.examples).toEqual([]);
      expect(card.originalContent?.examples).toHaveLength(2);
    }
    if (id === "26c17d8895") expect(card.content.reading).toBe("じかた");
    if (id === "3c74d17c1d") expect(card.content.reading).toBe("おと");
    if (id === "376a26250c") {
      expect(card.content.examples.map(example => example.tatoeba_id)).toEqual([198358]);
      expect(card.originalContent?.examples.map(example => example.tatoeba_id)).toEqual([223869, 198358]);
    }
  }
}, 30_000);

test.runIf(cached)("resolves the next 150 N1 records with independently evidenced hall/hole, punk, yes, shogi and tray senses", async () => {
  const { records, summary } = await loadJapaneseStudyContentReview(process.cwd());
  const cohort = records.filter(row => row.kind === "vocabulary" && row.introductionLevel === "N1" && row.id > "ja-vocabulary:1e2592203e" && row.id <= "ja-vocabulary:3c74d17c1d");
  expect(cohort.flatMap(row => row.meanings.filter(meaning => meaning.status === "needs-review").map(meaning => [row.id, meaning.text]))).toEqual([]);
  // 手数 was reviewed in 5l; the final 煌々と construction review is separate from these 150 direct records.
  expect(cohort.filter(row => !["ja-vocabulary:37cffd52d1", "ja-vocabulary:24113c7b64"].includes(row.id) && "meaningReview" in row && row.meaningReview)).toHaveLength(150);
  const { source } = await loadJapaneseStudyArtifacts(process.cwd());
  for (const [id, entry, meaning] of [["2352843605", "2841290", "hole"], ["24aad19c86", "2846311", "punk (music, fashion)"], ["290e4e8db6", "2872968", "promoted pawn"], ["299fd7ae70", "2843921", "yes"], ["3089867b81", "2843630", "shallow tray (usu. steel or plastic)"]]) {
    const card = source.cards.find(card => card.id === `ja-vocabulary:${id}`);
    if (card?.kind !== "vocabulary") throw new Error(`Missing vocabulary ${id}`);
    expect(card.dictionaryEvidence.entryIds).toContain(entry);
    expect(card.content.meanings).toContain(meaning);
  }
  expect(summary.counts).toMatchObject({ units: 10291, sourceRecords: 10307 });
  expect(summary.publicationChanged).toBe(false);
}, 30_000);

test.runIf(cached)("the first N1 cohort separates word readings, radicals, duty, room and calendar meanings", async () => {
  const { source } = await loadJapaneseStudyArtifacts(process.cwd());
  const expected: Record<string, string[]> = {
    "00c77c36b3": ["to be fit (for a role)", "to be qualified (for)", "to be equal (to a task)"],
    "0101791a03": ["foam", "form"],
    "0117a16846": ["news (from someone)", "letter", "(someone's) whereabouts"],
    "054813c4c2": ["arms", "weapon", "ordnance"],
    "073662256e": ["bathroom"],
    "084bab949b": ["to satisfy (conditions, one's appetite, etc.)", "to fill (e.g. a cup)", "to fulfill"],
    "096c8b698e": ["the Sheep (eighth sign of the Chinese zodiac)", "hour of the Sheep (around 2pm, 1-3pm, or 2-4pm)", "south-southwest", "sixth month of the lunar calendar"],
    "0b6b5995e3": ["left-hand radical of a character"],
    "0f1bb19bcf": ["pursuit of knowledge", "studying", "learning", "training"],
    "13c19c8395": ["stickiness", "viscosity"],
    "19a6178bec": ["advance (into a new market, industry, etc.)", "advance (to the next round of a competition)"],
    "1d578a6738": ["certainly", "certain", "definite"],
  };
  for (const [id, meanings] of Object.entries(expected)) {
    const card = expectReviewedCard(source, id, meanings);
    if (["0101791a03", "0b6b5995e3", "1d578a6738"].includes(id)) {
      expect(card.content.examples).toEqual([]);
      expect(card.originalContent?.examples).toHaveLength(2);
    }
    if (id === "1d578a6738") expect(card.content.reading).toBe("いちじょう");
  }
}, 30_000);

test.runIf(cached)("resolves the first 150 N1 records with independent foam, hangar, hunger and sheet evidence", async () => {
  const { records, summary } = await loadJapaneseStudyContentReview(process.cwd());
  const cohort = records.filter(row => row.kind === "vocabulary" && row.introductionLevel === "N1" && row.id <= "ja-vocabulary:1e2592203e");
  expect(cohort.flatMap(row => row.meanings.filter(meaning => meaning.status === "needs-review").map(meaning => [row.id, meaning.text]))).toEqual([]);
  // 奨励 was already corrected in the initial cross-level sense-restriction batch.
  expect(cohort.filter(row => row.id !== "ja-vocabulary:002ee4fb5a" && "meaningReview" in row && row.meaningReview)).toHaveLength(150);
  const { source } = await loadJapaneseStudyArtifacts(process.cwd());
  for (const [id, entry, meaning] of [["0101791a03", "2855933", "foam"], ["02e6ac02bf", "2861509", "hangar"], ["02e6ac02bf", "2861510", "hunger"], ["1b60cfb2ae", "2851348", "sheet"]]) {
    const card = source.cards.find(card => card.id === `ja-vocabulary:${id}`);
    if (card?.kind !== "vocabulary") throw new Error(`Missing vocabulary ${id}`);
    expect(card.dictionaryEvidence.entryIds).toContain(entry);
    expect(card.content.meanings).toContain(meaning);
  }
  expect(summary.counts).toMatchObject({ units: 10291, sourceRecords: 10307 });
  expect(summary.publicationChanged).toBe(false);
}, 30_000);
