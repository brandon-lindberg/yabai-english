import { access } from "node:fs/promises";
import { expect, test } from "vitest";
import { loadJapaneseStudyArtifacts } from "../study-artifacts";
import { loadJapaneseStudyContentReview } from "../study-content-review";
import { expectReviewedExamples } from "./reviewed-card-assertions";

const cached = await access(".cache/japanese-content/study-v1.json").then(() => true, () => false);

test.runIf(cached)("the first N2 example cohort distinguishes selected senses, grammatical roles and changed propositions", async () => {
  const { source } = await loadJapaneseStudyArtifacts(process.cwd());
  for (const [id, sentenceIds] of new Map<string, number[]>([
    ["021b9026a5", [145498]], // His adds car ownership.
    ["04779b98e7", [175288]], // Compensation uses another numbered sense.
    ["07926933b7", []], // Honorific going-out verbs do not establish the imminent-departure noun.
    ["0a5c26a710", []], // Ironic seeing differs from praying or begging.
    ["0e494228e5", [209576]], // Brand new uses another numbered sense.
    ["0ef2dfb416", [87837]], // Boy adds male gender to a child.
    ["0fd77d7f82", [91417]], // Sailing adds navigation to floating.
    ["102e6b2f3d", [150623]], // Hounded into quitting adds a completed outcome.
    ["1041182624", []], // Effects on grades or health differ from resounding.
    ["10cea4e1dc", [125658]], // Nearly colliding or meeting differs from actually passing.
    ["1122e34144", []], // Account entry and shadowing differ from attachment.
    ["159326fcca", [124113]], // We adds a plural wandering party.
    ["188fc097e5", [217640]], // Mountain threading uses another numbered sense.
    ["199861a72f", [186288]], // The setting-time claim needs mixture and environmental scope.
    ["1a15a8fe4a", []], // Withdrawal and road setback are separate senses.
    ["1e7604b6ba", [220981]], // Their adds ownership to these gloves.
    ["237d42a240", [225648]], // Very adds a degree to kindness, although the nominalization is valid.
    ["24727f461e", [2691523]], // Dialing is not the have-a-seat formula.
    ["278ce641d4", [177221]], // Medical help loses the urgent request for examination.
    ["27cd0cb3fc", []], // Inside-out clothing states differ from the turning verb.
    ["27ea53a472", [161071]], // Complaining uses another numbered sense.
    ["2c6792879b", [93444]], // Professor-to-colleague mismatch agrees with the prior shared omission.
    ["2d88041a40", [113349]], // Putting dishes in a sink does not establish soaking.
    ["2effe26e96", [78017]], // Watching out of sight uses another numbered sense.
    ["3089fb911f", [214402]], // Universal applicability differs from traffic-route connection.
    ["30d9cc84d3", [192059]], // The companion contains an unresolved reading marker.
    ["31df50f399", [226759]], // The companion contains an unresolved reading marker.
    ["32fc7863a8", [224218]], // You assigns an unstated overspicing actor.
    ["33932ce3b2", [208001]], // Help with parcels loses untying or unpacking.
    ["349c1849f2", []], // Merchandise differs from prizes; the companion needs particle repair.
    ["369ccb3349", [147623]], // Recalled memories use a separate sense.
    ["36c77eda04", [230690]], // Imagining differs from believing they longed for fame.
    ["38ac1ca047", [141729]], // His adds gender to a neutral sociologist.
    ["3b1a3c27ee", [138189]], // Shyly does not preserve the dazzled manner.
    ["3e928e1c44", [83327]], // Note does not clearly preserve writing-paper identity.
    ["3eb9301644", []], // Physical extension and postponement differ from prolongation.
    ["41ab03b928", [101413]], // A calamity striking differs from visiting or consoling.
    ["41c9221a62", []], // Present differs from past; occupied differs from blocked or clogged.
    ["4219eb63bc", []], // Insect biting and stinging use a different numbered sense.
    ["4223cee806", [182611]], // A street-end noun differs from the collision verb.
    ["440987e433", []], // Exclusion and missing the point differ from physical disconnection.
    ["496afac866", [89850]], // Physiological thirst differs from material drying.
    ["4bbc998853", [178341]], // Him adds gender to a neutral person.
    ["4ece866c62", [145591]], // The literal water/fish English loses the proverb's friendship context.
    ["4fcdca6105", [85687]], // Through doors drops the outward departure direction.
    ["5253a3aed7", []], // Restraining laughter differs from enduring or forgiving.
    ["5622faf78b", []], // Meddling and transitive insertion differ from the selected senses.
    ["562d25e8d9", [228977]], // Feeling regret differs from humble knowing.
    ["57e2c365fc", []], // Comparing differs from lighting; the companion's passive target needs repair.
    ["5b1dbc60e6", [188876]], // The companion has an unresolved reading marker.
    ["5ba9e0b071", []], // Divination differs from the selected forecast sense.
    ["5cee671ad8", []], // Blood and telephone uses have separate numbered senses.
    ["5d0fdd4eb9", [184290]], // To his sons adds absent relationships and recipients.
    ["5ebf9b904d", []], // Tree counts lose dense growth, and certainty replaces a propensity.
    ["5eec3c9c1f", [190044]], // Price reduction differs from demolition.
    ["6155e8fd84", []], // Added male gender and a lost cleric role need omission.
    ["616b7719e0", []], // Sample collection has another numbered sense.
    ["620f3620f3", [98015]], // The fire-instrument particle needs source repair.
    ["621e1a42be", []], // He adds gender to an unmarked standalone actor.
  ])) {
    const card = expectReviewedExamples(source, id, sentenceIds);
    expect(card.originalContent?.examples).toHaveLength(["0a5c26a710", "5ba9e0b071", "616b7719e0", "621e1a42be"].includes(id) ? 1 : 2);
    expect(card.content.reading).toBe(card.meaningReviewBefore?.reading);
    expect(card.content.level).toBe(card.meaningReviewBefore?.level);
  }
}, 30_000);

test.runIf(cached)("N2 retains valid inflections, declared spellings, full selected senses and contextual idioms", async () => {
  const { records } = await loadJapaneseStudyContentReview(process.cwd());
  for (const [id, senses] of new Map<string, number[]>([
    ["057d2de390", [2, 1]], // Falling down and overturning.
    ["068ed10c19", [2]], // The usual stink spelling remains eligible.
    ["0aa3c83853", [3]], // Feeling down rather than physical denting.
    ["0c08f09a61", [3, 3]], // Improved opinions rather than looking again.
    ["0d38dcb15b", [2, 1]], // Teething and plant growth.
    ["0fd77d7f82", [2]], // Displaying a facial expression.
    ["155ca82293", [2, 1]], // Emerging to the surface and floating.
    ["1e7604b6ba", [3]], // A collected library stock.
    ["2670496738", [2, 1]], // Divided opinions and forking road.
    ["270c29cab7", [1, 3]], // Compilation and finalizing a deal.
    ["275a5fcc47", [1, 2]], // Work/pay balance and matching colors.
    ["278c0d538f", [2, 2]], // Dissolving rather than thermal melting.
    ["2c37f1e65a", [1, 1]], // Contests rather than arguments.
    ["319bcb97fb", [1, 2]], // Instructing and reporting on someone.
    ["3744253331", [2, 2]], // Scaring rather than threatening.
    ["38ac1ca047", [2]], // Perspiring in the sweat construction.
    ["3b1069ecbb", [3, 1]], // Deletion and physical shaving.
    ["439a30e9ec", [1, 2]], // Dissemination and broadening.
    ["49bd373b1e", [1, 2]], // Ready and orderly.
    ["4ece866c62", [2]], // Moral purity rather than clear water.
    ["52ecfdedf9", [2, 2]], // Ragged clothing rather than a hidden fault.
    ["554088a0dc", [1, 2]], // Altering and reforming.
    ["55f0256479", [3, 3]], // Conventional apology interjections.
    ["5eec3c9c1f", [4]], // Breaking a banknote rather than demolition.
  ])) {
    const row = records.filter(record => "written" in record).find(record => record.id === `ja-vocabulary:${id}`);
    expect(row?.meaningReview?.examples?.keep.map(example => example.sense)).toEqual(senses);
  }
  const { source } = await loadJapaneseStudyArtifacts(process.cwd());
  for (const [id, sentenceIds] of new Map<string, number[]>([
    ["037cf136b2", [192296, 192284]], // Kana and katakana-long-vowel candle spellings remain.
    ["05d318e118", [147345, 197980]], // Physical caught fingers and the stuck-at-back-teeth speech image remain.
    ["06424536bc", [175343, 176361]], // Both mixed-script chase inflections remain.
    ["06d008d266", [75041]], // The passive animate return remains.
    ["0798193207", [170156, 150481]], // Assembled and dictionary-form assemble remain.
    ["0980694b56", [175242, 91473]], // Gnawing compound and pinned parental-support idiom remain.
    ["0a07eb2de8", [146770]], // The crouching inflection remains.
    ["0a7920d310", [168794, 212628]], // Progressive and imperative rolling remain.
    ["0b69dd0bd3", [179484, 185092]], // Literal-form and inflected merging images remain.
    ["0bc51639bd", [182397, 86832]], // The angry-shouting forms remain.
    ["0ef594e9fa", [226945, 78757]], // Both negative scattering/untidy constructions remain.
    ["0f1848395f", [2310151]], // The thirsty inflection remains.
    ["10b2f52ea3", [189985, 199987]], // Eligible moving-noun spelling and beneficiary remain.
    ["119c294e09", [221899, 125193]], // Both drying imperatives remain.
    ["1220fb871d", [211929, 145988]], // The reported plant event and ordinary cultivation utterance remain.
    ["14b9469de2", [157228, 161395]], // Mixed-kana tissue spellings remain.
    ["1524ab51fb", [174168, 151550]], // The eligible alternation spelling and in-turn activity remain.
    ["17c303f793", [211282, 166590]], // Compound sufficiency and the taranai negative remain.
    ["1bef1a1d14", [143710, 197135]], // Both physical mixing constructions remain.
    ["1cbdf2b53c", [198282, 110037]], // Draw/fetch ellipsis and well-water fetching remain.
    ["1cc1f1f36a", [196126, 148206]], // Both leaf-fall constructions preserve selected falling sense.
    ["1f6c86ec06", [226351, 235795]], // Katakana and hiragana bracket spellings remain.
    ["20ea09ad5e", [229400, 165950]], // Physical dough rise and chest-swelling hope metaphor remain.
    ["2360f93615", [168989, 79107]], // Both eligible sashimi spellings remain.
    ["23a5f2fc3e", [119479, 153478]], // Causative and causative-passive belief induction remain.
    ["257afc27f7", [224474, 173374]], // The primary remain reading and conventional choice remain.
    ["2a2443272f", [195869, 88662]], // Inanimate toppling and bodily collapse comparison remain.
    ["2b59b00503", [198654, 172964]], // Adhering clothes and joining bone retain the full stick sense.
    ["2b78635457", [93128, 171989]], // Both fashionable spellings remain.
    ["2d3eb89598", [9081061, 11199185]], // Both independently eligible sleepwear spellings remain.
    ["2e7243a763", [162536, 80762]], // Name shortening and the negative abbreviation request remain.
    ["2f1d00b80b", [211339, 117179]], // Passive and causative surprise remain.
    ["2febf6c23b", [229361, 158678]], // Both mixed-script think-of forms remain.
    ["30b0419cee", [207204, 160045]], // Both heavy-object contexts remain.
    ["32ffe9094a", [100151, 114666]], // Both physical leaning contexts remain.
    ["3365ac796d", [211688, 168354]], // Figurative overflow remains within the full selected sense.
    ["351d6d7bfc", [198405]], // The curled-hair inflection remains.
    ["391e4f541a", [144049, 2247851]], // Kanzuru's continuative kanji-te form and mental reservation remain.
    ["3957b9283e", [79126, 145594]], // Physical and emotional deepening retain intensification.
    ["3966c8755c", [74800, 86454]], // Proposed brave action and past brave inflection remain.
    ["399dac0917", [213232, 216588]], // Prospective stock status and ordinary retail we remain.
    ["3a13a46214", [75710, 205979]], // Rough caressing and the breeze-kiss metaphor remain.
    ["3c101a9435", [99050, 78118]], // Both stopping inflections remain.
    ["3d9613a286", [205908, 121429]], // Human and cloud floating remain.
    ["3ed7b4fc1a", [219900, 183700]], // Both eligible accuracy spellings remain.
    ["4100983d28", [170206, 110964]], // The full contents sense and eligible alternate spelling remain.
    ["43a20bd4f7", [207159, 147644]], // Partial-kana and inflected sultry forms remain.
    ["43e8d35afa", [171359, 236919]], // Both eligible sales spellings retain illustrative outcomes.
    ["449d9624b4", [12148232]], // The eligible lost-property compound remains.
    ["46b2bb8278", [226486, 82164]], // Projection and the conventional eyes-for-you image remain.
    ["4753bc0256", [101941, 87835]], // Both kana hanging inflections remain.
    ["47b2831015", [108639, 234583]], // Both independently eligible standard spellings remain.
    ["48638e9518", [190133, 171168]], // Offer and beneficiary lodging forms remain.
    ["49a74a09d2", [199301, 199303]], // Literary past and passive doing forms remain.
    ["4c3ba8dcca", [155340, 156540]], // The productive adjective nominalization remains valid.
    ["4d006aea23", [224493, 127293]], // Both intransitive warming forms remain.
    ["4d386fdf0d", [157751, 88542]], // Map and newspaper spreading remain.
    ["4df5b3b93f", [166609, 200953]], // Both rendezvous action constructions remain.
    ["4e0ee519ff", [206955]], // The mixed-kana wastepaper noun remains.
    ["53ec040c72", [92861, 84317]], // Passive affection and the parental comparison remain.
    ["54ac1c7086", [76313, 77079]], // The eligible spelling and established taste proverb remain.
    ["558939dc9d", [186684, 121627]], // The full sound sense explicitly includes a horse's snort.
    ["5687460a15", [155527]], // The reported ankle-twist inflection remains.
    ["58cee80fde", [78630, 95581]], // The shared Europe departure and Paris departure remain.
    ["5c46e379a2", [114979, 82602]], // The eligible fan spelling and primary reading remain.
    ["60f0d95dd9", [216404, 153169]], // Both greeting inflections remain.
    ["6133bbcb0c", [219009, 217030]], // Both verb-stem cooking-way constructions remain.
    ["61ed75f466", [88179, 211200]], // The compound root and kana tear-off inflection remain.
    ["620159fe47", [90067, 231388]], // Both sitting-down inflections remain.
  ])) expectReviewedExamples(source, id, sentenceIds);
}, 30_000);

test.runIf(cached)("accounts for every original sentence in the first 150 pending N2 nonliteral-match records", async () => {
  const { records, summary } = await loadJapaneseStudyContentReview(process.cwd());
  const n2 = records.filter(row => "written" in row).filter(row => row.introductionLevel === "N2");
  const cohort = n2.filter(row => {
    const selection = row.meaningReview?.examples;
    return selection && [...selection.keep, ...selection.omit].some(decision => decision.reason.startsWith("N2 first nonliteral example cohort:"));
  });
  expect(cohort).toHaveLength(150);
  expect(cohort[0]?.id).toBe("ja-vocabulary:021b9026a5");
  expect(cohort.at(-1)?.id).toBe("ja-vocabulary:621e1a42be");
  expect(cohort.reduce((n, row) => n + (row.meaningReview?.examples?.keep.length ?? 0), 0)).toBe(212);
  expect(cohort.reduce((n, row) => n + (row.meaningReview?.examples?.omit.length ?? 0), 0)).toBe(75);
  expect(cohort.flatMap(row => row.examples).filter(example => !example.literalTarget)).toHaveLength(175);
  expect(n2.filter(row => row.meaningReview?.reason.startsWith("N2 first nonliteral example cohort:"))).toHaveLength(86);
  expect(summary.counts).toMatchObject({ units: 10291, sourceRecords: 10307, meaningsToReview: 6, constructionMeanings: 0, phraseAttestedMeanings: 6 });
  expect(summary.publicationChanged).toBe(false);
}, 30_000);

test.runIf(cached)("the second N2 example cohort distinguishes selected senses, word identities and changed propositions", async () => {
  const { source } = await loadJapaneseStudyArtifacts(process.cwd());
  for (const [id, sentenceIds] of new Map<string, number[]>([
    ["664f19910f", [230575]],
    ["6686f635d7", []],
    ["6690a4649b", [112412]],
    ["66ee085d61", [169110]],
    ["68470c06d5", []],
    ["6d63ce6318", [104704]],
    ["6f6047f88e", [79769]],
    ["70d89907ac", []],
    ["7428ba69b1", [214184]],
    ["74cbfdc674", [161263]],
    ["79fcbe33ae", [222032]],
    ["89251f222d", [226121]],
    ["89488763f0", []],
    ["8966756fe1", [168253]],
    ["8a0cc52e6c", [183557]],
    ["8afc22f427", [189892]],
    ["8c1e168b75", [98212]],
    ["8c5d29346f", [201251]],
    ["8c9eb6e298", [228807]],
    ["8d45108aac", [228093]],
    ["8d8b3995cd", [214070]],
    ["8f250cbe55", [211419]],
    ["9113dd771d", []],
    ["956a0a55ec", []],
    ["9623b5f0f5", [225247]],
    ["983c20ed4c", [183557]],
    ["991f3cdf5d", [166018]],
    ["9aeb7de3a0", [203489]],
    ["9b36079d07", [215881]],
    ["9b6426d781", []],
    ["9cdbf2f93d", []],
    ["a059581841", [107432]],
    ["a06ce5662f", [146539]],
    ["a104cae099", [211050]],
    ["a159655db4", []],
    ["a1b5b4da89", [137537]],
    ["a3aeb9c735", [166942]],
    ["a4847f22e0", []],
    ["a5a037fa3e", [222422]],
    ["a603c7698c", []],
    ["a626854703", [78426]],
    ["aac375dbab", [143839]],
    ["aeac8de8f8", [105247]],
    ["af6be1f335", [201088]],
    ["afac132e5b", []],
    ["b308f089ad", [182442]],
    ["b495f06d59", []],
    ["b6e9e55b54", []],
  ])) {
    const card = expectReviewedExamples(source, id, sentenceIds);
    expect(card.originalContent?.examples).toHaveLength(id === "70d89907ac" ? 1 : 2);
    expect(card.content.reading).toBe(card.meaningReviewBefore?.reading);
    expect(card.content.level).toBe(card.meaningReviewBefore?.level);
  }
}, 30_000);

test.runIf(cached)("the second N2 cohort retains valid forms, full senses and contextual idioms", async () => {
  const { records } = await loadJapaneseStudyContentReview(process.cwd());
  const vocabulary = records.filter(row => "written" in row);
  for (const [id, senses] of new Map<string, number[]>([
    ["648920b60e", [3, 3]],
    ["6690a4649b", [1]],
    ["6a5cce1ae6", [2, 1]],
    ["6bb4cc0f8f", [2, 9]],
    ["6e96d24d68", [2, 2]],
    ["74cbfdc674", [2]],
    ["753724063a", [2, 1]],
    ["815d723df8", [1]],
    ["834267e876", [1, 3]],
    ["83501678de", [2, 1]],
    ["8355396ec5", [1, 2]],
    ["84fe109bdf", [1, 2]],
    ["87db0f1329", [2, 1]],
    ["8a0cc52e6c", [1]],
    ["8f250cbe55", [2]],
    ["929b330442", [1, 1]],
    ["9784a67500", [2, 1]],
    ["9aeb7de3a0", [2]],
    ["9cfafbb8c6", [2, 2]],
    ["adc42eab65", [3, 1]],
    ["aeac8de8f8", [2]],
    ["afb774a77e", [2, 1]],
    ["b4e52ce195", [2, 2]],
    ["b64bdd0f95", [2, 2]],
    ["bda2894093", [1, 1]],
  ])) {
    const row = vocabulary.find(record => record.id === `ja-vocabulary:${id}`);
    expect(row?.meaningReview?.examples?.keep.map(example => example.sense)).toEqual(senses);
  }
  expect(vocabulary.find(row => row.id === "ja-vocabulary:83501678de")?.meanings.find(meaning => meaning.text === "soft")).toMatchObject({
    status: "exact", evidence: [{ entryId: "1605630", sense: 2, gloss: "soft" }],
  });
  const { source } = await loadJapaneseStudyArtifacts(process.cwd());
  for (const [id, sentenceIds] of new Map<string, number[]>([
    ["62b886bb5d", [213569, 76684]],
    ["64ed42247a", [227120, 205528]],
    ["66735bcdd3", [78247, 203678]],
    ["67d18b4d8e", [197257, 217507]],
    ["6985ce368b", [101725, 87929]],
    ["6b2058cefd", [234730, 182693]],
    ["6cfaa71596", [190046, 169437]],
    ["6d105647c5", [215065, 114420]],
    ["6fc77ae762", [105961, 96592]],
    ["718a562886", [233001, 2315903]],
    ["74ce798872", [173278, 234356]],
    ["75c4fd2262", [112074, 104476]],
    ["761f5699eb", [141206, 224378]],
    ["79095736b4", [95284, 95285]],
    ["796332c2c7", [92651, 86807]],
    ["7b66979a25", [85792, 161948]],
    ["7fc8478e08", [127278, 159645]],
    ["802a1fbd95", [110190, 236611]],
    ["83df753526", [237480, 211511]],
    ["83e03509af", [143735, 124859]],
    ["842986809c", [229559, 158067]],
    ["8801305851", [143997, 123368]],
    ["8852d50289", [100332]],
    ["88a032d58a", [142433]],
    ["89034be6d9", [199610, 227056]],
    ["89251f222d", [226121]],
    ["8e07adc72b", [199617, 226142]],
    ["8fb8a5e5bd", [226163]],
    ["8fda5b92a3", [102952, 118654]],
    ["921ddcb04e", [169405, 121434]],
    ["92b4c96bb2", [203083]],
    ["941786efa7", [174675, 230955]],
    ["948ad087df", [79454, 219929]],
    ["9530f79308", [121691, 195670]],
    ["966b2f8873", [213906, 213797]],
    ["972c45f9d5", [139899, 84985]],
    ["986998f6c6", [209695, 223526]],
    ["99058f76ab", [234730, 227386]],
    ["997f2be694", [233200, 196656]],
    ["9b2486562a", [164153]],
    ["9c17a2ba5e", [111367]],
    ["9ceb4a9826", [202596, 4718]],
    ["9f4dc60993", [177103, 2321267]],
    ["a092c3382a", [215639, 95938]],
    ["a29550babf", [81579, 212987]],
    ["a5f7425823", [223902, 185105]],
    ["a7a7a09d5d", [195031, 86228]],
    ["a81e282d67", [211126]],
    ["a8392b4138", [222404]],
    ["a89704a64a", [184120, 87527]],
    ["a89a7c27d1", [202706, 215032]],
    ["ab00e10adf", [111317, 210956]],
    ["acbef70f9e", [234102, 157906]],
    ["ae280779f0", [191679, 193181]],
    ["b51c14eee8", [211601, 194745]],
    ["b589376271", [1678456, 13714031]],
    ["b593c66c90", [127196, 154616]],
    ["b5a34bdf96", [92059, 227598]],
    ["b618cff56c", [219982, 184012]],
    ["b683e19feb", [203879, 190440]],
    ["b6fbd99b21", [180345, 96826]],
    ["b74458a2d2", [93891, 183454]],
    ["b7564c7765", [79903, 175152]],
    ["b8ab4082a1", [84144, 194687]],
    ["ba14fcca73", [103028, 106835]],
    ["bb017f90d6", [91708, 225098]],
    ["bc22fda1e4", [213815]],
    ["bd19220d64", [209257, 149171]],
  ])) expectReviewedExamples(source, id, sentenceIds);
}, 30_000);

test.runIf(cached)("accounts for every original sentence in the second 150 pending N2 nonliteral-match records", async () => {
  const { records, summary } = await loadJapaneseStudyContentReview(process.cwd());
  const n2 = records.filter(row => "written" in row).filter(row => row.introductionLevel === "N2");
  const cohort = n2.filter(row => {
    const selection = row.meaningReview?.examples;
    return selection && [...selection.keep, ...selection.omit].some(decision => decision.reason.startsWith("N2 second nonliteral example cohort:"));
  });
  expect(cohort).toHaveLength(150);
  expect(cohort[0]?.id).toBe("ja-vocabulary:62b886bb5d");
  expect(cohort.at(-1)?.id).toBe("ja-vocabulary:bda2894093");
  expect(cohort.reduce((n, row) => n + (row.meaningReview?.examples?.keep.length ?? 0), 0)).toBe(228);
  expect(cohort.reduce((n, row) => n + (row.meaningReview?.examples?.omit.length ?? 0), 0)).toBe(61);
  expect(cohort.flatMap(row => row.examples).filter(example => !example.literalTarget)).toHaveLength(195);
  expect(n2.filter(row => row.meaningReview?.reason.startsWith("N2 second nonliteral example cohort:"))).toHaveLength(90);
  expect(summary.counts).toMatchObject({ units: 10291, sourceRecords: 10307, meaningsToReview: 6, constructionMeanings: 0, phraseAttestedMeanings: 6 });
  expect(summary.publicationChanged).toBe(false);
}, 30_000);

test.runIf(cached)("the final N2 nonliteral cohort distinguishes readings, grammatical words, selected senses and changed propositions", async () => {
  const { source } = await loadJapaneseStudyArtifacts(process.cwd());
  for (const [id, sentenceIds] of new Map<string, number[]>([
    ["c0a222a559", [183575]],
    ["c120501b80", [112791]],
    ["c3429126c5", [176188]],
    ["c364c3f779", [200316]],
    ["c4597831cc", [105694]],
    ["c49779952e", [152914]],
    ["c54bd0a598", [141202]],
    ["c55109ac27", [76366]],
    ["c5ab38bc57", [141986]],
    ["c730681c17", [219608]],
    ["c76123f3f7", []],
    ["ca7d4e8426", []],
    ["cce9ade407", [123915]],
    ["cd9f3a22c3", [101687]],
    ["ce730cb8b5", [91567]],
    ["cf7ed4ab11", [192154]],
    ["d18d4f69a0", [174078]],
    ["d2a076ec5a", [223420]],
    ["d46e97a030", [94982]],
    ["d56c12fa19", [143839]],
    ["d697f29e0b", [170954]],
    ["dc2f465cad", []],
    ["dedd8df548", [209661]],
    ["e085d2162c", [212631]],
    ["e0f08f770f", []],
    ["e62d8e80cc", [157171]],
    ["e7d30987dd", []],
    ["e7f4594d69", []],
    ["e85f343bd9", [192818]],
    ["ee816a1a14", [102018]],
    ["f213c34556", [219444]],
    ["f24da46d2e", [93246]],
    ["f28930bb60", [74374]],
    ["f310871eaf", [198169]],
    ["f3946a0625", [209521]],
    ["f6627edb12", [121659]],
    ["f6833a87fe", []],
    ["f7a5a8fcab", []],
    ["f90c31a922", [204102]],
    ["fa011c8770", []],
    ["fd0dc5e667", [177619]],
    ["fea2ab6e2e", [189908]],
    ["ff3e20c269", [147440]],
  ])) {
    const card = expectReviewedExamples(source, id, sentenceIds);
    expect(card.originalContent?.examples).toHaveLength(2);
    expect(card.content.reading).toBe(card.meaningReviewBefore?.reading);
    expect(card.content.level).toBe(card.meaningReviewBefore?.level);
  }
}, 30_000);

test.runIf(cached)("the final N2 nonliteral cohort preserves full senses, eligible forms and natural contextual renderings", async () => {
  const { records } = await loadJapaneseStudyContentReview(process.cwd());
  const vocabulary = records.filter(row => "written" in row);
  for (const [id, senses] of new Map<string, number[]>([
    ["c0a222a559", [2]],
    ["c120501b80", [3]],
    ["c3e8a47129", [1, 1]],
    ["c4ac694960", [2, 2]],
    ["c54bd0a598", [1]],
    ["c55109ac27", [2]],
    ["c730681c17", [2]],
    ["caee7aa282", [1, 1]],
    ["d18d4f69a0", [5]],
    ["d697f29e0b", [1]],
    ["d938167f7c", [1, 1]],
    ["dbfcfa67f5", [2, 1]],
    ["e2b67d1bcd", [1, 3]],
    ["e9eff104ec", [1, 2]],
    ["ec48e85bee", [2, 2]],
    ["f66b8d1678", [1, 1]],
    ["fd0dc5e667", [2]],
    ["fddd03dc5c", [2, 2]],
  ])) {
    const row = vocabulary.find(record => record.id === `ja-vocabulary:${id}`);
    expect(row?.meaningReview?.examples?.keep.map(example => example.sense)).toEqual(senses);
  }
  const { source } = await loadJapaneseStudyArtifacts(process.cwd());
  for (const [id, sentenceIds] of new Map<string, number[]>([
    ["bef1949982", [224484, 97311]],
    ["bf85d1b239", [189574, 226152]],
    ["c1a75af4f3", [110946]],
    ["c20bb40c25", [108542, 143457]],
    ["c34c2c465e", [219906, 111056]],
    ["c377958d2d", [213274]],
    ["c3c21a7396", [224361, 168310]],
    ["c507f2dcab", [121708, 207274]],
    ["c552523349", [225958, 96182]],
    ["c5ad6eaac8", [175665, 113215]],
    ["c77f6491db", [152195, 167063]],
    ["c7c5529d83", [155527, 155526]],
    ["c9e8c0c717", [142237, 96671]],
    ["ca31449987", [141358, 122047]],
    ["cd0fa19df1", [210424, 221958]],
    ["cd7ac4a670", [155301, 168446]],
    ["d06753f6b7", [209213, 92427]],
    ["d19f56d467", [176146, 189995]],
    ["d277aebba1", [112458, 109036]],
    ["d63d5219aa", [189358, 80144]],
    ["d69e3e87d9", [225711, 221745]],
    ["d7aad6d893", [78488, 215882]],
    ["d8bb5526c4", [142511, 138219]],
    ["d986b84f53", [225535]],
    ["d9f7dc8efd", [220578, 91322]],
    ["da17d2355a", [231175, 222898]],
    ["dfc07c6de7", [232859, 170427]],
    ["e062e45bac", [111367, 86226]],
    ["e07deb5c09", [148911, 196504]],
    ["e236e8a099", [13714037]],
    ["e341bcc1ec", [205358, 88689]],
    ["e34ae82b35", [157808, 168697]],
    ["e8814a0b5c", [2312944, 3569866]],
    ["eadadef662", [79454, 219929]],
    ["eafba17b69", [235201, 186534]],
    ["eecaaf06e0", [216663, 83848]],
    ["f3cdef1455", [149510, 113562]],
    ["f3d6da3eed", [151468]],
    ["f87fab18b5", [146626, 84175]],
    ["fa1d819e71", [179566, 81657]],
    ["fb73ee2899", [89096, 86545]],
    ["fbb67f254a", [222486, 82396]],
    ["fd81e58e15", [215893, 140453]],
    ["fd88b60e26", [156638, 215849]],
  ])) expectReviewedExamples(source, id, sentenceIds);
}, 30_000);

test.runIf(cached)("accounts for the final 97 pending N2 nonliteral-match records and leaves no such records unreviewed", async () => {
  const { records, summary } = await loadJapaneseStudyContentReview(process.cwd());
  const n2 = records.filter(row => "written" in row).filter(row => row.introductionLevel === "N2");
  const cohort = n2.filter(row => {
    const selection = row.meaningReview?.examples;
    return selection && [...selection.keep, ...selection.omit].some(decision => decision.reason.startsWith("N2 final nonliteral example cohort:"));
  });
  expect(cohort).toHaveLength(97);
  expect(cohort[0]?.id).toBe("ja-vocabulary:bef1949982");
  expect(cohort.at(-1)?.id).toBe("ja-vocabulary:ff3e20c269");
  expect(cohort.reduce((n, row) => n + (row.meaningReview?.examples?.keep.length ?? 0), 0)).toBe(137);
  expect(cohort.reduce((n, row) => n + (row.meaningReview?.examples?.omit.length ?? 0), 0)).toBe(52);
  expect(cohort.flatMap(row => row.examples).filter(example => !example.literalTarget)).toHaveLength(121);
  expect(n2.filter(row => row.meaningReview?.reason.startsWith("N2 final nonliteral example cohort:"))).toHaveLength(54);
  expect(n2.filter(row => !row.meaningReview?.examples && row.examples.some(example => !example.literalTarget))).toEqual([]);
  expect(summary.counts).toMatchObject({ units: 10291, sourceRecords: 10307, meaningsToReview: 6, constructionMeanings: 0, phraseAttestedMeanings: 6 });
  expect(summary.publicationChanged).toBe(false);
}, 30_000);

test.runIf(cached)("the first remaining N2 cohort distinguishes grammatical roles, readings, senses and translation propositions", async () => {
  const { source } = await loadJapaneseStudyArtifacts(process.cwd());
  for (const [id, sentenceIds] of new Map<string, number[]>([
    ["001d99a6ea", []],
    ["01471202a4", [11005110]],
    ["018cb37372", [125232]],
    ["01b08f062f", []],
    ["01b768c854", [83437]],
    ["01cfbc11d9", [146507]],
    ["02304543b5", [224001]],
    ["02e8eebee7", [90764]],
    ["04428b9eb4", [79919]],
    ["05fd834bdb", [155253]],
    ["06171296c0", [108872]],
    ["07f0baa471", [142258]],
    ["07f5677ad2", [76664]],
    ["091ea3ec5a", [220742]],
    ["0948f5e8f0", []],
    ["0ac7cfded0", []],
    ["0b3f7b2cf0", [206566]],
    ["0bd15bf630", [77715]],
    ["0e03441ea9", [176261]],
    ["121e30ca31", [184309]],
    ["1277bd1687", [182731]],
    ["1350b0aa0e", [201701]],
    ["1435dc6685", [3714907]],
    ["144c1b4945", [82700]],
    ["1495560853", [8919774]],
    ["15de07120f", [197234]],
    ["172c14a0d6", [189811]],
    ["18a13a1812", [111256]],
    ["192231173e", [108903]],
    ["1974a3d703", [146983]],
    ["1a5423f529", [218518]],
    ["1a83e76669", []],
    ["1b80545d83", [10650428]],
    ["1c1c3008a4", [161904]],
    ["1dd7773559", [126915]],
    ["1e3e361278", [236342]],
    ["202a506f55", [142085]],
    ["20aed3de76", [220087]],
    ["20b4a043ec", [184052]],
    ["20d7554878", [220575]],
    ["20f1c0d4bc", []],
    ["20f5e4a462", [185314]],
    ["21706ca86c", [199774]],
    ["217b09bf11", [142823]],
  ])) {
    const card = expectReviewedExamples(source, id, sentenceIds);
    expect(card.originalContent?.examples).toHaveLength(["01b08f062f", "1a83e76669", "20f1c0d4bc"].includes(id) ? 1 : 2);
    expect(card.content.reading).toBe(card.meaningReviewBefore?.reading);
    expect(card.content.level).toBe(card.meaningReviewBefore?.level);
  }
}, 30_000);

test.runIf(cached)("the first remaining N2 cohort preserves full selected senses, valid forms and contextual renderings", async () => {
  const { records } = await loadJapaneseStudyContentReview(process.cwd());
  const vocabulary = records.filter(row => "written" in row);
  for (const [id, senses] of new Map<string, number[]>([
    ["015a7731d2", [2, 1]],
    ["03d04bc918", [2, 1]],
    ["03e58ae420", [2, 1]],
    ["05fd834bdb", [2]],
    ["070b42aa61", [2]],
    ["07458cd0ba", [2, 2]],
    ["078da23d53", [1, 1]],
    ["0813533938", [2, 2]],
    ["0be1327b16", [1, 1]],
    ["0e03441ea9", [1]],
    ["0ea36c77a8", [1]],
    ["14b9b6118d", [2, 2]],
    ["17b975bfa3", [1]],
    ["17c46940e9", [2, 1]],
    ["19b3644127", [1, 1]],
    ["1b81bc4fc4", [2]],
    ["1bc14dcb79", [1, 1]],
    ["1e3e361278", [1]],
    ["1e628d432c", [1, 1]],
    ["216a25fa32", [1, 1]],
  ])) {
    const row = vocabulary.find(record => record.id === `ja-vocabulary:${id}`);
    expect(row?.meaningReview?.examples?.keep.map(example => example.sense)).toEqual(senses);
  }
  const { source } = await loadJapaneseStudyArtifacts(process.cwd());
  for (const [id, sentenceIds] of new Map<string, number[]>([
    ["0011c40f28", [92651, 113280]],
    ["008afba684", [82423, 225399]],
    ["01c6315e02", [875922, 1508589]],
    ["024a87f7b7", [83969, 185552]],
    ["0282dbf033", [77182, 98852]],
    ["033919f239", [104610, 108595]],
    ["043a33f231", [142130, 175696]],
    ["045301d878", [162811, 123521]],
    ["04bfe8ab7f", [219900, 183700]],
    ["0525f8593c", [221367, 143823]],
    ["05292c6357", [165556, 168553]],
    ["05b5ef086b", [86314, 99081]],
    ["05e77cc928", [184132, 81972]],
    ["05fdc01da3", [233022, 215485]],
    ["0632807791", [97884]],
    ["06f8dff15d", [191848, 103212]],
    ["078ffcd02a", [175019, 235808]],
    ["079b23ed2d", [161315, 159486]],
    ["07cec1cf59", [179606, 211762]],
    ["07f20a5682", [175912, 76262]],
    ["07f4ebd73d", [100172, 159139]],
    ["0823382f19", [78466]],
    ["085d6d93b2", [123494, 142559]],
    ["08e45ae028", [106219, 187855]],
    ["09ac423c73", [105206, 125744]],
    ["0a69c6fc44", [150477, 208152]],
    ["0aa9e30a0b", [89401]],
    ["0bae48705e", [221135, 141053]],
    ["0d084f47de", [233371, 183644]],
    ["0d4a82941e", [164258, 81497]],
    ["0d6665ee3b", [190098, 79467]],
    ["0de78822bd", [121205, 86235]],
    ["0e1f5e1a46", [102545]],
    ["0e2bb18941", [208407, 213730]],
    ["0e2efb14b6", [214724, 79703]],
    ["0e34bf193f", [228231, 78933]],
    ["0ecf5bddb0", [229582]],
    ["0f621ef0a0", [76756]],
    ["0fcdbb8d5f", [140416, 224600]],
    ["103a7a3ad9", [200866, 224472]],
    ["108e74b73c", [97647, 137049]],
    ["10adbed302", [76613]],
    ["10ede51979", [217834, 207752]],
    ["11516bf5bf", [206326, 231104]],
    ["116a3145bb", [198954, 124615]],
    ["116b451dd9", [101252]],
    ["1202a0faaf", [207829, 204700]],
    ["12db97070d", [100017, 84917]],
    ["130cd65eb3", [216180]],
    ["1400d67422", [228604, 155915]],
    ["141d9437e0", [88782, 220534]],
    ["1478d092fe", [155623]],
    ["149aa63e77", [175650, 147955]],
    ["14cb0f15c3", [142680, 104294]],
    ["1538638436", [8623884]],
    ["1558d7ee11", [225813, 120538]],
    ["1575a46d86", [89957]],
    ["157b440b95", [198334, 74266]],
    ["1637b21432", [231565, 89921]],
    ["1845cb2477", [237425, 116205]],
    ["186847c962", [161697, 89694]],
    ["18818a506e", [192844, 211009]],
    ["18b65422bb", [148370, 156053]],
    ["191d9697e6", [141122, 227982]],
    ["1928069f96", [91567, 196794]],
    ["198574a71b", [9081061, 11199185]],
    ["1b26844542", [197285, 86805]],
    ["1b67b6cb7e", [193878]],
    ["1b86e7eac4", [200184, 191825]],
    ["1b9ef14bec", [211295, 125892]],
    ["1be45c0ac4", [108264, 157303]],
    ["1bec520d49", [147226, 147229]],
    ["1c7cf9c7c5", [120638, 101513]],
    ["1c8441a1d8", [104253, 81636]],
    ["1c91d6bc15", [218274, 188322]],
    ["1c9be68b8f", [94682, 206883]],
    ["1cda943bec", [198748, 189976]],
    ["1d12a649ce", [87569]],
    ["1d147ab185", [155207, 102433]],
    ["1d44c2d962", [142491, 142489]],
    ["1d5c12f6ef", [189957, 78500]],
    ["1e16b1d46a", [223639, 88806]],
    ["1e621f5ba1", [208250, 80835]],
    ["1eeb6f9a04", [105734, 125865]],
    ["1f4b2dd59b", [193775]],
    ["1f52678a32", [95005, 207136]],
    ["1fd3fc74f0", [179689]],
    ["20b9b24497", [107282, 230583]],
    ["210e2fdd0b", [217172, 185247]],
  ])) expectReviewedExamples(source, id, sentenceIds);
}, 30_000);

test.runIf(cached)("accounts for every sentence in the first 150 remaining N2 literal-match records", async () => {
  const { records, summary } = await loadJapaneseStudyContentReview(process.cwd());
  const n2 = records.filter(row => "written" in row).filter(row => row.introductionLevel === "N2");
  const cohort = n2.filter(row => {
    const selection = row.meaningReview?.examples;
    return selection && [...selection.keep, ...selection.omit].some(decision => decision.reason.startsWith("N2 first literal example cohort:"));
  });
  expect(cohort).toHaveLength(150);
  expect(cohort[0]?.id).toBe("ja-vocabulary:0011c40f28");
  expect(cohort.at(-1)?.id).toBe("ja-vocabulary:217b09bf11");
  expect(cohort.reduce((n, row) => n + (row.meaningReview?.examples?.keep.length ?? 0), 0)).toBe(230);
  expect(cohort.reduce((n, row) => n + (row.meaningReview?.examples?.omit.length ?? 0), 0)).toBe(47);
  expect(cohort.flatMap(row => row.examples).every(example => example.literalTarget)).toBe(true);
  expect(n2.filter(row => row.meaningReview?.reason.startsWith("N2 first literal example cohort:"))).toHaveLength(97);
  expect(summary.counts).toMatchObject({ units: 10291, sourceRecords: 10307, meaningsToReview: 6, constructionMeanings: 0, phraseAttestedMeanings: 6 });
  expect(summary.publicationChanged).toBe(false);
}, 30_000);


test.runIf(cached)("the second remaining N2 cohort omits changed propositions, unselected senses and unresolved readings", async () => {
  const { source } = await loadJapaneseStudyArtifacts(process.cwd());
  for (const [id, sentenceIds] of new Map<string, number[]>([
    ["23d700213f", []],
    ["252580e3d6", []],
    ["256e7a9058", [91568]],
    ["2797d01152", [227053]],
    ["286b27e0f2", []],
    ["286e536eba", []],
    ["2c59eb6f09", [196088]],
    ["2ce04e7c6c", [233664]],
    ["2d0315cd73", [190910]],
    ["2d36cfac32", [108382]],
    ["2f149505a1", []],
    ["2f1a0ed14d", []],
    ["32043b1abb", [208345]],
    ["3223bf3e88", []],
    ["3263a2c4ee", [145181]],
    ["3308b2d953", []],
    ["33cd091e92", [89329]],
    ["368baf2dfb", [201388]],
    ["36aeb65143", [100197]],
    ["36c872b693", [142206]],
    ["36d05281eb", [194922]],
    ["3747b60316", [101907]],
    ["379489499b", [11469188]],
    ["38dd9ee24e", [197583]],
    ["395598d52e", [102375]],
    ["3a92a937ea", []],
    ["3adb9ea016", [210014]],
    ["3b1ff7f0c5", [221500]],
    ["3b2353357e", [124529]],
    ["3b48c1cc8f", [403802]],
    ["3b9ebdf7b3", []],
    ["3c6f24a260", [74828]],
    ["3c701afc3b", [152580]],
    ["3ced182294", []],
    ["3d04400545", []],
    ["3d33b9e224", [225528]],
    ["3eb9ac96dd", [173964]],
    ["3fc7930042", [197760]],
    ["4067523091", []],
    ["415ca8e1aa", []],
  ])) {
    const card = expectReviewedExamples(source, id, sentenceIds);
    expect(card.meaningReviewBefore?.examples.length).toBeGreaterThan(0);
    expect(card.content.reading).toBe(card.meaningReviewBefore?.reading);
    expect(card.content.level).toBe(card.meaningReviewBefore?.level);
  }
}, 30_000);

test.runIf(cached)("the second remaining N2 cohort preserves full selected senses and contextual expressions", async () => {
  const { records } = await loadJapaneseStudyContentReview(process.cwd());
  const vocabulary = records.filter(row => "written" in row);
  for (const [id, senses] of new Map<string, number[]>([
    ["21e0ebdfb3", [1]],
    ["2279b720b0", [2, 1]],
    ["23a732dae7", [2, 2]],
    ["23d7da744e", [1, 1]],
    ["251266e6d5", [2, 2]],
    ["27bf4e665a", [2]],
    ["2b64f87c29", [1]],
    ["2bbdfd22f6", [2]],
    ["2ce04e7c6c", [1]],
    ["2d0315cd73", [2]],
    ["327bccbebd", [1, 1]],
    ["32a8b1d784", [3, 2]],
    ["36d05281eb", [1]],
    ["38dd9ee24e", [1]],
    ["3e43a1afad", [1, 1]],
  ])) {
    const row = vocabulary.find(record => record.id === `ja-vocabulary:${id}`);
    expect(row?.meaningReview?.examples?.keep.map(example => example.sense)).toEqual(senses);
  }
  const { source } = await loadJapaneseStudyArtifacts(process.cwd());
  for (const [id, sentenceIds] of new Map<string, number[]>([
    ["228ab529ea", [113852]],
    ["2397f62252", [175034, 169173]],
    ["258b38b002", [150261]],
    ["270226074a", [168968, 190234]],
    ["270816b6b9", [76610, 216183]],
    ["27e7e5471c", [189662, 137172]],
    ["2a68d3e319", [93177, 228318]],
    ["2bf1b2ef65", [215188, 82423]],
    ["2da7613dd3", [79445]],
    ["2e4e587537", [228735, 115886]],
    ["2e616b4606", [175700, 175701]],
    ["2fa74b3912", [233176, 95300]],
    ["311803e490", [203363, 203364]],
    ["354b630662", [190725, 144970]],
    ["36794aa72e", [9467007]],
    ["370b10e13a", [189163, 74865]],
    ["379489499b", [11469188]],
    ["37d7aac8f2", [74909, 220778]],
    ["3b48c1cc8f", [403802]],
    ["3beb5d12ff", [173075, 83521]],
    ["3c6f24a260", [74828]],
    ["3e2c1c64f4", [229071, 205477]],
  ])) expectReviewedExamples(source, id, sentenceIds);
  const phrase = vocabulary.find(row => row.id === "ja-vocabulary:321ba5716a");
  expect(phrase?.meanings).toMatchObject([{ text: "please wait", status: "phrase-attested", evidence: [] }]);
  expect(phrase?.meaningReview).toBeUndefined();
  expect(phrase?.examples.map(example => example.source.tatoeba_id)).toEqual([146661]);
}, 30_000);

test.runIf(cached)("accounts for every sentence in the second 150 remaining N2 dictionary-backed literal-match records", async () => {
  const { records, summary } = await loadJapaneseStudyContentReview(process.cwd());
  const n2 = records.filter(row => "written" in row).filter(row => row.introductionLevel === "N2");
  const cohort = n2.filter(row => {
    const selection = row.meaningReview?.examples;
    return selection && [...selection.keep, ...selection.omit].some(decision => decision.reason.startsWith("N2 second literal example cohort:"));
  });
  expect(cohort).toHaveLength(150);
  expect(cohort[0]?.id).toBe("ja-vocabulary:21e0ebdfb3");
  expect(cohort.at(-1)?.id).toBe("ja-vocabulary:415ca8e1aa");
  expect(cohort.reduce((n, row) => n + (row.meaningReview?.examples?.keep.length ?? 0), 0)).toBe(218);
  expect(cohort.reduce((n, row) => n + (row.meaningReview?.examples?.omit.length ?? 0), 0)).toBe(47);
  expect(cohort.flatMap(row => row.examples).every(example => example.literalTarget)).toBe(true);
  expect(n2.filter(row => row.meaningReview?.reason.startsWith("N2 second literal example cohort:"))).toHaveLength(110);
  expect(summary.counts).toMatchObject({ units: 10291, sourceRecords: 10307, meaningsToReview: 6, constructionMeanings: 0, phraseAttestedMeanings: 6 });
  expect(summary.publicationChanged).toBe(false);
}, 30_000);


test.runIf(cached)("the third remaining N2 cohort omits incompatible senses, propositions and source claims", async () => {
  const { source } = await loadJapaneseStudyArtifacts(process.cwd());
  for (const [id, sentenceIds] of new Map<string, number[]>([
    ["42e6eb9310", []],
    ["440d9c19a8", [138231]],
    ["441e70ebe8", []],
    ["4495c01e89", [77854]],
    ["4641b96f3b", [222032]],
    ["47e5c9074a", [74624]],
    ["4877098dca", [157538]],
    ["49cdd6ad6a", [192166]],
    ["4a0fdf436f", []],
    ["4baa1bbded", [231261]],
    ["4c123afdff", [226221]],
    ["4c23dad704", [201576]],
    ["4e8fe5911e", [150918]],
    ["4f70e78ef3", [95902]],
    ["503bf9a13e", [227031]],
    ["51d4f339b1", [225286]],
    ["52d1950fe6", [79707]],
    ["539a42f789", [223301]],
    ["5550472e9a", []],
    ["55ae63883f", []],
    ["560025d6c1", [211958]],
    ["563109d803", []],
    ["564d959643", [144757]],
    ["56af2956cf", []],
    ["56cd51f84a", [102530]],
    ["57119864ae", [236996]],
    ["57249a323c", [80174]],
    ["573b247c42", []],
    ["576d64fbe4", [87062]],
    ["5880c88977", [164572]],
    ["592126446a", []],
    ["5a2ae71b5a", []],
    ["5b1670aea6", []],
    ["5b9c0435d0", [209966]],
    ["5c1a471818", [156597]],
    ["5c5886d7ab", []],
    ["5c7174993d", [149650]],
    ["5d643a1ea8", [222510]],
    ["5deacba2e9", []],
    ["5e47be51f8", [122356]],
    ["5e56475dc8", [83740]],
    ["5e99c7d855", []],
    ["5ea19069bc", [190778]],
  ])) {
    const card = expectReviewedExamples(source, id, sentenceIds);
    expect(card.meaningReviewBefore?.examples.length).toBeGreaterThan(0);
    expect(card.content.reading).toBe(card.meaningReviewBefore?.reading);
    expect(card.content.level).toBe(card.meaningReviewBefore?.level);
  }
}, 30_000);

test.runIf(cached)("the third remaining N2 cohort selects platform stage and retains contextual senses and forms", async () => {
  const { records } = await loadJapaneseStudyContentReview(process.cwd());
  const vocabulary = records.filter(row => "written" in row);
  const stage = vocabulary.find(row => row.id === "ja-vocabulary:4f7250c237");
  expect(stage?.meaningReview?.meanings).toMatchObject([
    { text: "stage", entryId: "1070320", sense: 1, gloss: "stage (platform)", relation: "equivalent" },
    { text: "performance", entryId: "1070320", sense: 2, gloss: "performance", relation: "exact" },
  ]);
  for (const [id, senses] of new Map<string, number[]>([
    ["43a186d0ec", [1, 1]],
    ["458e7d07ee", [2, 1]],
    ["45c88476cd", [1, 1]],
    ["4799821899", [1, 1]],
    ["488070d93a", [1, 1]],
    ["4a9610bf0b", [2]],
    ["4be5e77856", [1, 2]],
    ["4e8fe5911e", [2]],
    ["4e92bfed96", [3, 3]],
    ["4ec440ca2b", [1, 2]],
    ["4f7250c237", [1, 1]],
    ["539a42f789", [1]],
    ["561a981d4b", [2, 1]],
    ["57119864ae", [2]],
    ["5880c88977", [1]],
    ["5a25bbe9d4", [1, 1]],
    ["5af15108d0", [1, 1]],
    ["5b9c0435d0", [1]],
    ["5bc0e7375e", [1, 1]],
    ["5e1154d4eb", [2, 2]],
  ])) {
    const row = vocabulary.find(record => record.id === `ja-vocabulary:${id}`);
    expect(row?.meaningReview?.examples?.keep.map(example => example.sense)).toEqual(senses);
  }
  const { source } = await loadJapaneseStudyArtifacts(process.cwd());
  for (const [id, sentenceIds] of new Map<string, number[]>([
    ["421f9be199", [149544, 82103]],
    ["4383ca8dd3", [9855952]],
    ["44dc163d37", [11753179]],
    ["4799821899", [10588029, 3401045]],
    ["488070d93a", [183602, 183603]],
    ["4ae649a9ef", [199387, 209307]],
    ["4b0f18eaab", [589574]],
    ["4d20c70c47", [152679, 214642]],
    ["4d4cfe8f59", [217016, 217018]],
    ["4d852efca2", [97238, 97610]],
    ["4dc356b41b", [76748]],
    ["4e397a279c", [222973, 222974]],
    ["4e4af58c4d", [211919, 110986]],
    ["4f7250c237", [215402, 105933]],
    ["503bf9a13e", [227031]],
    ["510fabace9", [197588, 227427]],
    ["5132190319", [184165, 225660]],
    ["545014d791", [217121, 77548]],
    ["5543a2efce", [199330, 223422]],
    ["55a812679e", [84728, 111020]],
    ["56b91d068d", [214645, 223127]],
    ["56ed867118", [142869, 107237]],
    ["571cc2e0e4", [176401, 142066]],
    ["5958453e63", [192916, 115552]],
    ["59d84a5ff9", [169300, 143667]],
    ["5a7dba68c7", [10804251, 13185253]],
    ["5c180d80bf", [192624, 169539]],
    ["5cf71aab8a", [99739, 195323]],
    ["5db5c58e1b", [206335, 123108]],
  ])) expectReviewedExamples(source, id, sentenceIds);
}, 30_000);

test.runIf(cached)("accounts for every sentence in the third 150 remaining N2 dictionary-backed literal-match records", async () => {
  const { records, summary } = await loadJapaneseStudyContentReview(process.cwd());
  const n2 = records.filter(row => "written" in row).filter(row => row.introductionLevel === "N2");
  const cohort = n2.filter(row => {
    const selection = row.meaningReview?.examples;
    return selection && [...selection.keep, ...selection.omit].some(decision => decision.reason.startsWith("N2 third literal example cohort:"));
  });
  expect(cohort).toHaveLength(150);
  expect(cohort[0]?.id).toBe("ja-vocabulary:421f9be199");
  expect(cohort.at(-1)?.id).toBe("ja-vocabulary:5ea19069bc");
  expect(cohort.reduce((n, row) => n + (row.meaningReview?.examples?.keep.length ?? 0), 0)).toBe(224);
  expect(cohort.reduce((n, row) => n + (row.meaningReview?.examples?.omit.length ?? 0), 0)).toBe(53);
  expect(cohort.flatMap(row => row.examples).every(example => example.literalTarget)).toBe(true);
  expect(n2.filter(row => row.meaningReview?.reason.startsWith("N2 third literal example cohort:"))).toHaveLength(100);
  expect(summary.counts).toMatchObject({ units: 10291, sourceRecords: 10307, meaningsWithExactEvidence: 14686, reviewedEquivalentMeanings: 2526, meaningsToReview: 6, constructionMeanings: 0, phraseAttestedMeanings: 6 });
  expect(summary.publicationChanged).toBe(false);
}, 30_000);


test.runIf(cached)("the fourth remaining N2 cohort distinguishes numbered senses, source scope and changed propositions", async () => {
  const { source } = await loadJapaneseStudyArtifacts(process.cwd());
  for (const [id, sentenceIds] of new Map<string, number[]>([
    ["5f30ae15e7", [76613]],
    ["5fc0847a6d", []],
    ["5fd476cf4e", [103849]],
    ["5ff53bdd4b", [179900]],
    ["602170393a", [148920]],
    ["61b1422294", [109817]],
    ["621870e04f", []],
    ["628bff4e9f", [174977]],
    ["63bf0178ca", []],
    ["649455971d", []],
    ["64bfcad88e", [208699]],
    ["68378c2685", [142725]],
    ["69a5c305cb", [206703]],
    ["69eff96c44", [137970]],
    ["6ab2cd6a84", [189162]],
    ["6c0f869b21", [74858]],
    ["6ee36ace0e", [205761]],
    ["6f7f0e1422", []],
    ["7060eefe03", [195639]],
    ["7283639663", [167090]],
    ["72b0b5f639", [169518]],
    ["744459cac8", [152918]],
    ["76526f6c6f", [207733]],
    ["772e03ca49", [170170]],
    ["77bc0bfc10", [126789]],
    ["77ff01a624", []],
    ["780f916fa8", [121163]],
    ["784a1322f6", [223260]],
    ["7864bfeb34", [143623]],
    ["7a4cf36303", [108613]],
    ["7aceba5b88", [206723]],
    ["7ce9d61e4c", [158650]],
    ["7fa5916da9", [112174]],
    ["80f055ce16", [104792]],
    ["815dc7a9f6", [181517]],
    ["817a8e8089", [145370]],
    ["826de86dee", [140711]],
    ["829f937932", [185332]],
    ["834b59c61e", [230879]],
  ])) {
    const card = expectReviewedExamples(source, id, sentenceIds);
    expect(card.meaningReviewBefore?.examples.length).toBeGreaterThan(0);
    expect(card.content.reading).toBe(card.meaningReviewBefore?.reading);
    expect(card.content.level).toBe(card.meaningReviewBefore?.level);
  }
}, 30_000);

test.runIf(cached)("the fourth remaining N2 cohort retains full senses, valid compounds and contextual forms", async () => {
  const { records } = await loadJapaneseStudyContentReview(process.cwd());
  const vocabulary = records.filter(row => "written" in row);
  for (const [id, senses] of new Map<string, number[]>([
    ["5f1b31cdeb", [1, 1]],
    ["5f30ae15e7", [2]],
    ["623af5309f", [2, 1]],
    ["6457f2eab8", [1, 2]],
    ["661ea203b7", [1, 1]],
    ["66c46c763c", [1, 1]],
    ["6c0f869b21", [1]],
    ["6ebaee5c4f", [1, 1]],
    ["7060eefe03", [1]],
    ["706b032557", [2, 2]],
    ["7283639663", [1]],
    ["76ae08f0ef", [2, 2]],
    ["7cd16edcd6", [2]],
    ["7f3dee63cb", [1, 1]],
    ["7fa5916da9", [2]],
    ["807a25ac9e", [1, 1]],
    ["815dc7a9f6", [2]],
    ["81a3e89786", [1, 1]],
    ["826de86dee", [1]],
    ["828cbdb633", [1, 2]],
    ["829f937932", [1]],
    ["84096d1b94", [1, 1]],
  ])) {
    const row = vocabulary.find(record => record.id === `ja-vocabulary:${id}`);
    expect(row?.meaningReview?.examples?.keep.map(example => example.sense)).toEqual(senses);
  }
  const { source } = await loadJapaneseStudyArtifacts(process.cwd());
  for (const [id, sentenceIds] of new Map<string, number[]>([
    ["5f1431a28b", [235410, 126003]],
    ["5fd1b52022", [220767, 141146]],
    ["5fdec08677", [84797, 84393]],
    ["606f11e5c2", [209797, 141416]],
    ["609f65f056", [121398, 121396]],
    ["60f61bf258", [225682, 74768]],
    ["61ab117796", [74956, 210029]],
    ["6398ff89a6", [197457]],
    ["6457f2eab8", [188330, 159034]],
    ["65bbe081e9", [143759]],
    ["660ecbecc6", [176056]],
    ["66c46c763c", [192915, 154179]],
    ["68722abf73", [228174, 208496]],
    ["68ab7ff29a", [164274, 84828]],
    ["6a1dd228d7", [10802285, 10367349]],
    ["6a5672e8e2", [219291, 228705]],
    ["6e9b4bc52c", [232962, 205752]],
    ["6f9035b499", [203208, 79818]],
    ["70608882d5", [94182, 95670]],
    ["7102632d8f", [96874, 75008]],
    ["720253f6e8", [124348, 199089]],
    ["7341f5936d", [237397, 157788]],
    ["736625f56c", [123082, 217254]],
    ["770fa07e45", [190753, 100532]],
    ["772e03ca49", [170170]],
    ["77d2529580", [124498, 113677]],
    ["787560a4dd", [88181, 101363]],
    ["79169045a2", [234585, 158678]],
    ["7985190c1e", [150980, 222283]],
    ["7a30ecc911", [13714009]],
    ["7b47b2fa7c", [230488, 218279]],
    ["7dda379104", [215577, 84983]],
    ["7f3dee63cb", [203273, 175976]],
    ["8058eb2a5b", [125042, 125040]],
    ["80c3be3aaf", [231602, 226127]],
    ["82a3b17d15", [113852]],
    ["83b24ee6c2", [3563621, 5051490]],
    ["840d4d6a90", [77030]],
    ["841aaee779", [143632, 145987]],
  ])) expectReviewedExamples(source, id, sentenceIds);
}, 30_000);

test.runIf(cached)("accounts for every sentence in the fourth 150 remaining N2 dictionary-backed literal-match records", async () => {
  const { records, summary } = await loadJapaneseStudyContentReview(process.cwd());
  const n2 = records.filter(row => "written" in row).filter(row => row.introductionLevel === "N2");
  const cohort = n2.filter(row => {
    const selection = row.meaningReview?.examples;
    return selection && [...selection.keep, ...selection.omit].some(decision => decision.reason.startsWith("N2 fourth literal example cohort:"));
  });
  expect(cohort).toHaveLength(150);
  expect(cohort[0]?.id).toBe("ja-vocabulary:5f1431a28b");
  expect(cohort.at(-1)?.id).toBe("ja-vocabulary:841aaee779");
  expect(cohort.reduce((n, row) => n + (row.meaningReview?.examples?.keep.length ?? 0), 0)).toBe(235);
  expect(cohort.reduce((n, row) => n + (row.meaningReview?.examples?.omit.length ?? 0), 0)).toBe(43);
  expect(cohort.flatMap(row => row.examples).every(example => example.literalTarget)).toBe(true);
  expect(n2.filter(row => row.meaningReview?.reason.startsWith("N2 fourth literal example cohort:"))).toHaveLength(100);
  expect(summary.counts).toMatchObject({ units: 10291, sourceRecords: 10307, meaningsWithExactEvidence: 14686, reviewedEquivalentMeanings: 2526, meaningsToReview: 6, constructionMeanings: 0, phraseAttestedMeanings: 6 });
  expect(summary.publicationChanged).toBe(false);
}, 30_000);


test.runIf(cached)("the fifth remaining N2 cohort separates verb identities, selected senses, propositions and source scope", async () => {
  const { source } = await loadJapaneseStudyArtifacts(process.cwd());
  for (const [id, sentenceIds] of new Map<string, number[]>([
    ["8476b331d5", [169314]],
    ["8519c7e2a4", [99490]],
    ["852e2ea46c", [155923]],
    ["85378e9a51", [212748]],
    ["869960843c", [211522]],
    ["86c59f38ea", []],
    ["875ea64454", []],
    ["88c7c412dd", [209313]],
    ["8b9f651fdb", [78092]],
    ["8c683a54cf", [74551]],
    ["8c71b2d8dc", [78978]],
    ["8c8c09f7cf", []],
    ["903c265643", [104503]],
    ["9087a1e25d", [106241]],
    ["90d2b5236d", []],
    ["90d6ce8c2d", [122155]],
    ["90dd7bd4a0", [103606]],
    ["9183205d2c", [112312]],
    ["931842c186", [115415]],
    ["93c3df67fe", [194674]],
    ["950143400c", [172166]],
    ["950bd50c42", []],
    ["95304f709a", [207628]],
    ["9597fdd403", [126596]],
    ["96370a1ce3", [197622]],
    ["973d4dd61b", [169200]],
    ["9839e7b9df", [202513]],
    ["99315b3aee", [104138]],
    ["994a31701f", [235157]],
    ["9953c1ba78", [151380]],
    ["9b0fdc64d8", []],
    ["9b34e5636e", [90166]],
    ["9b927494b7", [225005]],
    ["9ba1ff86d6", []],
    ["9be6756fdb", [103454]],
    ["9cb6ca65c9", [172783]],
    ["9d487f2451", [198732]],
    ["9d9cfcda72", [78760]],
    ["9f66a0ca11", [210856]],
    ["a0ca1d13fa", []],
    ["a26800f569", [222694]],
    ["a3c5f7dcf6", []],
    ["a4ae5b5899", [173481]],
    ["a4da59bc6b", [196014]],
    ["a542a76c28", [112971]],
    ["a58604399c", [182936]],
    ["a5b0e18f8b", [173167]],
    ["a653025024", [80875]],
    ["a7ccd8db86", [173646]],
  ])) {
    const card = expectReviewedExamples(source, id, sentenceIds);
    expect(card.meaningReviewBefore?.examples.length).toBeGreaterThan(0);
    expect(card.content.reading).toBe(card.meaningReviewBefore?.reading);
    expect(card.content.level).toBe(card.meaningReviewBefore?.level);
  }
}, 30_000);

test.runIf(cached)("the fifth remaining N2 cohort retains full senses, valid contextual forms and sourced observations", async () => {
  const { records } = await loadJapaneseStudyContentReview(process.cwd());
  const vocabulary = records.filter(row => "written" in row);
  for (const [id, senses] of new Map<string, number[]>([
    ["869960843c", [1]],
    ["881b8fe898", [1, 1]],
    ["88c7c412dd", [1]],
    ["89e5aee43f", [1, 5]],
    ["90d6ce8c2d", [1]],
    ["9182744c76", [1]],
    ["92860482c9", [1]],
    ["93d1d2e9ef", [1]],
    ["94fac8560c", [1, 1]],
    ["9575772ddd", [2]],
    ["97bf2f7547", [1, 2]],
    ["97f68aa406", [1, 2]],
    ["999262d7d8", [1, 2]],
    ["99ff21adbb", [1, 1]],
    ["9b34e5636e", [1]],
    ["9be6756fdb", [1]],
    ["9d487f2451", [1]],
    ["a3e381631c", [2, 2]],
    ["a5d2ff7c14", [1, 2]],
    ["a653025024", [1]],
    ["a68be1b427", [1, 1]],
    ["a6ad7ce8c8", [2, 2]],
    ["a7ccd8db86", [1]],
  ])) {
    const row = vocabulary.find(record => record.id === `ja-vocabulary:${id}`);
    expect(row?.meaningReview?.examples?.keep.map(example => example.sense)).toEqual(senses);
  }
  const { source } = await loadJapaneseStudyArtifacts(process.cwd());
  for (const [id, sentenceIds] of new Map<string, number[]>([
    ["845ae84d62", [118785, 169025]],
    ["84dd8f8c0c", [117654, 398162]],
    ["85d99f2057", [88367, 82905]],
    ["88886a432e", [165746, 3234745]],
    ["89d19700e5", [125797, 123064]],
    ["8c683a54cf", [74551]],
    ["8ca2ab5e1d", [148004, 116991]],
    ["8ccc07ea5d", [207191, 219147]],
    ["8dd4e6c718", [211955, 186707]],
    ["8dea07a859", [152562, 144797]],
    ["8ec94d8573", [220781, 76042]],
    ["8ed647d742", [137954, 218068]],
    ["90910eca9c", [212723]],
    ["9195f94e8f", [9595558, 10627106]],
    ["92860482c9", [234551]],
    ["92f24db03c", [1487254]],
    ["93d1d2e9ef", [157593]],
    ["94fac8560c", [107664, 204215]],
    ["955d4daa75", [168969, 221980]],
    ["958095fe66", [234857, 216604]],
    ["96370a1ce3", [197622]],
    ["9714cc8a70", [531350]],
    ["973d4dd61b", [169200]],
    ["9756805cd8", [221500]],
    ["9839e7b9df", [202513]],
    ["9844f0cd5b", [137600]],
    ["99ff21adbb", [3424569, 76289]],
    ["9a1aa9c141", [79474, 79472]],
    ["9a583397de", [138160, 143629]],
    ["9b8ecc5c1f", [194381, 177626]],
    ["9b9b6c1212", [229449]],
    ["9bcbb07770", [101757, 124151]],
    ["9bf00b9ce5", [83922, 179413]],
    ["9c34d52658", [192296, 126312]],
    ["9db4ea12f1", [212887, 179414]],
    ["9ece254a41", [227757, 93195]],
    ["a1700e2e42", [143550, 92382]],
    ["a2d437e191", [179610, 217949]],
    ["a3e381631c", [227761, 227762]],
    ["a761bdb540", [211675, 112558]],
  ])) expectReviewedExamples(source, id, sentenceIds);
}, 30_000);

test.runIf(cached)("accounts for every sentence in the fifth 150 remaining N2 dictionary-backed literal-match records", async () => {
  const { records, summary } = await loadJapaneseStudyContentReview(process.cwd());
  const n2 = records.filter(row => "written" in row).filter(row => row.introductionLevel === "N2");
  const cohort = n2.filter(row => {
    const selection = row.meaningReview?.examples;
    return selection && [...selection.keep, ...selection.omit].some(decision => decision.reason.startsWith("N2 fifth literal example cohort:"));
  });
  expect(cohort).toHaveLength(150);
  expect(cohort[0]?.id).toBe("ja-vocabulary:845ae84d62");
  expect(cohort.at(-1)?.id).toBe("ja-vocabulary:a7cee32023");
  expect(cohort.reduce((n, row) => n + (row.meaningReview?.examples?.keep.length ?? 0), 0)).toBe(227);
  expect(cohort.reduce((n, row) => n + (row.meaningReview?.examples?.omit.length ?? 0), 0)).toBe(55);
  expect(cohort.flatMap(row => row.examples).every(example => example.literalTarget)).toBe(true);
  expect(n2.filter(row => row.meaningReview?.reason.startsWith("N2 fifth literal example cohort:"))).toHaveLength(91);
  expect(summary.counts).toMatchObject({ units: 10291, sourceRecords: 10307, meaningsWithExactEvidence: 14686, reviewedEquivalentMeanings: 2526, meaningsToReview: 6, constructionMeanings: 0, phraseAttestedMeanings: 6 });
  expect(summary.publicationChanged).toBe(false);
}, 30_000);


test.runIf(cached)("the sixth remaining N2 cohort separates selected senses, changed information and unresolved source annotations", async () => {
  const { source } = await loadJapaneseStudyArtifacts(process.cwd());
  for (const [id, sentenceIds] of new Map<string, number[]>([
    ["a82d4898b1", [8499668]],
    ["a941e4dd4a", [78944]],
    ["aa5973a2fb", [142671]],
    ["aac5075190", [99120]],
    ["aadc90550f", [94676]],
    ["ac638ea3f7", []],
    ["acbd523fe5", []],
    ["ad75b4bf14", [124296]],
    ["ae53d68d3c", [10888988]],
    ["b14b139308", [11563607]],
    ["b16f84d958", [114361]],
    ["b3176c1e66", [146961]],
    ["b34032ae3f", [124400]],
    ["b55d2ba080", []],
    ["b65f34f69e", [140305]],
    ["b72fd7bd28", [76915]],
    ["b749687d68", [192554]],
    ["b7af843a7d", [150707]],
    ["b9a3269966", [212857]],
    ["b9a3df8259", []],
    ["b9ac4b3de8", [203875]],
    ["ba30b2fc1e", [229099]],
    ["ba3c545884", [219845]],
    ["baa0ac6a03", []],
    ["bb1d4f2a63", [149116]],
    ["bbd1639a14", [2733322]],
    ["bc5751f35d", []],
    ["bcc28e99fd", [126441]],
    ["bcd62b733c", []],
    ["bf49440897", [104421]],
    ["bf64a8fbb8", [227479]],
    ["bfd161e29b", [220324]],
    ["c0da086fcb", [85326]],
    ["c10303493a", [220389]],
    ["c171dadc4a", [82253]],
    ["c1935c3827", []],
    ["c3e11ec5cd", [195239]],
    ["c48e028d88", [163192]],
    ["c4f488a907", [189469]],
    ["c50a6711ac", [172302]],
    ["c5ce96af8e", []],
  ])) {
    const card = expectReviewedExamples(source, id, sentenceIds);
    expect(card.meaningReviewBefore?.examples.length).toBeGreaterThan(0);
    expect(card.content.reading).toBe(card.meaningReviewBefore?.reading);
    expect(card.content.level).toBe(card.meaningReviewBefore?.level);
  }
}, 30_000);

test.runIf(cached)("the sixth remaining N2 cohort retains full selected senses and natural contextual renderings", async () => {
  const { records } = await loadJapaneseStudyContentReview(process.cwd());
  const vocabulary = records.filter(row => "written" in row);
  for (const [id, senses] of new Map<string, number[]>([
    ["a941e4dd4a", [1]],
    ["a992ca5e44", [2, 1]],
    ["ac69e2e6fa", [2, 2]],
    ["ae06c53ace", [1, 2]],
    ["afd6358788", [2, 1]],
    ["b1173f76cf", [2]],
    ["b14b139308", [2]],
    ["b3176c1e66", [1]],
    ["b476dd050d", [1, 1]],
    ["b872b4bcb0", [2, 2]],
    ["b8ca72ea13", [2, 2]],
    ["b9ac4b3de8", [1]],
    ["bb1448841b", [1, 1]],
    ["bbd1639a14", [1]],
    ["bf49440897", [1]],
    ["bf64a8fbb8", [2]],
    ["c24130db77", [1, 1]],
    ["c372f954db", [1, 1]],
    ["c4d0463a66", [1, 1]],
    ["c4f488a907", [1]],
    ["c50a6711ac", [1]],
  ])) {
    const row = vocabulary.find(record => record.id === `ja-vocabulary:${id}`);
    expect(row?.meaningReview?.examples?.keep.map(example => example.sense)).toEqual(senses);
  }
  const { source } = await loadJapaneseStudyArtifacts(process.cwd());
  for (const [id, sentenceIds] of new Map<string, number[]>([
    ["a992ca5e44", [141555, 75949]],
    ["aa9dd05f1c", [109619, 220248]],
    ["aacfb8a265", [197790, 185036]],
    ["ab4a133262", [162236, 146744]],
    ["ab742a2e6a", [227572, 114242]],
    ["abd9751d6a", [147286, 120460]],
    ["ac4aba9167", [161442, 188782]],
    ["ac69e2e6fa", [219403, 140515]],
    ["acc981db7a", [199451, 127365]],
    ["ace0d91c72", [125434, 188568]],
    ["ad69650418", [122878, 122865]],
    ["ad6b4ebbf6", [212991, 229267]],
    ["ad75b4bf14", [124296]],
    ["ad94c2b563", [76675]],
    ["adc5e4cf48", [207505, 207496]],
    ["adccf2fc72", [13714007]],
    ["adfb442111", [204787]],
    ["ae06c53ace", [160255, 85992]],
    ["ae0de59adb", [13714015]],
    ["af5bfb11d1", [85717, 75150]],
    ["afd6358788", [213661, 89038]],
    ["b0020130bb", [208891, 142221]],
    ["b1173f76cf", [201380]],
    ["b127fdbd06", [142671]],
    ["b16f84d958", [114361]],
    ["b215f81bda", [207335, 165812]],
    ["b21d464467", [13714001, 220390]],
    ["b23a427cf5", [104112, 161647]],
    ["b2616e89d2", [221216, 79685]],
    ["b3718fbb1d", [197180, 79700]],
    ["b476dd050d", [188581, 216838]],
    ["b47b70d3a8", [219097, 144702]],
    ["b5cc2a03d3", [186459, 157975]],
    ["b662f10494", [221136, 221330]],
    ["b6e031db42", [119174, 96557]],
    ["b72fd7bd28", [76915]],
    ["b79565a0c1", [151944, 141695]],
    ["b7fdaa59f1", [146294, 180293]],
    ["b859574f86", [200253, 146941]],
    ["b872b4bcb0", [145332, 201166]],
    ["b89eba924f", [208733, 175009]],
    ["b8ca72ea13", [202342, 172566]],
    ["b8ce8117eb", [137250, 82519]],
    ["b8fdf48b47", [200947, 165218]],
    ["b95d04294a", [76652]],
    ["ba4e559c36", [208735, 199716]],
    ["bad1aa32f2", [163754, 112057]],
    ["bb1448841b", [218480, 219666]],
    ["bbd1639a14", [2733322]],
    ["bc08ae4b7c", [85110, 192347]],
    ["bd0bdea18d", [161441, 137799]],
    ["bdcda9041c", [11124049]],
    ["be99846d43", [184555, 86196]],
    ["bf39c2aae9", [213332, 146006]],
    ["bf64a8fbb8", [227479]],
    ["c1294618e7", [74550]],
    ["c14d253e1f", [206668, 209447]],
    ["c1c984fbb4", [121863, 157455]],
    ["c24130db77", [89505, 151187]],
    ["c25d2ee2b5", [221630, 181635]],
    ["c305d4a6e1", [185170]],
    ["c306cf0616", [221263, 74875]],
    ["c372f954db", [165049, 235096]],
    ["c4d0463a66", [3621822, 228451]],
    ["c4db898159", [148202, 212129]],
    ["c5553fccf6", [8289896]],
    ["c55bcca116", [110982, 207154]],
    ["c6399cbbfd", [103260, 189642]],
  ])) expectReviewedExamples(source, id, sentenceIds);
}, 30_000);

test.runIf(cached)("accounts for every sentence in the sixth 150 remaining N2 dictionary-backed literal-match records", async () => {
  const { records, summary } = await loadJapaneseStudyContentReview(process.cwd());
  const n2 = records.filter(row => "written" in row).filter(row => row.introductionLevel === "N2");
  const cohort = n2.filter(row => {
    const selection = row.meaningReview?.examples;
    return selection && [...selection.keep, ...selection.omit].some(decision => decision.reason.startsWith("N2 sixth literal example cohort:"));
  });
  expect(cohort).toHaveLength(150);
  expect(cohort[0]?.id).toBe("ja-vocabulary:a82d4898b1");
  expect(cohort.at(-1)?.id).toBe("ja-vocabulary:c6399cbbfd");
  expect(cohort.reduce((n, row) => n + (row.meaningReview?.examples?.keep.length ?? 0), 0)).toBe(235);
  expect(cohort.reduce((n, row) => n + (row.meaningReview?.examples?.omit.length ?? 0), 0)).toBe(46);
  expect(cohort.flatMap(row => row.examples).every(example => example.literalTarget)).toBe(true);
  expect(n2.filter(row => row.meaningReview?.reason.startsWith("N2 sixth literal example cohort:"))).toHaveLength(95);
  expect(summary.counts).toMatchObject({ units: 10291, sourceRecords: 10307, meaningsWithExactEvidence: 14686, reviewedEquivalentMeanings: 2526, meaningsToReview: 6, constructionMeanings: 0, phraseAttestedMeanings: 6 });
  expect(summary.publicationChanged).toBe(false);
}, 30_000);


test.runIf(cached)("the seventh remaining N2 cohort distinguishes selected senses, proposition changes and unresolved readings", async () => {
  const { source } = await loadJapaneseStudyArtifacts(process.cwd());
  for (const [id, sentenceIds] of new Map<string, number[]>([
    ["c6a40ed583", [105649]],
    ["c6c6f28738", []],
    ["c7b727d62a", [225438]],
    ["c7ba433c9d", [82915]],
    ["c85140bde0", [180122]],
    ["c864ff58da", [79901]],
    ["c8b2b3cf19", [117128]],
    ["ca1d593e5e", [3068096]],
    ["ca55cc7ec9", [145852]],
    ["cbc70409ad", [93193]],
    ["cd88dd47e4", [145782]],
    ["cea0736426", []],
    ["cf1e430209", [205492]],
    ["d019c7013c", [203873]],
    ["d02bfaeccf", [137233]],
    ["d11bb9a972", []],
    ["d320c18c4b", []],
    ["d434669f71", [76749]],
    ["d4388b09f6", []],
    ["d46254efba", [173039]],
    ["d52725aae3", []],
    ["d56c7f55f8", []],
    ["d6a3f85dab", [225735]],
    ["d95334bf4d", [162200]],
    ["d9f84d61b1", []],
    ["da7eee9d6c", []],
    ["daad7873f5", []],
    ["db08c76b78", [173618]],
    ["dbb7b4bbd4", []],
    ["dbd84cdab0", [231903]],
    ["dc1d497810", [109374]],
    ["dcce6e2666", [191337]],
    ["dd3373514a", [190093]],
    ["de0c594c1b", [121973]],
    ["df1a94a798", []],
    ["df272e125c", [8729317]],
    ["e01e3ed9a2", [222254]],
    ["e0669895cc", [228801]],
    ["e20620f561", [126301]],
    ["e2c4b62726", []],
    ["e35ba23439", [222440]],
    ["e3d8bfb183", [93286]],
    ["e4d4b6fd93", []],
    ["e59175c727", [207414]],
    ["e5bc9f56c0", [121886]],
    ["e5e24e47dc", []],
    ["e6030f8180", []],
    ["e810ef250a", [107972]],
    ["e93cf3d679", []],
    ["e9427e3ec2", [177953]],
  ])) {
    const card = expectReviewedExamples(source, id, sentenceIds);
    expect(card.meaningReviewBefore?.examples.length).toBeGreaterThan(0);
    expect(card.content.reading).toBe(card.meaningReviewBefore?.reading);
    expect(card.content.level).toBe(card.meaningReviewBefore?.level);
  }
}, 30_000);

test.runIf(cached)("the seventh remaining N2 cohort selects results bear-fruit and retains physical ripening and contextual senses", async () => {
  const { records } = await loadJapaneseStudyContentReview(process.cwd());
  const vocabulary = records.filter(row => "written" in row);
  for (const [id, selectedSenses] of new Map<string, number[]>([
    ["c6e5255341", [2, 2]],
    ["c7ba433c9d", [1]],
    ["c85140bde0", [1]],
    ["c8b2b3cf19", [1]],
    ["ca1d593e5e", [1]],
    ["cbc70409ad", [1]],
    ["cc9839ab1b", [1, 2]],
    ["cd88dd47e4", [1]],
    ["cf1e430209", [1]],
    ["cfadc86524", [1, 1]],
    ["d019c7013c", [1]],
    ["d02bfaeccf", [2]],
    ["d197a98346", [1]],
    ["d2028709e8", [1]],
    ["d222155dec", [1]],
    ["d34cd59500", [1, 1]],
    ["d40a8e4a7f", [1, 1]],
    ["d434669f71", [1]],
    ["d4b22ac7cb", [1, 1]],
    ["d5b47e8dec", [1, 1]],
    ["d879d1dee2", [1, 1]],
    ["d894086d17", [1, 1]],
    ["d95334bf4d", [1]],
    ["db08c76b78", [1]],
    ["dbb403f3ea", [2, 1]],
    ["dc1d497810", [1]],
    ["dd3373514a", [1]],
    ["de68433b8d", [1, 1]],
    ["df272e125c", [2]],
    ["e01e3ed9a2", [1]],
    ["e1591c0003", [1, 1]],
    ["e1a415a754", [2, 2]],
    ["e2aadd7839", [1, 1]],
    ["e2c0c40491", [1, 1]],
    ["e3d8bfb183", [1]],
    ["e482b08f7b", [1, 2]],
    ["e4c2d40066", [2, 1]],
    ["e59175c727", [1]],
    ["e73024b2eb", [1, 2]],
    ["e810ef250a", [1]],
    ["e86411a2e0", [1, 1]],
    ["e874aef53b", [1, 1]],
  ])) {
    const row = vocabulary.find(record => record.id === `ja-vocabulary:${id}`);
    expect(row?.meaningReview?.examples?.keep.map(example => example.sense)).toEqual(selectedSenses);
  }
  const fruit = vocabulary.find(row => row.id === "ja-vocabulary:dbb403f3ea");
  expect(fruit?.meaningReview?.meanings.find(meaning => meaning.text === "to bear fruit")).toMatchObject({ entryId: "1320850", sense: 2, relation: "exact" });
  expect(fruit?.meaningReview?.meanings.find(meaning => meaning.text === "to ripen")).toMatchObject({ entryId: "1320850", sense: 1, relation: "exact" });
  const { source } = await loadJapaneseStudyArtifacts(process.cwd());
  for (const [id, sentenceIds] of new Map<string, number[]>([
    ["c6e5255341", [142326, 114235]],
    ["c6ff7af051", [139777, 202422]],
    ["c78f53bc65", [85248, 102179]],
    ["c7b727d62a", [225438]],
    ["c7d511e624", [185181]],
    ["c8370d28b0", [196535, 196536]],
    ["c8b2b3cf19", [117128]],
    ["c971fe970b", [173042, 186246]],
    ["ca5e766ec3", [79571, 79570]],
    ["ca6d480a55", [124132, 101747]],
    ["cab6203141", [121343]],
    ["caef3a92e5", [224067, 125538]],
    ["cb55b5d477", [208513, 125239]],
    ["cbb876724d", [188753, 78839]],
    ["cbf87a9c47", [158213, 97493]],
    ["cc73416716", [198129, 123587]],
    ["cc9839ab1b", [153095, 117227]],
    ["ccd2c2a8bf", [189007]],
    ["cd88dd47e4", [145782]],
    ["cec3699484", [79472]],
    ["ced0ddb80e", [194375, 91657]],
    ["ceee9cc545", [147755, 114341]],
    ["cf1e430209", [205492]],
    ["cf3f89597d", [210707, 143558]],
    ["cfadc86524", [235822, 158925]],
    ["cfe52cc622", [207174, 214069]],
    ["d019c7013c", [203873]],
    ["d0522fe2ab", [122327, 213012]],
    ["d098b11716", [403861, 455214]],
    ["d11ea557fa", [188511, 124103]],
    ["d153412251", [99111]],
    ["d197a98346", [190825]],
    ["d1d2e93a7e", [215787]],
    ["d2028709e8", [147467]],
    ["d222155dec", [77107]],
    ["d2573d60e7", [228306]],
    ["d28bc6fbd2", [82480, 97289]],
    ["d3003d9bb0", [108777]],
    ["d340763501", [97859, 207078]],
    ["d34cd59500", [121586, 218151]],
    ["d3602e8ff5", [223242, 197101]],
    ["d40a8e4a7f", [234162, 199020]],
    ["d421260438", [165745, 102152]],
    ["d44c0e793f", [74820]],
    ["d49f6c4d95", [216786, 216789]],
    ["d4a0853377", [522337, 140598]],
    ["d4b22ac7cb", [216632, 227432]],
    ["d5a063f643", [121474, 197665]],
    ["d5b47e8dec", [219883, 230578]],
    ["d5be746bde", [102372, 96307]],
    ["d75bb986c5", [185537, 74454]],
    ["d75d3e2220", [122900, 202816]],
    ["d786baf9ce", [227817, 227819]],
    ["d84448f0f9", [227889, 189993]],
    ["d879d1dee2", [159194, 187763]],
    ["d88434279f", [207222, 205069]],
    ["d894086d17", [175696, 125275]],
    ["d95334bf4d", [162200]],
    ["da73d5aa2c", [227972]],
    ["db08c76b78", [173618]],
    ["dba326f5ee", [147835, 168371]],
    ["dbb403f3ea", [178105, 219455]],
    ["dbb718ab22", [147830, 138432]],
    ["dbd84cdab0", [231903]],
    ["dc0c86c6c1", [147173]],
    ["dc3a23af19", [10238755]],
    ["dc7f5a8762", [75025, 76387]],
    ["dc86ca1da3", [156155, 221461]],
    ["dc94ba57ca", [110349]],
    ["dcd1a67561", [76325, 188469]],
    ["dcd3581fc6", [212668, 223241]],
    ["dd3373514a", [190093]],
    ["dd987bef55", [9457320]],
    ["ddca1b1da0", [210590, 169400]],
    ["de68433b8d", [101659, 75207]],
    ["df22519063", [88212, 102925]],
    ["df23c49a07", [145773, 121313]],
    ["df272e125c", [8729317]],
    ["df8ac0dd2f", [97495, 192641]],
    ["dfa4dd57f0", [211001, 168400]],
    ["e119a69b33", [99988, 152814]],
    ["e1483430fd", [13714003]],
    ["e1591c0003", [207841, 196712]],
    ["e1a415a754", [180378, 180381]],
    ["e1f1434b63", [115469, 206952]],
    ["e25f2eacb5", [174932, 160060]],
    ["e2a46f8f00", [142349, 170864]],
    ["e2aadd7839", [215645, 142552]],
    ["e2c0c40491", [228888, 228876]],
    ["e31981ba75", [207860, 159953]],
    ["e3cd081438", [168737]],
    ["e3d8bfb183", [93286]],
    ["e482b08f7b", [214036, 214040]],
    ["e4c2d40066", [195635, 187590]],
    ["e557f5d546", [206281, 171748]],
    ["e56d2cca3c", [182170, 142349]],
    ["e59175c727", [207414]],
    ["e5bc9f56c0", [121886]],
    ["e629f38882", [143895]],
    ["e7254a71b1", [108474, 106992]],
    ["e73024b2eb", [191217, 204500]],
    ["e7815da48e", [148108, 108000]],
    ["e810ef250a", [107972]],
    ["e86411a2e0", [160007, 145965]],
    ["e874aef53b", [12817091, 11021618]],
    ["e8c3be43a1", [234281, 88188]],
    ["e8edb84ce0", [150475, 96723]],
    ["e9022c75fe", [151037, 167548]],
    ["e9427e3ec2", [177953]],
  ])) expectReviewedExamples(source, id, sentenceIds);
}, 30_000);

test.runIf(cached)("accounts for every sentence in the seventh 150 remaining N2 dictionary-backed literal-match records", async () => {
  const { records, summary } = await loadJapaneseStudyContentReview(process.cwd());
  const n2 = records.filter(row => "written" in row).filter(row => row.introductionLevel === "N2");
  const cohort = n2.filter(row => {
    const selection = row.meaningReview?.examples;
    return selection && [...selection.keep, ...selection.omit].some(decision => decision.reason.startsWith("N2 seventh literal example cohort:"));
  });
  expect(cohort).toHaveLength(150);
  expect(cohort[0]?.id).toBe("ja-vocabulary:c6a40ed583");
  expect(cohort.at(-1)?.id).toBe("ja-vocabulary:e9427e3ec2");
  expect(cohort.reduce((n, row) => n + (row.meaningReview?.examples?.keep.length ?? 0), 0)).toBe(213);
  expect(cohort.reduce((n, row) => n + (row.meaningReview?.examples?.omit.length ?? 0), 0)).toBe(57);
  expect(cohort.flatMap(row => row.examples).every(example => example.literalTarget)).toBe(true);
  expect(n2.filter(row => row.meaningReview?.reason.startsWith("N2 seventh literal example cohort:"))).toHaveLength(104);
  expect(summary.counts).toMatchObject({ units: 10291, sourceRecords: 10307, meaningsWithExactEvidence: 14686, reviewedEquivalentMeanings: 2526, meaningsToReview: 6, constructionMeanings: 0, phraseAttestedMeanings: 6 });
  expect(summary.publicationChanged).toBe(false);
}, 30_000);


test.runIf(cached)("the final remaining N2 dictionary cohort rejects substring collisions, unselected senses and changed propositions", async () => {
  const { source } = await loadJapaneseStudyArtifacts(process.cwd());
  for (const [id, sentenceIds] of new Map<string, number[]>([
    ["e96e1a98b6", []],
    ["e976328667", [165955]],
    ["e9c84791a6", [221899]],
    ["ea4dcb2f93", [108739]],
    ["ea79d21fe4", [207814]],
    ["ec35d72f72", [172150]],
    ["ec5e038faf", [187178]],
    ["ec98265fb1", [227776]],
    ["eceb34f9ce", [124834]],
    ["ee9620e522", [173223]],
    ["eea1f873b2", []],
    ["ef6d8917c7", [173292]],
    ["efc3e4fab9", []],
    ["f00e187c45", []],
    ["f05f6d0f42", [220097]],
    ["f219e922cc", []],
    ["f2df5d4d53", []],
    ["f302afd38b", [101802]],
    ["f3a548dbcb", [171779]],
    ["f3b92fda4b", [103153]],
    ["f485f00a3a", [204499]],
    ["f49b31d33f", []],
    ["f4d4c5dfdf", [187498]],
    ["f54f6bb59e", [81632]],
    ["f552dae66e", [173026]],
    ["f699a2ccb4", []],
    ["f7022d26f1", [123463]],
    ["f77bd3fe09", [152908]],
    ["f7b7058565", [175051]],
    ["f7b99bf02c", [74557]],
    ["f7e0cf6ddd", [78219]],
    ["f83c71668d", [97453]],
    ["f8ca233853", [191626]],
    ["f98e192838", []],
    ["fa520c5357", [178997]],
    ["fb97ae808d", [180087]],
    ["fbe0220728", [175001]],
    ["fbfef46ca3", [211437]],
    ["fc3802c19c", []],
    ["fc4bbe285e", [121505]],
    ["fdfa195e3e", []],
  ])) {
    const card = expectReviewedExamples(source, id, sentenceIds);
    expect(card.meaningReviewBefore?.examples.length).toBeGreaterThan(0);
    expect(card.content.reading).toBe(card.meaningReviewBefore?.reading);
    expect(card.content.level).toBe(card.meaningReviewBefore?.level);
  }
}, 30_000);

test.runIf(cached)("the final remaining N2 dictionary cohort preserves full senses, contextual forms and supported scope", async () => {
  const { records } = await loadJapaneseStudyContentReview(process.cwd());
  const vocabulary = records.filter(row => "written" in row);
  for (const [id, selectedSenses] of new Map<string, number[]>([
    ["e9cdfd4e18", [1, 2]],
    ["ea45ce4bc8", [1, 1]],
    ["ea6553448c", [1, 1]],
    ["eaed415671", [1, 1]],
    ["eb52e01373", [1, 1]],
    ["ebca1fdaa7", [1]],
    ["ebf84be776", [1, 1]],
    ["ecfba97554", [1, 2]],
    ["edb85f7f58", [2]],
    ["ee838de1c4", [1, 1]],
    ["ee9620e522", [1]],
    ["eefbfe2afe", [1, 1]],
    ["ef6d8917c7", [1]],
    ["efca806408", [1, 1]],
    ["f082d73585", [1]],
    ["f0857f2b13", [1, 1]],
    ["f17646bffa", [1]],
    ["f3ca36a754", [1, 1]],
    ["f412accc0e", [1, 1]],
    ["f4192e4cee", [1]],
    ["f485f00a3a", [1]],
    ["f4d4c5dfdf", [1]],
    ["f4f844d9b9", [1, 1]],
    ["f6e95ffedb", [1, 1]],
    ["f76eb1bd74", [1, 1]],
    ["f7b7058565", [1]],
    ["f7b99bf02c", [2]],
    ["f7e0cf6ddd", [1]],
    ["f83c71668d", [1]],
    ["f8a8923c36", [1, 1]],
    ["f8ca233853", [1]],
    ["f94edce7c7", [2]],
    ["fa1efb5872", [1, 1]],
    ["fa520c5357", [1]],
    ["fa78df043e", [1, 1]],
    ["fad44a92bf", [1, 1]],
    ["fad45b8c0a", [1, 1]],
    ["fb97ae808d", [2]],
    ["fbe0220728", [1]],
    ["fc4bbe285e", [1]],
    ["fd699d42d8", [1, 1]],
    ["ffb5797b88", [1, 1]],
  ])) {
    const row = vocabulary.find(record => record.id === `ja-vocabulary:${id}`);
    expect(row?.meaningReview?.examples?.keep.map(example => example.sense)).toEqual(selectedSenses);
  }
  const { source } = await loadJapaneseStudyArtifacts(process.cwd());
  for (const [id, sentenceIds] of new Map<string, number[]>([
    ["e9cdfd4e18", [237008, 176618]],
    ["ea25add742", [232701, 113719]],
    ["ea45ce4bc8", [233200, 196656]],
    ["ea6553448c", [173080, 173084]],
    ["eaed415671", [174005, 224317]],
    ["eb52e01373", [218942, 149113]],
    ["eb8077f101", [215148, 224026]],
    ["ebca1fdaa7", [83460]],
    ["ebea673dd1", [186741, 234546]],
    ["ebf84be776", [84263, 173555]],
    ["ec666f2c30", [188794, 109587]],
    ["ecfba97554", [222599, 142732]],
    ["eda0d74d06", [151378, 223909]],
    ["edb85f7f58", [213128]],
    ["eddf7e2d4e", [147412]],
    ["ee39a2f4d5", [212957, 206775]],
    ["ee82459309", [219716, 208985]],
    ["ee838de1c4", [10751402, 76765]],
    ["ee9620e522", [173223]],
    ["eefbfe2afe", [198098, 81082]],
    ["efca806408", [11890698, 2715448]],
    ["f013a0a48d", [220230, 228185]],
    ["f082d73585", [10306179]],
    ["f084812be8", [101495, 75279]],
    ["f0857f2b13", [91039, 232345]],
    ["f1577088c4", [206705]],
    ["f17646bffa", [208250]],
    ["f26561e17b", [191219]],
    ["f28c668862", [156223]],
    ["f28cffe595", [85776, 166423]],
    ["f3ca36a754", [180622, 121387]],
    ["f3da3248a8", [174232, 84590]],
    ["f412accc0e", [100177, 100571]],
    ["f4192e4cee", [85453]],
    ["f428a460b7", [91004, 188796]],
    ["f48b6d18cb", [11648521]],
    ["f4d4c5dfdf", [187498]],
    ["f4f844d9b9", [234882, 222022]],
    ["f54f6bb59e", [81632]],
    ["f650563feb", [192764, 101125]],
    ["f6e95ffedb", [219970, 233253]],
    ["f7022d26f1", [123463]],
    ["f76eb1bd74", [11156567, 11156570]],
    ["f77bd3fe09", [152908]],
    ["f7b7058565", [175051]],
    ["f7b99bf02c", [74557]],
    ["f7e0cf6ddd", [78219]],
    ["f7f23b46b2", [209559, 148278]],
    ["f8022a178f", [80897]],
    ["f83c71668d", [97453]],
    ["f865797384", [208250, 157106]],
    ["f874eff83f", [199358, 100424]],
    ["f892df3605", [142097, 210476]],
    ["f8a8923c36", [192668, 143796]],
    ["f8ca233853", [191626]],
    ["f8dd76ee4c", [227472, 235542]],
    ["f94edce7c7", [498663]],
    ["f9af9e0e0e", [191099, 145314]],
    ["fa1efb5872", [1598218, 1619858]],
    ["fa217abd55", [223394, 223620]],
    ["fa35b044bd", [96442, 200080]],
    ["fa4c3baabd", [217741, 99191]],
    ["fa520c5357", [178997]],
    ["fa78df043e", [209474, 144706]],
    ["fa8933b8bc", [77120]],
    ["fad44a92bf", [212931, 113085]],
    ["fad45b8c0a", [227689, 149013]],
    ["fb23ffb300", [186596, 90800]],
    ["fb8a8984be", [146614, 146617]],
    ["fb97ae808d", [180087]],
    ["fbe0220728", [175001]],
    ["fbf1b7618e", [231601, 85425]],
    ["fbfef46ca3", [211437]],
    ["fc4bbe285e", [121505]],
    ["fd699d42d8", [145561, 220690]],
    ["fe1995963c", [177469]],
    ["fe5131f1d5", [231315, 122119]],
    ["ffb5797b88", [160503, 152245]],
  ])) expectReviewedExamples(source, id, sentenceIds);
}, 30_000);

test.runIf(cached)("finishes all 104 pending N2 dictionary-backed example records", async () => {
  const { records, summary } = await loadJapaneseStudyContentReview(process.cwd());
  const n2 = records.filter(row => "written" in row).filter(row => row.introductionLevel === "N2");
  const cohort = n2.filter(row => {
    const selection = row.meaningReview?.examples;
    return selection && [...selection.keep, ...selection.omit].some(decision => decision.reason.startsWith("N2 final literal example cohort:"));
  });
  expect(cohort).toHaveLength(104);
  expect(cohort[0]?.id).toBe("ja-vocabulary:e96e1a98b6");
  expect(cohort.at(-1)?.id).toBe("ja-vocabulary:ffb5797b88");
  expect(cohort.reduce((n, row) => n + (row.meaningReview?.examples?.keep.length ?? 0), 0)).toBe(142);
  expect(cohort.reduce((n, row) => n + (row.meaningReview?.examples?.omit.length ?? 0), 0)).toBe(48);
  expect(cohort.flatMap(row => row.examples).every(example => example.literalTarget)).toBe(true);
  expect(n2.filter(row => row.meaningReview?.reason.startsWith("N2 final literal example cohort:"))).toHaveLength(68);
  expect(n2.filter(row => row.meaningReview?.examples)).toHaveLength(1655);
  expect(n2.filter(row => row.examples.length && row.dictionarySenses.length && !row.meaningReview?.examples)).toEqual([]);
  expect(n2.flatMap(row => row.examples).filter(example => !example.literalTarget)).toHaveLength(544);
  expect(summary.counts).toMatchObject({ units: 10291, sourceRecords: 10307, meaningsWithExactEvidence: 14686, reviewedEquivalentMeanings: 2526, meaningsToReview: 6, constructionMeanings: 0, phraseAttestedMeanings: 6 });
  expect(summary.publicationChanged).toBe(false);
}, 30_000);
