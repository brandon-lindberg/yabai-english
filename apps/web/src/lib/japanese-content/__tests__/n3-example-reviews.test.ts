import { access } from "node:fs/promises";
import { expect, test } from "vitest";
import { loadJapaneseStudyArtifacts } from "../study-artifacts";
import { loadJapaneseStudyContentReview } from "../study-content-review";
import { expectReviewedExamples } from "./reviewed-card-assertions";

const cached = await access(".cache/japanese-content/study-v1.json").then(() => true, () => false);

test.runIf(cached)("N3 examples distinguish selected senses, grammatical roles and translation propositions", async () => {
  const { source } = await loadJapaneseStudyArtifacts(process.cwd());
  for (const [id, sentenceIds] of new Map<string, number[]>([
    ["0024055e8e", [101767]], // Attachment alone omits being unable to leave.
    ["02122dbf6e", [100682]], // A past preference differs from a present assertion.
    ["0983432238", [74912]], // Setting sun is separate from sinking or depression.
    ["0a25321a53", []], // Crossing limbs differs from assembling something.
    ["0b5703de3f", [161637]], // Accordance with income differs from accepting a request.
    ["0c74b17f50", [157780]], // A lottery win has a separately numbered sense.
    ["0f4b2590f6", []], // Cause and former-state 元 differ from basis/foundation.
    ["11ae7695a1", [180184]], // Dust covering differs from wearing headgear.
    ["13aa7b864c", []], // A potential solving form differs from coming untied.
    ["142fcb9705", [140800]], // One vase out of several adds an unstated set.
    ["19edd800f0", [166507]], // Incurring anger differs from inviting people.
    ["23538b01de", []], // Passenger drop-off differs from lowering objects.
    ["291125be1d", [226677]], // Money consumption differs from eating food.
    ["2ddd05a675", [113351]], // Holding a rope differs from being caught.
    ["33f792ec39", []], // Conceding and yielding a seat differ from assignment.
    ["37b92c0329", [224786]], // Mail delivery differs from sound carrying.
    ["382bde5adf", []], // Not necessarily and best-choice constructions differ from restriction.
    ["3dcb8b1eaf", [223375]], // Fuel exhaustion differs from cutting well.
    ["3dd04815d8", []], // Inclusion differs from holding in the mouth or mind.
    ["458adfb568", []], // Matching plans differs from combining; three people does not specify men.
    ["474e600ef2", []], // Representation is unselected on this association.
    ["50842f69c2", []], // Forgiveness differs from permission.
    ["53d0381de5", [223400]], // Connecting cities differs from the selected tying sense.
    ["54c6e05e14", []], // Team/list exclusion differs from physical detachment.
    ["58c5df73fd", []], // Obtaining oil or a license differs from coming off.
    ["591715a7f5", []], // Rendering decisions differs from lowering.
    ["5cc54de84b", []], // Numerical people differ from being alone or unmarried.
    ["6fcfd8b60b", [206364]], // Not wanting to discuss does not assert refusal.
    ["700d08f6e3", [123292]], // Computer startup differs from standing up.
    ["711e829034", [233250]], // Enthusiasm differs from insanity or malfunction.
    ["855d156059", []], // Telephone connection and proficiency have separate senses.
    ["8a2b4c5ed1", [229552]], // Washing away differs from draining or floating logs.
    ["8d8001f8cf", []], // Guiding a visitor and having one's way have separate senses.
    ["9054323c74", [204058]], // The malformed companion cannot teach stopping.
    ["908b44a04b", [188002]], // 予想 is a different word from 予測.
    ["92871301e1", [207039]], // The companion's English passive is malformed.
    ["98c8318e58", []], // Inclination and suitability differ from a building facing a direction.
    ["a14ba106bc", []], // Duty release and solving differ from unfastening.
    ["a2eee93db1", [211194]], // Being pressed for time differs from pursuing a thief.
    ["aa6e296421", []], // Cause and the distinct former-state entry differ from origin/source.
    ["ad88f57a3e", [84709]], // Straightening an arm differs from stretching legs.
  ])) {
    const card = expectReviewedExamples(source, id, sentenceIds);
    expect(card.originalContent?.examples).toHaveLength(2);
    expect(card.content.reading).toBe(card.meaningReviewBefore?.reading);
    expect(card.content.level).toBe(card.meaningReviewBefore?.level);
  }
  expectReviewedExamples(source, "08f58c3770", []);
  expectReviewedExamples(source, "486445bd56", []);
  expectReviewedExamples(source, "622adb5718", []);
}, 30_000);

test.runIf(cached)("N3 examples preserve explicit primary readings, valid inflections and eligible contextual senses", async () => {
  const { source } = await loadJapaneseStudyArtifacts(process.cwd());
  const strike = expectReviewedExamples(source, "08fb4b13c1", [197169]);
  expect(strike.content.reading).toBe("ぶつ");
  const say = expectReviewedExamples(source, "0f54df5fc1", []);
  expect(say.content).toMatchObject({ reading: "ゆう", other_readings: [], meanings: ["to say"] });
  const formalDay = expectReviewedExamples(source, "1938fb6bcb", []);
  expect(formalDay.content).toMatchObject({ reading: "みょうごにち", other_readings: [], meanings: ["day after tomorrow"] });
  const depict = expectReviewedExamples(source, "a359eccfaf", [193074, 157926]);
  expect(depict.content.reading).toBe("えがく");
  for (const [id, sentenceIds] of new Map<string, number[]>([
    ["049907be5e", [213458, 149141]], // Intense contest and violent collision have separate selected citations.
    ["05550395ae", [228076, 189649]], // Rumor spreading and negated fire spreading are valid inflections.
    ["058f981bc3", [125245]], // Partial kana 金ぞく remains the same word.
    ["0cc06624f2", [211238, 221779]], // Project/work progress uses selected sense 2.
    ["1210c0bf0b", [220877, 138018]], // Potential/passive physical lifting remains valid.
    ["236e0b11a0", [223238, 204694]], // Taking in a blouse and packing a box use selected senses 2 and 1.
    ["2a8f495a2f", [138184, 168856]], // Being hidden and concealing oneself both have selected citations.
    ["2b5e5351b0", [223415]], // Unbearable dislike differs from irresistible desire.
    ["2bbdd79021", [98045, 156648]], // Cutting-method and benefactive constructions retain the cutting predicate.
    ["356b9404ce", [97823, 143733]], // The full reaching sense covers agreement and water level.
    ["42ce4a629d", [188117, 83060]], // Physical touching and mentioning a topic remain distinct selected senses.
    ["5b9f9fdc86", [79759, 79771]], // Dawn has its own explicit selected citation.
    ["5c39a99fa2", [228092, 92092]], // Inducing sleep and inviting a date retain separate selected senses.
    ["69db85c3a9", [199624, 168322]], // Gift giving and a formal award retain separate selected citations.
    ["725adb9c35", [219938, 98455]], // Grounding and causal origin remain separately cited.
    ["8c4965a193", [236092, 123404]], // Obtaining a prize or relaxation remains valid.
    ["94e6dfb59c", [237581, 75956]], // Representation is selected here and the declared 表す form remains valid.
    ["978071c13d", [215230, 111305]], // Mixed-script ばく大 remains the same adjective.
    ["9ede43e44c", [224417, 155223]], // Katakana ナベ remains the same vessel word.
    ["a38cde5655", [170284, 218760]], // Omitting details and saving effort retain separate selected senses.
    ["aa0b4f216c", [210997, 9045415]], // Negative volitional and caution forms preserve release.
    ["aa391c76da", [79504, 203217]], // Promise violation and physical tearing remain separately cited.
  ])) expectReviewedExamples(source, id, sentenceIds);
}, 30_000);

test.runIf(cached)("accounts for every original sentence in the first bounded N3 nonliteral cohort", async () => {
  const { records, summary } = await loadJapaneseStudyContentReview(process.cwd());
  const n3 = records.filter(row => "written" in row).filter(row => row.introductionLevel === "N3");
  const cohort = n3.filter(row => {
    const selection = row.meaningReview?.examples;
    return selection && [...selection.keep, ...selection.omit].some(decision => decision.reason.startsWith("N3 first nonliteral example cohort:"));
  });
  expect(cohort).toHaveLength(150);
  expect(cohort[0]?.id).toBe("ja-vocabulary:0024055e8e");
  expect(cohort.at(-1)?.id).toBe("ja-vocabulary:ae7bf4b275");
  expect(cohort.reduce((n, row) => n + (row.meaningReview?.examples?.keep.length ?? 0), 0)).toBe(198);
  expect(cohort.reduce((n, row) => n + (row.meaningReview?.examples?.omit.length ?? 0), 0)).toBe(99);
  expect(n3.filter(row => row.meaningReview?.reason.startsWith("N3 first nonliteral example cohort:"))).toHaveLength(86);
  expect(summary.counts).toMatchObject({ units: 10291, sourceRecords: 10307, meaningsToReview: 6, constructionMeanings: 0, phraseAttestedMeanings: 6 });
  expect(summary.publicationChanged).toBe(false);
}, 30_000);

test.runIf(cached)("the final N3 nonliteral cohort distinguishes sense, auxiliary, homophone and translation mismatches", async () => {
  const { source } = await loadJapaneseStudyArtifacts(process.cwd());
  for (const [id, sentenceIds] of new Map<string, number[]>([
    ["af84cff990", [217994]], // The money-to-burn idiom differs from actual spoilage.
    ["b1ba670b85", [206634]], // Original place does not establish where something was found.
    ["b286c3e278", [150736]], // Vacancy differs from space or free time.
    ["b4d7ffd3f9", [121988]], // The companion adds a male referent and traffic.
    ["b517bb8180", [228865]], // Observing a custom differs from protecting an institution.
    ["b57a219b43", [201569]], // Lack of concern does not establish becoming hardened.
    ["b5afc90a96", [194593]], // Tooth chipping differs from lacking a quality.
    ["b7b23bf678", []], // Flowing differs from washing away; broadcasting has its own sense.
    ["b8dac563a6", [180473]], // Heading towards a destination differs from aiming an object.
    ["b921696612", [219287]], // A different きく word does not establish effectiveness.
    ["b94c212dad", [82777]], // The companion translation drops the when-pulled condition.
    ["ba21b41503", [190566]], // Unresolved furigana and the meal translation require repair.
    ["bab0ffb17a", [103453]], // The companion adds male gender to an unspecified child.
    ["bb0ec0bbd4", [224801]], // Emotional influence differs from physical movement.
    ["bd36844c24", [226129]], // Sunlight exposure differs from hitting or applying a patch.
    ["c0dfcb262d", [219378]], // Covering an academic topic differs from managing a problem.
    ["c1ddd6b914", [77573]], // Passed over does not clearly preserve going past/through a street.
    ["c2750be66b", [141601]], // Englishman adds gender and a narrower country attribution.
    ["c3d0f24680", []], // Engine starting and call forwarding have separate senses.
    ["c435f396e3", [210813]], // Leading to a place differs from the selected come/result-in sense.
    ["c5af695d0b", []], // Pitching a tent differs from sticking or pasting.
    ["cc270e7f06", []], // The causative needs repair; sobering is a distinct sense.
    ["cf3cbde2a8", []], // Progressive/cannot-refrain auxiliaries differ from standalone existence.
    ["d07f542720", [236826]], // Letting a bird fly differs from skipping a turn.
    ["d0ffc4ad62", [91280]], // 彼ら is plural; the translation says he.
    ["d40e2575e0", [203278]], // A completion auxiliary differs from selected extraction/omission senses.
    ["d5a89e32c4", [79364]], // Journey departure differs from taking employment.
    ["d5c6b153f1", []], // Faster and soon add an unsupported comparison and time bound.
    ["df68a4c0c8", [147666]], // The companion drops the if-possible condition.
    ["e0d7c68759", [193096]], // Storage differs from the selected completion auxiliary.
    ["e4c028044a", [159846]], // The companion adds a past finding event and speaker.
    ["e629f70aca", [157281]], // Mr adds gender to neutral さん.
    ["e729fb355f", [88197]], // Symptom complaint differs from emotional appeal.
    ["ea15f9f78a", [229408]], // The companion adds a letter and changes expectation to hope.
    ["efa915fbef", [154817]], // Saw alone does not preserve the selected chance encounter.
    ["f797ab74cc", [173622]], // An acquire-a-taste idiom differs from proportions or occupation.
    ["fb77f8ffbb", [99299]], // Incoming sunlight differs from transitive pouring or devotion.
    ["fbbdf50bbb", [161319]], // The unrestricted species comparison is unsuitable.
    ["ff035a2a04", [96659]], // Lose does not preserve forget in the companion.
  ])) {
    const card = expectReviewedExamples(source, id, sentenceIds);
    expect(card.originalContent?.examples).toHaveLength(2);
    expect(card.content.reading).toBe(card.meaningReviewBefore?.reading);
    expect(card.content.level).toBe(card.meaningReviewBefore?.level);
  }
}, 30_000);

test.runIf(cached)("the final N3 nonliteral cohort retains eligible spellings, inflections and separately selected contextual senses", async () => {
  const { source } = await loadJapaneseStudyArtifacts(process.cwd());
  for (const [id, sentenceIds] of new Map<string, number[]>([
    ["af53cba50b", [89764, 99356]], // Both vocal shouting forms remain.
    ["b30544a54e", [227297, 83312]], // Pinned 勤め/務め supports the same service/business entry.
    ["b333744018", [159320, 93344]], // Feeling and progressive tiredness remain.
    ["b3f81ac90b", [179455, 138077]], // Shining and blazing are within the same selected sense.
    ["b459e9db8c", [185422, 142733]], // Decrease to five preserves the boundary.
    ["b9a7186462", [230540, 110855]], // Active and passive employment remain.
    ["bc1d83a773", [232484, 89756]], // Group/game participation remains.
    ["bd2ba94516", [103947, 106041]], // Seeking employment and requesting help remain separately cited.
    ["c33ec335f7", [210972, 90623]], // Kana passive and annotated prospective passive remain.
    ["c34db201ec", [173334, 84850]], // A figurative proverb and personal narration remain.
    ["c3b808e41e", [230974, 79932]], // Potential and imperative counting preserve twenty/ten.
    ["c53be2d952", [226003, 96574]], // Reporting a belief does not assert that belief as fact.
    ["c91a6e26c5", [159872, 91507]], // Plain payment and causative passive remain.
    ["cb944daeac", [140400, 121076]], // Contracted checking and a polite return-time check remain.
    ["cc4511a68f", [183410, 210453]], // Both passive covering examples remain.
    ["d45fe050fc", [106591, 156228]], // Income earning remains distinct from laboring.
    ["d870dff504", [141976, 143903]], // Snow accumulation and the accumulation proverb remain.
    ["de64f6eb4a", [204910, 122234]], // Pinned 表れ supports the manifestation noun.
    ["e086a9e024", [223954, 107845]], // Approval and acceptance remain separately cited.
    ["ed41514a67", [219633, 223698]], // Selling well retains the contextual hotcakes idiom.
    ["f63274b0b2", [154837, 192766]], // Shaking head and an object before use remain.
    ["f91eb72b15", [75868, 222615]], // Pinned 町/街 supports the ordinary urban-place contexts.
    ["fc5f82cc4d", [198980, 88700]], // Desire and progressive dog ownership remain.
    ["fea8ab21fe", [176591, 86669]], // Cute and pretty are in the full selected sense.
  ])) expectReviewedExamples(source, id, sentenceIds);
  expectReviewedExamples(source, "b286c3e278", [150736]);
  expectReviewedExamples(source, "df68a4c0c8", [147666]);
  expectReviewedExamples(source, "e4c028044a", [159846]);
}, 30_000);

test.runIf(cached)("accounts for the final N3 nonliteral cohort and leaves no unreviewed nonliteral matches", async () => {
  const { records, summary } = await loadJapaneseStudyContentReview(process.cwd());
  const n3 = records.filter(row => "written" in row).filter(row => row.introductionLevel === "N3");
  const cohort = n3.filter(row => {
    const selection = row.meaningReview?.examples;
    return selection && [...selection.keep, ...selection.omit].some(decision => decision.reason.startsWith("N3 final nonliteral example cohort:"));
  });
  expect(cohort).toHaveLength(76);
  expect(cohort[0]?.id).toBe("ja-vocabulary:af53cba50b");
  expect(cohort.at(-1)?.id).toBe("ja-vocabulary:ff035a2a04");
  expect(cohort.reduce((n, row) => n + (row.meaningReview?.examples?.keep.length ?? 0), 0)).toBe(107);
  expect(cohort.reduce((n, row) => n + (row.meaningReview?.examples?.omit.length ?? 0), 0)).toBe(45);
  expect(n3.filter(row => row.meaningReview?.reason.startsWith("N3 final nonliteral example cohort:"))).toHaveLength(41);
  const pending = n3.filter(row => row.examples.length && !row.meaningReview?.examples);
  expect(pending.filter(row => row.examples.some(example => !example.literalTarget))).toHaveLength(0);
  expect(summary.counts).toMatchObject({ units: 10291, sourceRecords: 10307, meaningsToReview: 6, constructionMeanings: 0, phraseAttestedMeanings: 6 });
  expect(summary.publicationChanged).toBe(false);
}, 30_000);

test.runIf(cached)("N3 literal matches still distinguish selected senses, grammatical roles and changed propositions", async () => {
  const { source } = await loadJapaneseStudyArtifacts(process.cwd());
  for (const [id, sentenceIds] of new Map<string, number[]>([
    ["00077af4b5", [210607]], // England narrows the Japanese country reference.
    ["00612a587a", [183818]], // The companion drops the thunderous degree.
    ["009c03bfe9", [109764]], // The school-swimming assertion lacks geographic scope.
    ["00b4506e25", []], // Waiter/bellboy differs from the selected boy sense.
    ["01558111d1", [168676]], // Even-you focus is missing from the companion.
    ["0167b18f74", [118758]], // The companion needs a linking construction.
    ["01dda94e77", [149809]], // The companion's English subject/verb agreement needs repair.
    ["02424c2277", [110106]], // The companion's English articles need repair.
    ["03e5958da6", [150736]], // A job vacancy differs from space or free time.
    ["0440a8bd4f", [374701]], // The companion adds a male possessor.
    ["04e1e7a756", []], // Cooking degree and health condition differ from adjustment/arithmetic.
    ["04f80af544", [225838]], // Unprotected sex differs from uncooked/unprocessed/beer senses.
    ["05e4ce3a94", [87533]], // A compatibility idiom differs from anatomical skin.
    ["06b85de79a", [236029]], // During differs from numerical among/out of.
    ["070cf68b21", [211286]], // The companion's current national assertion lacks a date/source scope.
    ["077c9dde2c", [176554]], // Contracting to write differs from currently writing.
    ["0791e13d7b", [157615]], // Boy adds gender to an unspecified child.
    ["0adf15ff3f", [145782]], // The companion drops current pain and causal uncertainty.
    ["0aedc1119d", [96717]], // The companion's global resource assertion lacks a time anchor.
    ["0c7a901471", [93028]], // The companion adds a male pronoun.
    ["0c914e9a90", []], // An isolated old-person noun does not establish male gender.
    ["0cbc5fcb97", [168369]], // The companion's stereotyping proverb lacks suitable context.
    ["0dbafbe052", []], // Whistles differ from the selected flute/pipe sense.
    ["0e1d889990", [186913]], // Hearsay differs from a direct landlord statement.
    ["1038a70c3e", []], // Chance encounters differ from a collision/thud.
    ["1213823fa2", [74243]], // A hard situation differs from selected emotional pain.
    ["1224c14c05", []], // Candidate as a person differs from abstract candidacy.
    ["124f4d078f", [91235]], // Mr adds gender to さん.
    ["1255ad0e6f", [191858]], // Brown color differs from tea.
    ["135ed2fc45", [145302]], // Watching developments differs from actively testing the waters.
    ["13e4d7359c", [207631]], // A manager person differs from abstract supervision.
    ["13fdb782fe", [233642]], // The companion adds photographic contents and ownership.
    ["140ef1e848", [209631]], // Equipment/facilities costs do not establish utility consumption charges.
    ["1426fbe4ea", [173343]], // The companion adds an around-the-US itinerary.
    ["144ace6a3f", [102018]], // Beach narrows the Japanese shore/bank reference.
    ["15bfdc638d", [77930]], // The companion loses lunch scope.
    ["15d4ea5f82", []], // Reformulation and unestablished carrying context obscure the selected no example.
    ["16c5e91008", [197567]], // Installment payment does not establish image rather than tape/hardware.
    ["16dd291b4d", [158245]], // In the elevator differs from coming from it.
    ["17dc7366d9", []], // Eligibility examples need jurisdiction and date.
    ["180d018762", [147289]], // An argument is not the parliament/assembly referent.
    ["1935a3f544", []], // Numerical score/ratio sense differs from opponent-versus sense.
    ["19f535bb08", [148324]], // The unexplained proverb is not a clear literal dozing example.
    ["1a83326bf0", [235011]], // Soon adds a time bound and drops the if-you-do-so condition.
  ])) {
    const card = expectReviewedExamples(source, id, sentenceIds);
    expect(card.originalContent?.examples).toHaveLength(2);
    expect(card.content.reading).toBe(card.meaningReviewBefore?.reading);
    expect(card.content.level).toBe(card.meaningReviewBefore?.level);
  }
}, 30_000);

test.runIf(cached)("the first N3 literal cohort preserves valid senses, numerical boundaries and shared-sentence decisions", async () => {
  const { source } = await loadJapaneseStudyArtifacts(process.cwd());
  for (const [id, sentenceIds] of new Map<string, number[]>([
    ["00598d28f9", [150815, 85255]], // Intransitive arising/resulting has selected sense 2.
    ["009cdbf36f", [191103, 217967]], // Composition preserves eight members and a meal context.
    ["010f5bf635", [230999, 96574]], // Physical flatness and reported belief remain distinct from asserting the belief.
    ["01d17e5891", [153068, 121678]], // A singular peasant and plural farmers both retain the full sense.
    ["0422a82e00", [101014, 114200]], // Denial remains distinct from linguistic negation.
    ["04d6c4bd44", [159088, 117134]], // Viewing position and office location remain.
    ["0596cdc023", [222596, 223858]], // Fifteen boys/twenty-eight girls are preserved.
    ["0696f63fdf", [236120, 140762]], // Yen/dollar denominations remain exact.
    ["070c3ea238", [126860, 172033]], // Circle and full-day prefix retain separate citations.
    ["0ba966a4cb", [225482, 347403]], // The full pinned best-wishes sense supports both conventional greetings.
    ["0d9e1cfdac", [86286, 228371]], // Personal and national independence remain separately cited.
    ["0e79e4a9e2", [165980, 83253]], // Contextual lunch wording preserves the packed-meal examples.
    ["125a8eb816", [117447, 162333]], // Childish thought and very young age retain separate senses.
    ["12c19005ea", [103308, 142945]], // Until-noon duration differs from a by-noon deadline.
    ["1337b1b9ec", [80278, 97150]], // Both national border examples remain.
    ["1357988d61", [193081, 80056]], // Sprout/shoot/bud are in the full selected sense.
    ["140d8ab306", [79353, 83212]], // Negative-conditional obligation and a direct prohibition both remain.
    ["16c16727fb", [223848, 74986]], // Boy/man have separate selected citations.
    ["17409802d5", [166836, 169281]], // Remaining people and the sands-running-out time idiom remain.
    ["19a41952db", [152550, 165070]], // Middle of night includes 2 a.m. and preserves three awakenings.
    ["1ad20880d6", [233006, 231376]], // Wishes and the realization question remain.
  ])) expectReviewedExamples(source, id, sentenceIds);
  expectReviewedExamples(source, "0894c700f3", [92820]);
  expectReviewedExamples(source, "089623da2c", [205312]);
  expectReviewedExamples(source, "0d0c754a74", [226179]);
  expectReviewedExamples(source, "b286c3e278", [150736]); // The previous 明き decision agrees with 空き.
  expectReviewedExamples(source, "bab0ffb17a", [103453]); // The shared child sentence also stays omitted on 示す.
}, 30_000);

test.runIf(cached)("accounts for every original sentence in the first remaining N3 cohort", async () => {
  const { records, summary } = await loadJapaneseStudyContentReview(process.cwd());
  const n3 = records.filter(row => "written" in row).filter(row => row.introductionLevel === "N3");
  const cohort = n3.filter(row => {
    const selection = row.meaningReview?.examples;
    return selection && [...selection.keep, ...selection.omit].some(decision => decision.reason.startsWith("N3 first literal example cohort:"));
  });
  expect(cohort).toHaveLength(150);
  expect(cohort[0]?.id).toBe("ja-vocabulary:00077af4b5");
  expect(cohort.at(-1)?.id).toBe("ja-vocabulary:1ad20880d6");
  expect(cohort.reduce((n, row) => n + (row.meaningReview?.examples?.keep.length ?? 0), 0)).toBe(244);
  expect(cohort.reduce((n, row) => n + (row.meaningReview?.examples?.omit.length ?? 0), 0)).toBe(53);
  expect(n3.filter(row => row.meaningReview?.reason.startsWith("N3 first literal example cohort:"))).toHaveLength(100);
  const pending = n3.filter(row => row.examples.length && !row.meaningReview?.examples);
  expect(pending.filter(row => row.examples.some(example => !example.literalTarget))).toHaveLength(0);
  expect(summary.counts).toMatchObject({ units: 10291, sourceRecords: 10307, meaningsToReview: 6, constructionMeanings: 0, phraseAttestedMeanings: 6 });
  expect(summary.publicationChanged).toBe(false);
}, 30_000);

test.runIf(cached)("the second N3 literal cohort distinguishes senses, word identities, quantities and source repair", async () => {
  const { source } = await loadJapaneseStudyArtifacts(process.cwd());
  for (const [id, sentenceIds] of new Map<string, number[]>([
    ["1ad5c766ea", [221703]], // Permission differs from the separate passing-grade sense.
    ["1bd65d97c5", [227555]], // Physical closeness differs from exactly or ideally suited.
    ["1d8d5ad8d9", [96491]], // A chatterbox person differs from talk activity.
    ["1e1423597b", []], // Added male gender and a farmhouse building differ from farming-family/person.
    ["1e1cd4e481", [209324]], // Falling off differs from over a stage.
    ["1ea7451e69", [207041]], // The companion has unresolved furigana.
    ["206cb49bde", [83878]], // The companion needs historical/register context.
    ["207f712b62", []], // Someday loses the selected before-long emphasis.
    ["208282da05", []], // An unstated sister relationship and blanket color claim need omission.
    ["20915b1f87", [220674]], // Vehicle counting differs from a stand/support noun.
    ["20b5089feb", [113046]], // The appeal interjection is not the price noun.
    ["20bef3d13c", [102233]], // Place differs from selected earth/ground/soil.
    ["20fbba9af9", [230435]], // Behind someone's back has its own sense.
    ["2125719689", [221614]], // The companion adds a question recipient.
    ["215a642747", [198114]], // The companion has unresolved furigana.
    ["21b3678651", [108370]], // The national-army assertion lacks historical context.
    ["2272beabcd", [84449]], // The companion does not establish perform versus undergo surgery.
    ["23010891c3", [114236]], // The companion needs case-marker repair.
    ["233a387b5d", [213456]], // Doubtful differs from selected subtle.
    ["235bb74e62", [228670]], // Cessation differs from the prohibition expression.
    ["23ba87bda6", [97330]], // The companion's English preposition needs editing.
    ["2418b0bd40", []], // Both translations require grammatical editing.
    ["24194e1918", [121446]], // The companion's museum-visitation phrasing needs editing.
    ["24d66ba82b", []], // Added direction and a vague service label lose the responsible-person role.
    ["25664c20f9", [216343]], // Nominal one-of-two differs from the selected conjunction.
    ["2594292c24", [120741]], // An unqualified limitless-universe claim lacks support.
    ["271ffb6876", [220321]], // The sentence-structure claim lacks language/analysis context.
    ["27db6f596b", [222593]], // Monetary amount is a separate identity from picture frame.
    ["28631b73ea", [192872]], // The companion's proverb needs source repair.
    ["28a5ee1cda", []], // Unanchored fashion and an added superlative need omission.
    ["29899828b1", [235677]], // Business and high-time add narrower work and overdue meanings.
    ["2a534a4917", [112674]], // 書類 does not silently become registered-mail 書留.
    ["2af9a4e3e2", [137870]], // Always adds an unrestricted frequency claim.
    ["2c62d0aba0", []], // A visit and bound-for suffix do not establish the outbound-leg sense.
    ["2c83788ca8", [121753]], // The no-longer-fog-city claim lacks a date/scope.
    ["2d11008b0c", []], // Execution differs from relocation; the unanswered medical premise needs context.
    ["2d670c3944", [121493]], // A finding event and coin are added to money lying on a sidewalk.
    ["2def0fe8be", [199407]], // Unrestricted any differs from interrogative what kind.
    ["2e83a59cd5", []], // A performance and story setting differ from the physical stage.
    ["2f4c977989", [228340]], // A shot is a fixed measure absent from a small amount.
    ["30498eff96", [221923]], // Organs narrows vulnerable/vital body points.
    ["30dc28fcf5", [100337]], // Ownership over there differs from property on somebody else's land.
    ["3146d2f2ac", [180462]], // The invitation does not establish which spouse is addressed.
    ["33875d6135", [152333]], // The companion has unresolved furigana and unsupported generic scope.
    ["33abea1364", []], // Plural speakers differ from singular her; the companion has unresolved furigana.
    ["34372f5e76", [147429]], // The companion needs comparison-case repair.
    ["34502f33ca", [148148]], // The companion has unresolved furigana.
    ["347f2ce155", []], // Added male observer and quickly differ from source and suddenness.
  ])) {
    const card = expectReviewedExamples(source, id, sentenceIds);
    expect(card.originalContent?.examples).toHaveLength(2);
    expect(card.content.reading).toBe(card.meaningReviewBefore?.reading);
    expect(card.content.level).toBe(card.meaningReviewBefore?.level);
  }
}, 30_000);

test.runIf(cached)("N3 preserves primary readings and valid full-sense, figurative and numerical contexts", async () => {
  const { source } = await loadJapaneseStudyArtifacts(process.cwd());
  const formalSound = expectReviewedExamples(source, "26e15c1ade", []);
  expect(formalSound.content).toMatchObject({ word: "音", reading: "おん", meanings: ["sound"], other_readings: [] });
  expect(formalSound.originalContent?.examples).toHaveLength(2);
  for (const [id, sentenceIds] of new Map<string, number[]>([
    ["1bc27bd981", [232776, 176435]], // Resemblance and entirety retain separate citations.
    ["1cc7aa8d65", [235023, 110940]], // Six-person accommodation remains.
    ["1d48dc95a3", [208331, 123478]], // Mold and style retain separate senses.
    ["1d4ec7c2db", [141607, 160406]], // The two-group count remains.
    ["1e21784548", [168404, 160274]], // The full selected sense includes thunder and lightning.
    ["1e518ce28e", [226429, 92877]], // Boring and feeling bored retain separate selected senses.
    ["1e8e1ca3dc", [113050, 162000]], // Two thousand words remains exact.
    ["20410e72ff", [188692, 216035]], // Dimness and absentmindedness retain separate senses.
    ["20f712fd71", [201143, 222996]], // An unnumbered noun permits the contextual plural.
    ["22544f816e", [223657, 113489]], // Eating soup is the natural English consumption wording.
    ["2453d64002", [165569, 101155]], // Provision/supply includes uniforms, food and money.
    ["2848d83eb7", [141928, 216744]], // Extinction retains the selected process sense.
    ["29010ee3b0", [226821, 226820]], // Lunch and noon retain separate selected citations.
    ["2932bfdf1f", [94936, 126990]], // The full sense includes common knowledge as well as common sense.
    ["2add5a6bbc", [174932, 83517]], // Ten-percent discount and three-percent rise remain distinct.
    ["2b990c61a0", [212177, 192682]], // A figurative king title is not a habitat assertion.
    ["2bf06d30d9", [150609, 141527]], // Answer-sheet/examination-script contexts remain.
    ["2c814ebdd8", [110911, 110951]], // Both via-route examples remain.
    ["2e1e017ee0", [93098, 99839]], // Resultative savings and ten dollars weekly remain.
    ["3030916eee", [157251, 107615]], // Present position/salary remain.
    ["30f0623cca", [212813, 188429]], // Figurative anger and physical explosion remain.
    ["317aef42d7", [161065, 75787]], // Ten and seven years remain exact.
    ["32bd2e24f7", [122987, 142112]], // Slice and explicitly annotated cloth retain separate citations.
    ["3485a5b479", [105866, 215290]], // Explicit male referents establish the male-cousin context.
  ])) expectReviewedExamples(source, id, sentenceIds);
  expectReviewedExamples(source, "240d8ef155", [223288]);
  expectReviewedExamples(source, "34669ba2b8", [87835]);
}, 30_000);

test.runIf(cached)("accounts for every original sentence in the second remaining N3 cohort", async () => {
  const { records, summary } = await loadJapaneseStudyContentReview(process.cwd());
  const n3 = records.filter(row => "written" in row).filter(row => row.introductionLevel === "N3");
  const cohort = n3.filter(row => {
    const selection = row.meaningReview?.examples;
    return selection && [...selection.keep, ...selection.omit].some(decision => decision.reason.startsWith("N3 second literal example cohort:"));
  });
  expect(cohort).toHaveLength(150);
  expect(cohort[0]?.id).toBe("ja-vocabulary:1ad3b41d6f");
  expect(cohort.at(-1)?.id).toBe("ja-vocabulary:3485a5b479");
  expect(cohort.reduce((n, row) => n + (row.meaningReview?.examples?.keep.length ?? 0), 0)).toBe(237);
  expect(cohort.reduce((n, row) => n + (row.meaningReview?.examples?.omit.length ?? 0), 0)).toBe(61);
  expect(n3.filter(row => row.meaningReview?.reason.startsWith("N3 second literal example cohort:"))).toHaveLength(94);
  expect(summary.counts).toMatchObject({ units: 10291, sourceRecords: 10307, meaningsToReview: 6, constructionMeanings: 0, phraseAttestedMeanings: 6 });
  expect(summary.publicationChanged).toBe(false);
}, 30_000);

test.runIf(cached)("the third N3 literal cohort excludes wrong senses, changed propositions and unusable annotations", async () => {
  const { source } = await loadJapaneseStudyArtifacts(process.cwd());
  for (const [id, sentenceIds] of new Map<string, number[]>([
    ["3549d49781", [92673]], // The silence aphorism needs quotation or figurative context.
    ["360b70b61d", [213607]], // The companion adds a seeing event and observer.
    ["363e985c77", []], // Verbal mastery differs from proprietor and academic degree.
    ["3793fa82cf", [202356]], // Much loses the majority emphasis shared with 大半.
    ["379f6158b5", []], // Imminence differs from exactly and should.
    ["37bb355b59", [172500]], // Wasting time differs from something being unavoidable.
    ["3836c2c8bd", [208992]], // The animal-size comparison lacks land-animal scope.
    ["38914b5058", []], // The bill uses unselected payment sense 2.
    ["396f83701d", [120162]], // Hamlet uses a separately numbered acting-part sense.
    ["39b0ac16ca", [83692]], // Civil writing differs from a grammatical sentence.
    ["39baa3eb87", [96200]], // Hair coverage needs mammal scope.
    ["3b5d6e485c", []], // Excellence differs from strange; the companion drops first hearing.
    ["3bbedbe5a9", [110038]], // The child translation adds male gender.
    ["3cda3baabf", [92485]], // Rainy appearance differs from design.
    ["3cffc75454", [168850]], // The proverb translation drops the lifetime-versus-generations contrast.
    ["3d9a6a01ea", []], // A total differs from a plan; the proverb drops planning.
    ["3dbdf1b28b", []], // Copula plus causal particle differs from the conjunction.
    ["3e3a15d22b", [144706]], // The fishing hook is a separately numbered sense.
    ["3efa32e22e", [137835]], // Moving drops the fleeing action.
    ["3f77054caf", [226723]], // The social circle is a separately numbered sense.
    ["40312166c1", [88658]], // Male and smirk differ from an unspecified clerk and awkward laugh.
    ["40c44d898e", [222574]], // One more beer drops the target can unit.
    ["413bbde60b", [224386]], // The wild-plant prefix differs from the field noun.
    ["4209a354cb", [160243]], // Present sharing differs from past joining.
    ["43b76d54d8", []], // The climate rhyme and national-diet assertion need context.
    ["43db81a024", [184706]], // The blanket wine-harmless claim is unsuitable.
    ["44bc159936", []], // Phrase sense 2 differs from selected sentence sense 1.
    ["44edce4345", [82580]], // The companion has unresolved waist furigana.
    ["45f44c2449", [185326]], // Checkout bill/payment differs from accounting.
    ["4601135013", [207172]], // Metal sheet differs from board/plank.
    ["4713a549bc", [137341]], // The president translation adds male gender.
    ["4850008747", [137114]], // The companion has unresolved before furigana.
    ["4886c70b26", [104419]], // The prime-minister translation adds male gender.
    ["49827ea986", [152201]], // The English adds an unstated corruption accusation.
    ["4ac6ac022d", [104334]], // The companion replaces past importance with a present statement.
    ["4bf6db45d0", [137762]], // The university suffix differs from large/great.
    ["4f496dbfd2", [84128]], // The door being open is not established in Japanese.
    ["4f7398ac14", [173740]], // The global financial trend needs date and scope.
    ["4fbf3d9b7a", [203850]], // Shake off the towels drops removing dust.
    ["50463fe8e3", [2293362]], // Unhealthy weakens poisonous/toxic.
    ["5099ac7aef", [210776]], // The passive translation loses the seeing agent.
    ["50c0503d3d", [103206]], // The economic percentage lacks a reference period.
    ["50edc9f158", [166823]], // Every form of speech differs from every person.
    ["510004b9a1", [155101]], // The furigana groups words across the intended boundary.
    ["519deff273", [103802]], // Second adds an ordinal absent from next factory.
    ["51f103bc27", [168147]], // The sleep-over-medicine claim needs clinical or figurative context.
    ["52049336a2", [224369]], // The majority emphasis agrees with the shared 人生 decision.
  ])) {
    const card = expectReviewedExamples(source, id, sentenceIds);
    expect(card.originalContent?.examples).toHaveLength(2);
    expect(card.content.reading).toBe(card.meaningReviewBefore?.reading);
    expect(card.content.level).toBe(card.meaningReviewBefore?.level);
  }
  const formalToday = expectReviewedExamples(source, "380bf1226c", []);
  expect(formalToday.content).toMatchObject({ word: "今日", reading: "こんにち", other_readings: [], meanings: ["today", "this day"] });
  expectReviewedExamples(source, "3963aabbaa", []);
}, 30_000);

test.runIf(cached)("the third N3 literal cohort retains primary readings, full senses, compound roots and contextual translations", async () => {
  const { source } = await loadJapaneseStudyArtifacts(process.cwd());
  for (const [id, sentenceIds] of new Map<string, number[]>([
    ["34bee09fdb", [176658, 199072]], // Army and troops remain within the full selected sense.
    ["35c17c9820", [175320, 90251]], // Animal feed remains valid through feeding constructions.
    ["368d767ec1", [142502, 212175]], // Figurative reigning and actual rule remain valid.
    ["371f1b3f39", [101960, 96029]], // Human enemy retains the selected adversary citation.
    ["379b767ed6", [78569, 88428]], // Next prefix and since suffix retain separate citations.
    ["38272461d1", [153047, 84904]], // The selected habitual adverb remains valid.
    ["38664919d1", [163496, 161969]], // Five seconds per day and thirty seconds remain exact.
    ["395b9a867b", [231285, 206917]], // Contextual dress wording remains within clothing suiting someone.
    ["3c2e8a5848", [221135, 221136]], // Actual 書留 preserves the registered-mail request.
    ["3c5dcce6bf", [227722, 217590]], // Care and trouble retain separate selected citations.
    ["3c5ff54bea", [223288, 218933]], // Five-percent portion and cake share remain valid.
    ["3ce84453e7", [75697, 223314]], // Humble receiving and colloquial requesting remain separately selected.
    ["3e80832e23", [177669, 159998]], // Only and free of charge retain separate citations.
    ["3f544e7ada", [231389, 137840]], // Personal action retains the person-themselves emphasis.
    ["3fa8d2f8ed", [194368, 112568]], // Human group and school class retain contextually correct citations.
    ["3fdcce9a17", [87778, 207584]], // The 田んぼ root preserves the annotated primary た reading.
    ["3fe84c43ef", [220823, 207413]], // One-mile and ten-foot width measurements remain exact.
    ["3fecda87cd", [225015, 204386]], // Both plus examples use the selected positive-effect sense.
    ["4087e49c73", [101770, 167414]], // The repeated たび construction preserves the primary reading.
    ["40b4a7cb92", [113354, 92972]], // Both examples explicitly attest primary さいちゅう.
    ["41ad5f20ad", [82699, 141548]], // The selected fair adjective and generic teacher obligation remain valid.
    ["42d77d4da9", [233064, 104749]], // Personal attribution and blame remain within the selected sense.
    ["43bc725de0", [90827, 167451]], // Both emphatic denials use selected expression sense 2.
    ["48385111dd", [120280, 120885]], // Convention and contest retain separate citations.
    ["4ab4064451", [199848, 202858]], // Intense blow and tight waist retain separate selected senses.
    ["4b1cb88257", [137837, 88473]], // Both examples cite assistance rather than a helper person.
    ["4e4e228253", [227381, 123149]], // The conventional cake proverb and simultaneous takeoff remain valid.
    ["4e69ae617b", [115300, 542960]], // School grade and proficiency rank retain separate citations.
    ["4f949d1f9d", [202874, 189917]], // Conventional cocoa bean and contextual pea retain the full bean/pea sense.
    ["5075cd7c3a", [163796, 145268]], // Exam passing and inspection passing retain separate citations.
    ["5083117601", [187036, 83576]], // Fence and wall retain separate selected citations.
    ["51ed2ee220", [183961, 108788]], // The conventional perfection proverb and emphatic rejection remain valid.
    ["52377d2422", [13713990]], // The native-reading distinction stays within selected 訓 sense 1.
  ])) expectReviewedExamples(source, id, sentenceIds);
  const { records } = await loadJapaneseStudyContentReview(process.cwd());
  const reviewed = new Map(records.filter(row => "written" in row).map(row => [row.id, row]));
  expect(reviewed.get("ja-vocabulary:371f1b3f39")?.meaningReview?.examples?.keep).toMatchObject([
    { index: 0, entryId: "1582000", sense: 1 },
    { index: 1, entryId: "1582000", sense: 1 },
  ]);
  expect(reviewed.get("ja-vocabulary:3fa8d2f8ed")?.meaningReview?.examples?.keep).toMatchObject([
    { index: 0, entryId: "1397450", sense: 2 },
    { index: 1, entryId: "1397450", sense: 1 },
  ]);
  const plus = expectReviewedExamples(source, "3fecda87cd", [225015, 204386]);
  expect(plus.content.meanings).toEqual(["plus"]);
  expect(reviewed.get("ja-vocabulary:3fecda87cd")?.meanings).toEqual([{ text: "plus", status: "exact", evidence: [{ entryId: "1115630", sense: 4, gloss: "plus" }] }]);
  expect(reviewed.get("ja-vocabulary:3fecda87cd")?.meaningReview?.examples?.keep).toMatchObject([{ index: 0, sense: 4 }, { index: 1, sense: 4 }]);
}, 30_000);

test.runIf(cached)("accounts for every original sentence in the third remaining N3 cohort", async () => {
  const { records, summary } = await loadJapaneseStudyContentReview(process.cwd());
  const n3 = records.filter(row => "written" in row).filter(row => row.introductionLevel === "N3");
  const cohort = n3.filter(row => {
    const selection = row.meaningReview?.examples;
    return selection && [...selection.keep, ...selection.omit].some(decision => decision.reason.startsWith("N3 third literal example cohort:"));
  });
  expect(cohort).toHaveLength(150);
  expect(cohort[0]?.id).toBe("ja-vocabulary:34bee09fdb");
  expect(cohort.at(-1)?.id).toBe("ja-vocabulary:52377d2422");
  expect(cohort.reduce((n, row) => n + (row.meaningReview?.examples?.keep.length ?? 0), 0)).toBe(235);
  expect(cohort.reduce((n, row) => n + (row.meaningReview?.examples?.omit.length ?? 0), 0)).toBe(61);
  expect(n3.filter(row => row.meaningReview?.reason.startsWith("N3 third literal example cohort:"))).toHaveLength(86);
  expect(summary.counts).toMatchObject({ units: 10291, sourceRecords: 10307, meaningsToReview: 6, constructionMeanings: 0, phraseAttestedMeanings: 6 });
  expect(summary.publicationChanged).toBe(false);
}, 30_000);

test.runIf(cached)("the fourth N3 literal cohort distinguishes word identities, grammatical roles and changed propositions", async () => {
  const { source } = await loadJapaneseStudyArtifacts(process.cwd());
  for (const [id, sentenceIds] of new Map<string, number[]>([
    ["524a699a99", []], // Adverbial unexpectedness and emergency differ from the selected interjection.
    ["525af6640e", [146603]], // The wall is absent from the Japanese source.
    ["5489cdb398", [79999]], // Asking what differs from asking whether anything exists.
    ["5514dc4a90", [158408]], // Closing a business does not establish selling it.
    ["55b77976ae", [104232]], // Fix-your-wagon drops the specific spanking action.
    ["56092bf6de", [166942]], // The companion adds an agent and needs idiomatic repair.
    ["562f63004e", [102421]], // Reputation is separate from financial shares.
    ["56e2434245", [210615]], // The racialized historical characterization needs attribution and scope.
    ["5750d76e14", []], // Please is a different word from copper coin.
    ["5782695fa6", [78359]], // The adverb indeed differs from the selected nouns.
    ["585f7c3b7f", []], // Copula plus connective particle differs from the standalone conjunction.
    ["5874850a67", [171367]], // The companion changes past study into present habitual study.
    ["58e01c0b72", [87166]], // The head/expression source cannot silently become face.
    ["5929a15e3a", [75673]], // Before and by differ at the deadline boundary.
    ["59f54d8eb5", [110383]], // Gaining friends differs from having friends because of honesty.
    ["5ac33a4880", [168794]], // The coin suffix differs from a spherical object.
    ["5ae490b220", [118382]], // Sino-Japanese differs from daytime.
    ["5c2b71ef11", [101627]], // The companion's English needs idiomatic repair.
    ["5c93fedd45", []], // The general legal and causal claims need scope.
    ["5d1c14bede", [97583]], // Having a feeling drops the depths-of-the-heart origin.
    ["5d26933404", []], // A verb stem and bodily function differ from the selected labor noun.
    ["5d347b309a", [161437]], // The boys-will-be-boys excuse needs register context.
    ["5d54acd27e", [109014]], // The Japanese frequency question needs repair.
    ["5ddec3e77f", [212860]], // Sharp pain differs from a physical sharp edge.
    ["5de51daefa", [75362]], // The companion reverses latter-versus-former preference.
    ["5fef88ef1f", []], // Added male gender and unselected rapport require omission.
    ["6082d893b1", [203957]], // Usually weakens always.
    ["60a04003e4", [159909]], // More adds an absent comparison.
    ["60b9a40caa", [102591]], // The companion has unresolved furigana.
    ["61ddee48f6", [103406]], // The companion adds an ought-to-be contrast.
    ["626076af0e", []], // Electronic is a separate adjective from the electron noun.
    ["628ac894ab", []], // Finite verbs differ from the selected sunset/end nouns.
    ["65319da4bb", [209556]], // Faster adds an absent comparative growth rate.
    ["658366a1aa", [104110]], // His adds male gender to the unspecified scholar.
    ["65dfe9149d", []], // Alarm configuration and hair setting differ from a set of things.
    ["65f02872e4", [220146]], // The general genre claim needs scope; calamity has its own selected citation.
    ["66c159592d", [81665]], // The street location is absent from the Japanese wandering.
    ["6711714ac5", [185095]], // The companion's English needs idiomatic repair.
    ["67153e2a31", [203026]], // The attribution adds male gender to an unspecified wise person.
    ["6763e0f981", []], // Air flow and pedestrian traffic differ from street or same way.
    ["676b358d1e", []], // Inner intentions and changed hunger timing differ from the target usage.
    ["689b83786e", []], // The national crop and major-cause claims need dated factual scope.
    ["68dbed6140", [207084]], // Brushstrokes differ from the physical tool; instrumental pen remains valid.
    ["69257fa105", [200628]], // The companion adds plural participants to enjoyable skating.
    ["6997e916e3", [85930]], // The companion assigns male gender to the unspecified teacher.
    ["6a34d83a67", []], // A transaction narrows business; metropolitan area broadens city center.
    ["6a86cad697", [101790]], // The enthusiast suffix differs from a political party.
    ["6b165e8a57", [160957]], // Driver's adds an unspecified license type.
    ["6b381a57b1", [84981]], // The companion's English natural-cause construction needs repair.
  ])) {
    const card = expectReviewedExamples(source, id, sentenceIds);
    expect(card.originalContent?.examples).toHaveLength(2);
    expect(card.content.reading).toBe(card.meaningReviewBefore?.reading);
    expect(card.content.level).toBe(card.meaningReviewBefore?.level);
  }
  for (const id of ["59a9224bb4", "5dfe972116"]) {
    const card = expectReviewedExamples(source, id, []);
    expect(card.originalContent?.examples).toHaveLength(1);
  }
}, 30_000);

test.runIf(cached)("the fourth N3 literal cohort preserves valid readings, full senses, quantities and contextual citations", async () => {
  const { records } = await loadJapaneseStudyContentReview(process.cwd());
  const reviewed = new Map(records.filter(row => "written" in row).map(row => [row.id, row]));
  expect(reviewed.get("ja-vocabulary:65f02872e4")?.meanings).toEqual([
    { text: "tragedy", status: "exact", evidence: [{ entryId: "1483280", sense: 2, gloss: "tragedy" }] },
  ]);
  expect(reviewed.get("ja-vocabulary:65f02872e4")?.meaningReview?.examples?.keep).toMatchObject([{ index: 1, entryId: "1483280", sense: 2 }]);
  expect(reviewed.get("ja-vocabulary:5d154c188d")?.meaningReview?.examples?.keep).toMatchObject([
    { index: 0, entryId: "1065950", sense: 1 },
    { index: 1, entryId: "1065950", sense: 1 },
  ]);
  const { source } = await loadJapaneseStudyArtifacts(process.cwd());
  for (const [id, sentenceIds] of new Map<string, number[]>([
    ["526233614e", [198146, 206821]], // Bus service and a two-seat flight fit the full transport-service sense.
    ["526a0047ad", [204801, 150668]], // Approximate wing extent and a figurative time metaphor remain.
    ["52d4f9b548", [191119, 191120]], // Collective committee wording preserves all individual members.
    ["5315a22cf3", [213376, 113217]], // Future-time uses preserve hope and uncertainty.
    ["533668820b", [212720, 209202]], // Natural smelling wording and an unnumbered plural remain.
    ["53e1ba680a", [222689, 185444]], // Association and meeting retain separate selected senses.
    ["54e840405e", [229759, 236018]], // Elapsed years and the ten-year quantity remain.
    ["5564da9929", [93529, 168954]], // Middle age and partly done retain separate citations.
    ["5569286656", [224138, 155879]], // Contextual ellipsis and not-any negation remain valid.
    ["55b369ffb6", [109508, 204886]], // Both additive conjunction uses remain.
    ["55c4301a2c", [194674, 204741]], // Reading displayed digits and numerical figures remain distinct.
    ["57c650defa", [209349, 138279]], // Trace and scar retain separate citations.
    ["590eb476e5", [151321, 225332]], // A natural venue-recommendation request remains valid.
    ["59b359ba79", [220496, 194191]], // Imitation and behavior retain separate citations.
    ["5b445da9d8", [103842, 195900]], // Doctoral qualification and the doctor title fit eligible selected sense 2.
    ["5bd15630c9", [140952, 172483]], // Grade-report and school-term contexts remain.
    ["5bd987a58a", [199122, 213920]], // A historical question and a negated uniqueness comparison remain.
    ["5c3831a496", [220270, 82165]], // Proper use and proper knowledge retain the full selected sense.
    ["5cf06f835b", [89720, 92628]], // Gentle action and stealthy departure retain separate citations.
    ["5d154c188d", [1015911, 223684]], // Both drink examples preserve juice rather than the deuce homonym.
    ["5e5a5dfee9", [117217, 168884]], // The sisters' count and explicit しまい reading remain.
    ["5fd3da8fb5", [233824, 107558]], // Seat and car exchanges remain within the full selected sense.
    ["614bded84d", [82698, 237406]], // Generic men preserves humanity in the equality principles.
    ["61bb6561cb", [125250, 125242]], // Iron's atomic number and general heat conduction remain.
    ["61f7afccc0", [226408, 229955]], // Or and perhaps retain separate citations.
    ["6366942bd5", [113203, 228713]], // Both nervousness examples cite sensitivity rather than anatomy.
    ["637071aa35", [86684, 88799]], // Both majority-of-income quantities remain.
    ["639bd22c8d", [146578, 99555]], // Natural knows-tricks wording preserves the conjuring repertoire.
    ["63a1944ca4", [98603, 183569]], // Considering an action and taking danger into account remain.
    ["67399eea20", [107610, 218227]], // Both best evaluations retain selected sense 1.
    ["6765fe103a", [89124, 150050]], // Both automatic compounds remain.
    ["6847277390", [143444, 96769]], // Social race categories and racial equality do not add a biological taxonomy.
    ["686d8759b3", [220996, 112029]], // Sixty cents and the one-thousand-yen limit remain exact.
    ["692f5c5fae", [120234, 120512]], // The full selected sense includes both strange evaluations.
    ["69417b0273", [105373, 137993]], // Both ceremony examples cite sense 2 rather than equation.
    ["6a521aa0cd", [224901, 101394]], // Conventional burning-hot wording and actual scalding preserve tongue.
    ["6b23ed610d", [195025, 218182]], // Contextual machine and electricity-producing device remain.
    ["6b3917013d", [183231, 173231]], // The personal cold-weather report and ordinary climbing comparison remain.
    ["6b76d20f62", [178457, 98798]], // Both English-skill improvement examples remain.
  ])) expectReviewedExamples(source, id, sentenceIds);
}, 30_000);

test.runIf(cached)("accounts for every original sentence in the fourth remaining N3 cohort", async () => {
  const { records, summary } = await loadJapaneseStudyContentReview(process.cwd());
  const n3 = records.filter(row => "written" in row).filter(row => row.introductionLevel === "N3");
  const cohort = n3.filter(row => {
    const selection = row.meaningReview?.examples;
    return selection && [...selection.keep, ...selection.omit].some(decision => decision.reason.startsWith("N3 fourth literal example cohort:"));
  });
  expect(cohort).toHaveLength(150);
  expect(cohort[0]?.id).toBe("ja-vocabulary:524a699a99");
  expect(cohort.at(-1)?.id).toBe("ja-vocabulary:6b76d20f62");
  expect(cohort.reduce((n, row) => n + (row.meaningReview?.examples?.keep.length ?? 0), 0)).toBe(234);
  expect(cohort.reduce((n, row) => n + (row.meaningReview?.examples?.omit.length ?? 0), 0)).toBe(64);
  expect(n3.filter(row => row.meaningReview?.reason.startsWith("N3 fourth literal example cohort:"))).toHaveLength(95);
  expect(summary.counts).toMatchObject({ units: 10291, sourceRecords: 10307, meaningsToReview: 6, constructionMeanings: 0, phraseAttestedMeanings: 6 });
  expect(summary.publicationChanged).toBe(false);
}, 30_000);

test.runIf(cached)("the fifth N3 literal cohort excludes different words, roles, senses and changed propositions", async () => {
  const { source } = await loadJapaneseStudyArtifacts(process.cwd());
  for (const [id, sentenceIds] of new Map<string, number[]>([
    ["6bf6a2e393", [127251]], // The companion specifies an agent absent from the general possibility question.
    ["6cb86b20fc", [236141]], // The question counter differs from title or topic.
    ["6e68ac9baf", [230064]], // The slide wording needs idiomatic repair.
    ["6ee6c57219", [97472]], // The companion has a malformed 出きる spelling.
    ["6f97791279", [154817]], // Producing a word differs from encountering it.
    ["7018224dfa", [77529]], // A driving turn differs from a serial number.
    ["718ef13639", [165044]], // The companion supplies an unspecified plural possessor.
    ["733b519a1e", []], // Unresolved furigana and a desire-versus-belief change require omission.
    ["735842741b", []], // 正しい and 正す differ from 正・せい.
    ["73db783ef8", [88186]], // The companion supplies plural observers.
    ["7433983c57", []], // The escort verb and an added female referent do not teach this companion noun.
    ["7456693bdd", [165253]], // Miss adds gender and status to neutral さん.
    ["74be6d8f27", [151014]], // The companion drops the opening prohibition.
    ["7582c1d86e", [209181]], // Reflection differs from selected shadow.
    ["76a8947aac", [184096]], // The generic room request drops the target seating context.
    ["76b200a366", []], // Station and lamp differ from a supporting stand.
    ["76b7811036", [165543]], // The companion supplies a plural substitution agent.
    ["76f3332f8f", [194634]], // The companion changes present opportunity into future opportunity.
    ["793da2875f", [92793]], // The unqualified national characterization drops the seeming qualification.
    ["7942f6b1d6", [106493]], // The companion fixes an unestablished persuaded recipient.
    ["79d117da8a", []], // Clandestine activity differs from physical underground; the companion adds a house and changes tense.
    ["7b2ac42cba", [220572]], // Next month contradicts next week.
    ["7b812f29c4", [78807]], // The companion's necessity wording needs repair.
    ["7c391cdd2b", []], // More than half differs from half or more; a concerned party is not necessarily a ruler.
    ["7d156e99e7", []], // Added publishing agents and unscoped historical claims need omission.
    ["7d18731cba", []], // 従って verb constructions differ from the therefore conjunction.
    ["7d26b9a262", [105995]], // The companion supplies plural recipients.
    ["7e15214f9a", []], // Reward broadens wages; generic work drops day-labor context.
    ["7f4e93c10e", [103566]], // The humans-only laughter claim lacks comparative scope.
    ["7f83598742", [96758]], // Near the edge differs from at the edge.
    ["7fa019fe1b", [227560]], // The companion fixes an unclear remaining-month timeline.
    ["80c8c02c83", [171543]], // Preparing now differs from completed preparation.
    ["814b2c6fa4", []], // Adverbial considerably and corresponding-to use other senses.
    ["823d4cdf65", [179537]], // Financial hardship uses a separately numbered sense.
    ["8320d2162f", [3520711]], // The unscoped March bloom claim needs location context.
    ["832f591208", [176202]], // The companion's out-of-shot wording needs clarification.
    ["83aba83042", [148378]], // The beneficiary of good fortune is not established.
    ["847a57a03d", [233168]], // A favorable opinion does not clearly preserve qualified admiration.
    ["84e820e672", [173181]], // The present-age characterization needs attribution and scope.
    ["87333c0d40", [126939]], // Biology differs from a living organism.
    ["87d50bbaf1", [170512]], // The companion supplies plural travelers.
    ["8822903a55", [204297]], // Transmission does not establish a receiving-stage error.
    ["88273999d5", [112188]], // The companion assigns male gender to an unspecified person.
    ["8906b928b2", [165597]], // Moderate intensity differs from everyday frequency.
    ["89564cdaf0", [164886]], // Both differs from jointly.
    ["89acdd2f72", [233937]], // The generic seeing request loses arrival and the illness-visit context.
    ["8a5bd5d9d1", [210750]], // The companion adds ownership and drops the management role.
    ["8aabac557b", [163431]], // Careless handling differs from poor quality.
    ["8bc52096d2", [97496]], // The companion is malformed and needs quotation scope.
    ["8c406cea71", [224994]], // The household-role prescription needs register context.
    ["8ce4616a78", []], // A vehicle type and a finding agent are added.
    ["8d0f952e4c", [231718]], // Money change is a different word from angling.
    ["8d2c6575c2", [233025]], // Winning prospects differ from personal wishes.
  ])) {
    const card = expectReviewedExamples(source, id, sentenceIds);
    expect(card.originalContent?.examples).toHaveLength(2);
    expect(card.content.reading).toBe(card.meaningReviewBefore?.reading);
    expect(card.content.level).toBe(card.meaningReviewBefore?.level);
  }
  const reporter = expectReviewedExamples(source, "89b43cf72a", []);
  expect(reporter.originalContent?.examples).toHaveLength(1);
}, 30_000);

test.runIf(cached)("the fifth N3 literal cohort preserves readings, pinned senses, figurative context and exact quantities", async () => {
  const { records } = await loadJapaneseStudyContentReview(process.cwd());
  const development = records.find(row => row.id === "ja-vocabulary:7bf9f0076e");
  if (!development || !("written" in development)) throw new Error("Missing vocabulary development");
  expect(development.meanings).toEqual([
    { text: "development", status: "exact", evidence: [{ entryId: "1477680", sense: 2, gloss: "development" }] },
    { text: "growth", status: "exact", evidence: [{ entryId: "1477680", sense: 1, gloss: "growth" }] },
  ]);
  expect(development.meaningReview?.examples?.keep).toMatchObject([
    { index: 0, entryId: "1477680", sense: 1 },
    { index: 1, entryId: "1477680", sense: 2 },
  ]);
  const { source } = await loadJapaneseStudyArtifacts(process.cwd());
  for (const [id, sentenceIds] of new Map<string, number[]>([
    ["6b8002d0f8", [219941, 105999]], // Cat and long-story narratives remain.
    ["6bec104564", [191374, 91233]], // Pinned 取り付く independently permits possession; its spelling stays.
    ["6bfc102fca", [107960, 127112]], // Implementation remains distinct from knowledge and program execution.
    ["6e524d6fdc", [235683, 143903]], // A particular body-to-dust narrative and the accumulation proverb remain.
    ["6ebe370c91", [147954, 196488]], // Bodily effect and oneself retain separate selected senses.
    ["6f514b9fe7", [143467, 143481]], // Figurative world valuations remain.
    ["70a5d45f7c", [113013, 183365]], // Both opportunity-use examples cite practical use.
    ["71229cb421", [183030, 179687]], // Both safe examples remain.
    ["72529375f7", [171153, 210679]], // The colloquial speaker question and missing-speech regret remain.
    ["74d028f694", [168954, 182885]], // The beginning proverb agrees with the earlier 半ば selection.
    ["752d199c2e", [125274, 125278]], // Both broad moderate-exercise examples retain their original wording.
    ["7624d1daae", [208966, 207808]], // The unnamed castle date and direction remain exact.
    ["7634c5903a", [93031, 220661]], // Both degree constructions remain.
    ["766c710757", [142688, 165549]], // A life's-origin question does not invent an answer.
    ["778765a79e", [76795, 143675]], // Conventional snail horns and buffalo horns retain the full sense.
    ["779c980843", [120323, 120950]], // Both reasonable-conduct constructions remain.
    ["77d12d0c77", [122845, 149140]], // Conflict and physical collision retain separate citations.
    ["78ee271a60", [179078, 103049]], // Both added-degree constructions retain the causal relation.
    ["79e1b168ba", [170270, 170271]], // Procedural impartiality and the tentative lawsuit outcome remain.
    ["7a5bf31b8a", [171867, 110189]], // The full selected stability sense includes physical balance.
    ["7aa085a782", [207684, 123113]], // Both detective examples and the two-person count remain.
    ["7da22b4d75", [216393, 2660390]], // Both jet-airplane events remain.
    ["7e01f30eaa", [150176, 85246]], // The prevention proverb and open prevention question remain.
    ["7f3020dd7b", [211702, 203801]], // The source's seeing event and ordinary painting wording remain.
    ["800c70f3e1", [188478, 158219]], // Both prince examples remain.
    ["81009f3e01", [92659, 96721]], // Both present and former luxury contexts remain.
    ["82611a8f51", [212462, 110365]], // The full selected yacht sense explicitly includes a sailboat.
    ["82a95bb809", [100615, 107778]], // Both physical-surface examples remain.
    ["831bd5addd", [122419, 96425]], // The common primary にっぽん reading is preserved without adding a reading.
    ["8421f715e7", [182946]], // The annotated 間・ま reading is valid in this conventional proverb.
    ["847b06de33", [108613, 183407]], // Unnumbered flags permit the contextual plural.
    ["85d4d0e2b9", [141598, 219736]], // The longest chapter and three-chapter count remain.
    ["86e70a4d27", [196309, 155853]], // The no-quitter idiom preserves ordinary perseverance.
    ["87062c3230", [220959, 204741]], // The sum example agrees with the prior 数字 association.
    ["87d53d42f3", [199759, 155733]], // Both ordinary car-driving constructions retain the selected driving sense.
    ["881624f8c3", [211917, 148765]], // The eternally-a-boy metaphor does not claim biological immortality.
    ["884dd65596", [206959, 151221]], // Both contextual impressions remain.
    ["888b58c5e4", [186870, 79585]], // Observation and birdwatching fit the full selected sense.
    ["88fa4babd2", [96574, 126939]], // A reported flat-Earth belief and an open life question do not assert those claims.
    ["88fc5e477e", [116144, 206794]], // Both report evaluations retain their original wording.
    ["8b106a5072", [152266, 202113]], // The conventional going-steady expression preserves a romantic partner.
    ["8b63615acb", [236543, 87486]], // Agreement and being convinced retain separate selected citations.
    ["8b9b33028c", [161417, 232830]], // Always and any time retain separate citations.
    ["8bdbbb4bf4", [162243, 164751]], // Both financial-leeway examples remain.
    ["8c36af4c9f", [224666, 121024]], // The conventional little-expected understatement remains.
    ["8c7a0c5f8b", [222701, 210134]], // The full selected confectionery sense includes both cake and candy.
  ])) expectReviewedExamples(source, id, sentenceIds);
}, 30_000);

test.runIf(cached)("accounts for every original sentence in the fifth remaining N3 cohort", async () => {
  const { records, summary } = await loadJapaneseStudyContentReview(process.cwd());
  const n3 = records.filter(row => "written" in row).filter(row => row.introductionLevel === "N3");
  const cohort = n3.filter(row => {
    const selection = row.meaningReview?.examples;
    return selection && [...selection.keep, ...selection.omit].some(decision => decision.reason.startsWith("N3 fifth literal example cohort:"));
  });
  expect(cohort).toHaveLength(150);
  expect(cohort[0]?.id).toBe("ja-vocabulary:6b8002d0f8");
  expect(cohort.at(-1)?.id).toBe("ja-vocabulary:8d2c6575c2");
  expect(cohort.reduce((n, row) => n + (row.meaningReview?.examples?.keep.length ?? 0), 0)).toBe(229);
  expect(cohort.reduce((n, row) => n + (row.meaningReview?.examples?.omit.length ?? 0), 0)).toBe(65);
  expect(n3.filter(row => row.meaningReview?.reason.startsWith("N3 fifth literal example cohort:"))).toHaveLength(95);
  expect(summary.counts).toMatchObject({ units: 10291, sourceRecords: 10307, meaningsToReview: 6, constructionMeanings: 0, phraseAttestedMeanings: 6 });
  expect(summary.publicationChanged).toBe(false);
}, 30_000);

test.runIf(cached)("the sixth N3 literal cohort excludes different roles, names, senses and source mismatches", async () => {
  const { source } = await loadJapaneseStudyArtifacts(process.cwd());
  for (const [id, sentenceIds] of new Map<string, number[]>([
    ["8d4e493846", [89733]], // But changes the additive relation to concession.
    ["8e02fa0ef4", [187146]], // The companion adds plural observers.
    ["8e2ffbbcc1", [205661]], // The companion's English needs grammatical repair.
    ["8e8763b3a8", [199940]], // The companion lacks the required article in on-the-verge-of.
    ["905e143f7a", [187150]], // The universal pairing proverb needs historical/register context.
    ["908a7a4f49", [85500]], // The companion's Japanese knee-length construction needs repair.
    ["91695e543a", [218096]], // Separately is an unselected sense; the idiomatic negative remains.
    ["91e25df095", [233344]], // The companion adds male gender to an unspecified traveler.
    ["939f77d3f0", [180314]], // Procurement is narrower than the general textbook question.
    ["93e1217f4a", [185097]], // Enough adds an absent adequacy threshold.
    ["9452242b03", [234691]], // Has liking lacks the required article.
    ["9453cb20ca", [110344]], // A colleague relationship replaces the professor role.
    ["94696ff83d", [142640]], // Operating condition differs from musical tone.
    ["947efd8771", [153502]], // Tray differs from plate/dish.
    ["94d9c6d53a", [96229]], // The companion adds a religious agent and plural beneficiaries.
    ["9544a3940b", [88408]], // He/guy adds gender to neutral あいつ and drops also.
    ["954f0401d2", [177247]], // No matter how uses a separately numbered concessive sense.
    ["95c33dd7eb", []], // Verb imperatives differ from the welcome interjection.
    ["964f36527f", [202349]], // The companion adds male gender to the unmarked subject.
    ["9768eacb27", [98916]], // The companion loses the unprecedented degree.
    ["97ddf0dc45", [75173]], // Mike the name differs from microphone.
    ["999ca0b1df", []], // An added male reflexive and approach-versus-promotion require omission.
    ["999fa2ee16", []], // Ownership is added; the clock-checking participle dangles.
    ["99dc3e9d67", [105340]], // The companion has unresolved furigana.
    ["9ae027f872", [79552]], // The companion drops explicit inability to visit.
    ["9b428ad249", [143922]], // The human-only fire-use claim needs comparative scope.
    ["9b7a976736", [159775]], // The companion adds a proof recipient.
    ["9ba2a9c365", []], // Mr assigns gender not established by neutral 氏.
    ["9c2ecc46b9", [89912]], // Best boy narrows the whole-class comparison and adds age.
    ["9eb3e2a34e", [114397]], // The crop claim agrees with the prior 主要 omission.
    ["9ed2c14da0", [231717]], // Production and automation degree do not preserve productivity and thoroughness.
    ["9f6e77d1fe", [102474]], // The companion adds plural late arrivals.
    ["9f8aac6311", [196926]], // The companion fixes an unestablished third-party creator.
    ["9fafb3a7a8", [220863]], // Club adds an unspecified venue type.
    ["9fc5f5ca7f", []], // Color drops blooming flowers; quantity drops variety.
    ["9ff6bba172", []], // The emergency number lacks country scope and the companion needs idiomatic repair.
    ["a0748eb71f", [100723]], // The shared proverb mismatch agrees with the earlier 老い decision.
    ["a101c852f4", [123696]], // Wings differ from selected feathers.
    ["a1d4ed495c", [125585]], // Legislative passage differs from physical transit.
    ["a301b00431", [145559]], // Smoking narrows smoke exposure.
    ["a32b605031", [81371]], // The companion has unresolved furigana.
    ["a3bb21b401", [96681]], // Allied Powers differ from allied armed forces.
    ["a3c0999c5c", []], // Copula plus particle differs from the standalone conjunction.
    ["a4766630c6", [109068]], // Access drops the role/status relation.
    ["a4f0b205a3", [101854]], // Sufficient feeding is a separate sense; the English also adds gender.
    ["a6aca833ca", [183215]], // Sudden occurrence differs from rapid action.
    ["a6ec708ec6", []], // A weather spell uses an unselected suffix sense.
    ["a70c18ed83", [185035]], // An object scratch differs from selected bodily injury.
    ["a7495ca386", []], // Cursory reading differs from numerical approximation.
    ["a786043e89", [82493]], // A robber person differs from a robbery event.
    ["a7bc912ad3", [138137]], // The marigold statement needs plant identity and poetic/phenological scope.
    ["a7c4dfbb71", [209302]], // The companion adds car ownership.
    ["a80b19470d", [98250]], // The companion adds gender and an unrestricted imperative.
  ])) {
    const card = expectReviewedExamples(source, id, sentenceIds);
    expect(card.originalContent?.examples).toHaveLength(2);
    expect(card.content.reading).toBe(card.meaningReviewBefore?.reading);
    expect(card.content.level).toBe(card.meaningReviewBefore?.level);
  }
}, 30_000);

test.runIf(cached)("the sixth N3 literal cohort retains full senses, contextual citations, primary readings and quantities", async () => {
  const { records } = await loadJapaneseStudyContentReview(process.cwd());
  const mail = records.find(row => row.id === "ja-vocabulary:9a61747e5d");
  if (!mail || !("written" in mail)) throw new Error("Missing mail vocabulary");
  expect(mail.meanings).toEqual([
    { text: "mail", status: "exact", evidence: [{ entryId: "1605680", sense: 2, gloss: "mail" }] },
    { text: "postal service", status: "exact", evidence: [{ entryId: "1605680", sense: 1, gloss: "postal service" }] },
  ]);
  expect(mail.meaningReview?.examples?.keep).toMatchObject([
    { index: 0, entryId: "1605680", sense: 1 },
    { index: 1, entryId: "1605680", sense: 2 },
  ]);
  const { source } = await loadJapaneseStudyArtifacts(process.cwd());
  for (const [id, sentenceIds] of new Map<string, number[]>([
    ["8d3ff79d95", [148478, 518854]], // Both soil examples remain.
    ["8de918380d", [84636, 218460]], // Nuts-and-bolts and ABCs preserve fundamentals.
    ["8e592c506e", [115269, 206051]], // Both century ordinals remain exact.
    ["8e6b354697", [147991, 173191]], // The traffic delay and thousands-of-cars quantity remain.
    ["8e9d8bfa84", [198072, 229783]], // The conventional could-always suggestion is not actual repeated handoffs.
    ["8eae03ec6e", [82805, 77291]], // Family cough context and cough-interrupted narration remain.
    ["8f41bba826", [208558, 223340]], // One-week and five-year validity remain demonstrative examples.
    ["8f4da6b41b", [166098, 166289]], // Explicit plural agents and unnumbered tents remain.
    ["8f735b886b", [229563, 2280872]], // Both degree constructions remain.
    ["8fb4973f14", [175380, 152570]], // The full selected examination sense includes an eye check.
    ["8fb52e4502", [218069, 78190]], // Visitor gifts and travel souvenirs retain separate citations.
    ["903f33a220", [189451, 126012]], // The broad Concorde speed feature remains source-supported.
    ["908ad483d6", [149215, 149222]], // Both individual/society examples remain.
    ["90ae05137c", [160033, 85480]], // Both emphatic emotional-reaction examples remain.
    ["938fc7e369", [222795, 224606]], // Credits and measurement units retain separate citations.
    ["9424213f90", [214813, 213618]], // The rugby feature and featureless-town contexts remain.
    ["952c7983d6", [148857, 227792]], // Figurative mental richness and broad Australian resources remain.
    ["96bec84032", [137762]], // The explicit small-item しょう reading remains.
    ["97ccdb5cad", [83736, 152932]], // Both physics subject examples use selected sense 2.
    ["98d66e7abc", [174090, 179606]], // Physical stimulus and economic impetus retain separate citations.
    ["99f743f623", [197315, 101098]], // The full selected fret/on-the-edge sense supports exam nervousness.
    ["9a184ecb80", [190362, 91128]], // Both emphatic questions remain.
    ["9a7106c569", [202527, 202533]], // Clarification and summary retain separate citations.
    ["9a8a4d8fa3", [96896, 92808]], // Lawn includes grass.
    ["9ace958be5", [95500]], // Contextual charity wording preserves pity and compassion.
    ["9adc22cc25", [162902, 173736]], // The eligible common primary こうば reading stays.
    ["9cac7f9475", [75682]], // Pinned 逢瀬 permits the lover/tryst context.
    ["9d02c51185", [120412]], // The reported feast-or-famine idiom preserves busy versus idle firefighting.
    ["9d6bea343d", [198852, 94885]], // Both adjectival foolish assessments use selected sense 2.
    ["9ed2e741fa", [222361, 196728]], // Broad poison/venom context is existential rather than a delivery-mechanism taxonomy.
    ["9edfc06f0c", [96933, 146981]], // Both successive-event constructions remain.
    ["9fbf209387", [219459, 146221]], // Both examples explicitly annotate the primary cotton reading めん.
    ["a10dbb12a8", [226792, 93854]], // Position and standpoint retain separate citations.
    ["a12afe6e3d", [88531, 154866]], // School origin and city origin retain the full selected sense.
    ["a22c0d6a0e", [108972, 158445]], // Three-at-a-time and two-at-a-time step quantities remain.
    ["a3438025b5", [209808, 218720]], // The reciprocal predicate supplies plural facts and the discussion invitation remains natural.
    ["a380b73ffa", [145351, 160933]], // The railway completion example agrees with the earlier 鉄道 selection.
    ["a39cf53f66", [200084, 92817]], // Both desire examples cite eagerness rather than frequency.
    ["a3e1ac6ec4", [145172, 145171]], // Reported newspaper accounts do not assert external current events.
    ["a4e6e6b186", [163492, 79538]], // Proper operation and promise fulfillment retain the full selected sense.
    ["a513d2c3ad", [123479, 88610]], // Preference and taste retain separate citations.
    ["a6c8fd99d7", [162377, 91119]], // Forgetting oneself in joy and tennis immersion retain separate citations.
    ["a6e18afc55", [183136, 149008]], // Both tunnel examples remain.
    ["a7ca4ae607", [237445, 119487]], // Bundle/bunch/sheaf permits the contextual pile of papers.
  ])) expectReviewedExamples(source, id, sentenceIds);
}, 30_000);

test.runIf(cached)("accounts for every original sentence in the sixth remaining N3 cohort", async () => {
  const { records, summary } = await loadJapaneseStudyContentReview(process.cwd());
  const n3 = records.filter(row => "written" in row).filter(row => row.introductionLevel === "N3");
  const cohort = n3.filter(row => {
    const selection = row.meaningReview?.examples;
    return selection && [...selection.keep, ...selection.omit].some(decision => decision.reason.startsWith("N3 sixth literal example cohort:"));
  });
  expect(cohort).toHaveLength(150);
  expect(cohort[0]?.id).toBe("ja-vocabulary:8d3ff79d95");
  expect(cohort.at(-1)?.id).toBe("ja-vocabulary:a80b19470d");
  expect(cohort.reduce((n, row) => n + (row.meaningReview?.examples?.keep.length ?? 0), 0)).toBe(234);
  expect(cohort.reduce((n, row) => n + (row.meaningReview?.examples?.omit.length ?? 0), 0)).toBe(62);
  expect(n3.filter(row => row.meaningReview?.reason.startsWith("N3 sixth literal example cohort:"))).toHaveLength(102);
  expect(summary.counts).toMatchObject({ units: 10291, sourceRecords: 10307, meaningsToReview: 6, constructionMeanings: 0, phraseAttestedMeanings: 6 });
  expect(summary.publicationChanged).toBe(false);
}, 30_000);

test.runIf(cached)("the seventh N3 literal cohort excludes unselected senses, reading markers and changed propositions", async () => {
  const { source } = await loadJapaneseStudyArtifacts(process.cwd());
  for (const [id, sentenceIds] of new Map<string, number[]>([
    ["a873a6e522", []], // Past finding and present onset replace the Japanese timing.
    ["a88999f659", []], // Favor sense and honorific verb stem differ from the lending noun.
    ["a8a06b3e15", [149256]], // The companion has an unresolved reading marker.
    ["a8a4d2c95f", [177011]], // The gift-horse source uses the person kanji for a received object.
    ["aa98da380d", [85751]], // The companion is a finite reading-verb construction.
    ["ab3d3e2bd7", [123689]], // Faulty English agreement and added male gender need repair.
    ["ab46c02abb", []], // Broadcast stations use another sense; spread differs from incidence rate.
    ["ad063e9d9a", []], // Negation scope is ambiguous and quickest travel lacks comparison scope.
    ["ad70550f9b", [191476]], // Kajitsu and particle no-mi do not instantiate the target noun mi.
    ["adc631a6f6", []], // General expansion differs from selected magnification.
    ["b08a90a19e", [212886]], // The concert's close uses an unselected end sense.
    ["b1358dbe27", []], // Added male gender and an opaque proverb translation need repair.
    ["b22ceca000", [223384]], // An internal group does not establish informal formality.
    ["b30b244443", [227297]], // Usual shopping adds a habitual qualifier.
    ["b36b0a71b9", [201607]], // Eyesight becoming worse differs from eye strain.
    ["b434efd06b", []], // Both have unresolved reading markers; at dawn also differs from before dawn.
    ["b43c2524a1", []], // Sales uses a separately numbered unselected sense.
    ["b556900c26", []], // As-if and not-at-all use other numbered senses.
    ["b5fcd0d05f", [208023]], // The companion loses the approximate height qualifier.
    ["b65151eaec", [190145]], // The companion drops generally from acceptance scope.
    ["b687c34ed5", [183737]], // Flight adds an unestablished setting.
    ["b7185fc1f0", [229895]], // My house adds an unestablished destination and ownership.
    ["b718c116a2", [85192]], // The companion's Japanese object lacks its particle.
    ["b73c4e0e07", []], // Neither sentence contains the target gargling word.
    ["b7517a4f00", [168254]], // The companion's thought/ideal wording needs source repair.
    ["b86c6df29f", []], // Generic boats do not establish the selected rowing-boat sense.
    ["b974c316fc", []], // Eventual time differs from an interrogative pronoun.
    ["b9d02a8165", [221386]], // The companion reverses the task's difficulty and existence.
    ["b9edd7963b", [203207]], // The discovery claim needs historical perspective and context.
    ["b9f82a4617", []], // Negative impossibility uses a different selected-sense requirement.
    ["bcab821414", []], // Apparent-knowing and manner constructions differ from method/style suffix senses.
    ["bcadb9720d", [199079]], // TV drama differs from selected dramatic spectacle.
    ["bd7dce62ae", [182110]], // The laborious-work idiom differs from physical bone.
    ["bf2843b87f", [220959]], // A long queue adds a length absent from the Japanese.
    ["bf35e6a2e6", [191974]], // Buying a softener replaces using soft water.
    ["c06233b95e", [172598]], // Breeding adds reproduction to raising cattle.
    ["c2946190ea", []], // Both particle endings differ from the outflow/origin noun.
  ])) {
    const card = expectReviewedExamples(source, id, sentenceIds);
    expect(card.originalContent?.examples).toHaveLength(2);
    expect(card.content.reading).toBe(card.meaningReviewBefore?.reading);
    expect(card.content.level).toBe(card.meaningReviewBefore?.level);
  }
}, 30_000);

test.runIf(cached)("the seventh N3 literal cohort retains contextual senses, compounds, metaphors and exact quantities", async () => {
  const { records } = await loadJapaneseStudyContentReview(process.cwd());
  for (const [id, senses] of new Map<string, number[]>([
    ["a8dbeaa8a0", [2, 5]], // As soon as and circumstances.
    ["abbd37156d", [2, 2]], // Selected adjectival chance sense includes manichi-no-baai.
    ["ad70550f9b", [2]], // Resulting grain uses the selected seed sense.
    ["adfd2f59c3", [2, 1]], // Awareness and restored consciousness.
    ["af617a11ed", [2, 1]], // Conditional even-if and by-the-way.
    ["b115c24eac", [1, 3]], // Sunday abbreviation and day counter.
    ["b250983bb5", [2, 1]], // Dress and physical figure.
    ["b4340dadc2", [1, 2]], // Overcoat and exceeding a weight allowance.
    ["b5d6202e3f", [1, 1]], // General differences use sense 1 rather than mathematical subtraction.
    ["bcadb9720d", [2]], // Life-as-drama uses the selected spectacle sense.
  ])) {
    const row = records.filter(record => "written" in record).find(record => record.id === `ja-vocabulary:${id}`);
    expect(row?.meaningReview?.examples?.keep.map(example => example.sense)).toEqual(senses);
  }
  const { source } = await loadJapaneseStudyArtifacts(process.cwd());
  for (const [id, sentenceIds] of new Map<string, number[]>([
    ["a812d7a958", [178712, 79836]], // Both surprise and unexpected ease remain.
    ["a89f303db8", [178272, 103486]], // Both general standards remain.
    ["a8f91562fe", [197225, 225802]], // Human kinship and the supported botanical metaphor remain.
    ["a913d4b1f6", [156466, 203268]], // Both nominal tameshi-ni constructions remain.
    ["a9c92c47c3", [224910, 199263]], // Both flavor-strength examples remain.
    ["aa8bd6f038", [208813, 222206]], // An illustrative past medicine effect and expected plan effect remain.
    ["abfa120074", [207991, 210088]], // Both approximate quantities remain.
    ["ace0cb1202", [75797, 213328]], // Evaluative excellence remains without inventing a measurement.
    ["adddc0dcc8", [211334, 190626]], // Climbing-shoe ellipsis and explicit mountain ascent remain.
    ["ae29f467bd", [220116, 220393]], // Both explicitly annotated hyou table/list readings remain.
    ["ae498d63bc", [216160, 85792]], // Attentive-listening idiom and generic proverb agent remain.
    ["aee461222c", [206886, 234447]], // An unnamed requirement and open composition question remain.
    ["aeff3c4d96", [142999, 122897]], // Conventional weather nochi and explicit later-time nochi remain.
    ["aff4676eed", [212401, 87939]], // The full notice sense includes news.
    ["b0073ea226", [85759, 100689]], // Emergency context needs no invented emergency number.
    ["b1170de661", [144904, 106163]], // An existence question and father-like presence remain.
    ["b1861d938a", [90316, 140158]], // Selfishness and wilful behavior retain separate senses.
    ["b2fa7ff523", [107122, 199391]], // Prime-of-life compound and corresponding proverb remain.
    ["b341907305", [172216, 192464]], // Frost cover and conventional frost-damage wording remain.
    ["b3726f128a", [226427, 119566]], // Contextual financial ruin and bankruptcy remain.
    ["b3edaebb52", [189891, 76666]], // Both described fracture events remain.
    ["b5647f7089", [159602, 144268]], // Food quantity and generic human need remain.
    ["b83a39027b", [225098, 221241]], // The half fold and illustrative baby context remain.
    ["b87cfb16ef", [187165, 158568]], // One week and one thousand yen remain exact.
    ["b96dc58373", [235889, 141836]], // Both since starting points remain.
    ["ba60eb30d1", [123200, 230238]], // The illustrative comparative fare and supported state count remain.
    ["bc21114bf3", [77333, 12179643]], // Both hometown contexts remain.
    ["bc8296f44e", [74034, 193264]], // Wine quality and better-quality comparison remain.
    ["bcb8af927c", [218237, 184331]], // Both learning-method and learning-opportunity contexts remain.
    ["bcbf5309e2", [125888, 125882]], // A reported individual event and illustrative forecast remain.
    ["bcc0ebf62f", [219654, 138341]], // Generic many-a-man wording represents people conventionally.
    ["bd67aff522", [80947, 192877]], // Both nothing expressions remain.
    ["bd7e02e772", [188566, 137588]], // Both broad pollution examples remain supported in scope.
    ["be007a1109", [201176, 126312]], // Both illustrative tooth narratives remain.
    ["be926ffe0c", [184433, 114501]], // The full results sense includes school grades.
    ["c03a75fe96", [221903, 106653]], // Absorption and enthusiasm remain.
    ["c0d834ed70", [159786, 211050]], // Whole-story and whole-town contexts remain.
    ["c1aeb94b13", [109769, 160858]], // Both permanence constructions remain.
    ["c1ec09619d", [220241, 3229894]], // Both reciprocal relations remain.
    ["c231d12e3a", [160508, 170767]], // Both mental preparedness constructions remain.
    ["c2cddd519e", [227161, 98127]], // Reciprocal chemistry and homework help remain.
    ["c3426903e6", [102975, 140942]], // The double-negative decision and conventional progress maxim remain.
    ["c3b1f16454", [191561, 98814]], // Both romantic love descriptions remain.
  ])) expectReviewedExamples(source, id, sentenceIds);
}, 30_000);

test.runIf(cached)("accounts for every original sentence in the seventh remaining N3 cohort", async () => {
  const { records, summary } = await loadJapaneseStudyContentReview(process.cwd());
  const n3 = records.filter(row => "written" in row).filter(row => row.introductionLevel === "N3");
  const cohort = n3.filter(row => {
    const selection = row.meaningReview?.examples;
    return selection && [...selection.keep, ...selection.omit].some(decision => decision.reason.startsWith("N3 seventh literal example cohort:"));
  });
  expect(cohort).toHaveLength(150);
  expect(cohort[0]?.id).toBe("ja-vocabulary:a812d7a958");
  expect(cohort.at(-1)?.id).toBe("ja-vocabulary:c3b1f16454");
  expect(cohort.reduce((n, row) => n + (row.meaningReview?.examples?.keep.length ?? 0), 0)).toBe(248);
  expect(cohort.reduce((n, row) => n + (row.meaningReview?.examples?.omit.length ?? 0), 0)).toBe(52);
  expect(n3.filter(row => row.meaningReview?.reason.startsWith("N3 seventh literal example cohort:"))).toHaveLength(88);
  expect(summary.counts).toMatchObject({ units: 10291, sourceRecords: 10307, meaningsToReview: 6, constructionMeanings: 0, phraseAttestedMeanings: 6 });
  expect(summary.publicationChanged).toBe(false);
}, 30_000);

test.runIf(cached)("the eighth N3 literal cohort excludes homophones, unselected senses and changed source propositions", async () => {
  const { source } = await loadJapaneseStudyArtifacts(process.cwd());
  for (const [id, sentenceIds] of new Map<string, number[]>([
    ["c461dcc42b", []], // Surprise interjections differ from flaw nouns.
    ["c4956951f6", []], // Figurative city differs from governmental capital.
    ["c4b2e7a3a3", [98043]], // The country's now claim lacks date and food-security scope.
    ["c53570cabd", [160417]], // University-festival sai does not establish primary matsuri.
    ["c62c71907b", [88740]], // The historical first claim needs solo/nonstop qualification.
    ["c7d468b06d", [212251]], // Becoming an adult uses a different numbered sense.
    ["c7e318382a", [159773]], // The companion changes present assertion to past.
    ["c8170be9cc", [137142]], // Big does not establish long.
    ["c9a230646c", [175634]], // A generic satellite does not establish natural rather than artificial.
    ["ca4cbf878d", []], // Occasion differs from place and physics field.
    ["cbe69abc51", [206782]], // Our adds branch ownership.
    ["cc69ac8fc3", [200374]], // Fare adds a transport context to the payment request.
    ["ccad2b9049", [126718]], // The merciless-person sense differs from demon and tagger.
    ["cd17a14f44", []], // Japanese school-subject examples differ from national-language sense.
    ["cde24ec2dd", []], // Nature and a material-kanji error differ from sex/gender.
    ["cf63ac57d2", []], // Caught specifies an unstated dismissal; line-out is another sense.
    ["d171dfcac5", [123985]], // The companion loses degree and changes weather to climate.
    ["d183c55e59", [207526]], // The worldwide growth claim needs a period and rate scope.
    ["d3adca2034", [178822]], // The companion adds plural workers and ability.
    ["d45a4669a3", [83033]], // Girl adds an unestablished age.
    ["d4d82c9ff4", [107599]], // Liking degree differs from quantity of music liked.
    ["d6b975f68f", [214686]], // Physical figure differs from style.
    ["d75a953f22", [78401]], // The always-war-profit generalization needs scope.
    ["d7dea8a506", [191079]], // We adds an unestablished plural group.
    ["d811ee3160", []], // Comparative more differs from continuing still/yet.
    ["d83bc64e48", [223480]], // The companion has an unresolved reading marker.
    ["d8fb966498", [144665]], // Work field replaces personal aptitude contrasts.
    ["d90edf318b", []], // The derogatory identity term needs register context beyond neutral gay.
    ["d9d15cf734", [121306]], // The light-bulb credit needs historical qualification.
    ["d9f933bfc3", [206184]], // Multiple roads expands the demonstrative road's scope.
    ["dad6329f85", []], // Periodic liner and commuter pass use other senses.
    ["db4d84d6b0", [144288]], // The companion adds female gender.
    ["db79e0b5b4", [230480]], // The departure drops finally.
    ["dce7ebe444", [187188]], // In some respect differs from spatial somewhere.
    ["dd3e8e77f0", [236069]], // Standalone lesson differs from the selected counter.
    ["ddedf2e7ba", [160285]], // The companion needs clarification of the impression recipient.
    ["de314c95de", [199225]], // The companion adds an invitation recipient.
    ["df6d75a59e", [180098]], // The blossom maximum needs species and weather scope.
    ["e008354e7b", []], // Grandson adds gender to both grandchild examples.
    ["e06471a78e", [106843]], // My mistake adds responsibility for the error.
    ["e0d0db3ebf", [228455]], // The cross-species universal ranking lacks a metric and scope.
    ["e0e16ed29e", [118772]], // The companion loses the economic-basis relation and needs grammar repair.
    ["e2a52daf95", [143078]], // Government people loses the high-ranking-official restriction.
  ])) {
    const card = expectReviewedExamples(source, id, sentenceIds);
    expect(card.originalContent?.examples).toHaveLength(id === "d90edf318b" ? 1 : 2);
    expect(card.content.reading).toBe(card.meaningReviewBefore?.reading);
    expect(card.content.level).toBe(card.meaningReviewBefore?.level);
  }
}, 30_000);

test.runIf(cached)("the eighth N3 literal cohort retains full senses, contextual citations, primary readings and natural paraphrases", async () => {
  const { records } = await loadJapaneseStudyContentReview(process.cwd());
  for (const [id, senses] of new Map<string, number[]>([
    ["c40902d092", [2, 1]], // Mask and face.
    ["c42fa0cf5f", [2, 2]], // Previously rather than a before suffix.
    ["c5b127def2", [2, 1]], // Language and word counter.
    ["ce509fd4c7", [2, 2]], // Organization rather than a merely assembled body.
    ["ceb20bf4f8", [2, 2]], // Regards formulas rather than well/properly.
    ["d09ecbe5b0", [2, 2]], // Creation/origin rather than human birth.
    ["d6448fea52", [2, 1]], // Knowledgeable and detailed.
    ["d6ee5e0b7d", [2, 1]], // Risk and adventure.
    ["d75a953f22", [2]], // Benefit rather than monetary profit.
    ["dd3e8e77f0", [3]], // Numbered lesson counter.
    ["df6d75a59e", [2]], // Utmost use rather than at-most quantity.
    ["e2dc364bee", [1, 1]], // Monarch rather than playing card.
  ])) {
    const row = records.filter(record => "written" in record).find(record => record.id === `ja-vocabulary:${id}`);
    expect(row?.meaningReview?.examples?.keep.map(example => example.sense)).toEqual(senses);
  }
  const { source } = await loadJapaneseStudyArtifacts(process.cwd());
  for (const [id, sentenceIds] of new Map<string, number[]>([
    ["c3d0c7fa43", [153352, 85852]], // Both secret examples preserve elicitation/disclosure.
    ["c479f65e9c", [179801, 179799]], // Broad modern-times contexts remain.
    ["c660f5b541", [164142]], // Library can mean the personal book collection.
    ["c6c155ada8", [80226, 144578]], // Nuisance and neutral they retain the disturbance context.
    ["c7f4f73ace", [220079, 103804]], // Physical and figurative absorption share the full selected sense.
    ["c8ca17553a", [103825, 183897]], // Personal adaptation and reported ecological change remain.
    ["c98a6b2988", [115760, 204557]], // The full simple sense explicitly includes naive.
    ["ca92616db2", [220458, 210852]], // Art retains the human-workmanship sense.
    ["cab1bc201f", [233505, 87366]], // Partner and companion contexts remain.
    ["cb48e3fc15", [223731, 208359]], // Unnamed operation statements remain illustrative.
    ["cb50e02845", [192965, 90300]], // Conventional eventual-success proverb and negative outcome remain.
    ["cc5a9c3372", [157765, 158727]], // Direct help and support-based independence remain.
    ["cd34099f98", [100052, 202643]], // Collective jewelry and obtaining the gem remain.
    ["cdbee06a30", [156518, 106469]], // Sensation and sense of humor fit the full selected meaning.
    ["ce2ba9fec2", [232117, 87076]], // The shared participation sentence agrees with competition.
    ["cf7176ee78", [141097, 85378]], // Physical ice and the conventional cold-expression metaphor remain.
    ["cfaaf0ad82", [190320, 190313]], // At-a-time scope retains one and two quantities.
    ["d15a9f3445", [204449, 159490]], // Bedtime and natural on-time dinner wording remain.
    ["d17214b7e4", [175954, 86948]], // Both fault-related emotional constructions remain.
    ["d271a61e9b", [144733, 184044]], // The eligible primary shintai reading and physical-system sense remain.
    ["d2a6a01df9", [140800, 209680]], // The prefix preserves all-newspaper and two-volume scope.
    ["d2dbd78eca", [236334, 112841]], // The performed quotation and suitable-job sense remain.
    ["d2f232cacf", [159712, 172975]], // The blackboard noun does not require literal black color.
    ["d312849382", [148686, 148687]], // The household-role utterances remain illustrative.
    ["d41f9ccc20", [110365, 123501]], // The shared Pacific sailboat crossing agrees with earlier selections.
    ["d630014a3f", [86649, 107783]], // Weekly and monthly occurrence counts remain exact.
    ["d684a35bd1", [85792, 85797]], // The shared payer proverb and five-thousand-yen total remain.
    ["d6f9223c83", [163801, 108324]], // Teacher and teaching-for-a-living remain.
    ["d7032c88c5", [87156, 138469]], // Sensitivity and a rhetorical criticism maxim remain.
    ["d74252cb1f", [220600, 173629]], // Unnamed weather contexts remain illustrative.
    ["d8f0837321", [221380, 216145]], // Natural gas and natural harbor retain the selected modifier.
    ["db7f32ec4c", [126968, 182377]], // Approximate sphere and ordinary ball use physical sense 1.
    ["dc65b93656", [184185, 146844]], // Established learning proverbs retain their rhetorical meaning.
    ["dcdfb791b5", [93933, 201977]], // Description difficulty and television's appeal fit the full charm sense.
    ["de0215662e", [230381, 126933]], // The conventional geographic continent model remains.
    ["de6ed799d8", [140398, 226242]], // Explicit hi and observed moth gathering remain.
    ["df15c38d0a", [235884, 93627]], // Early-decade historical framing and birth decade remain.
    ["df6f68109a", [106023, 106152]], // The full single-word sense includes brief comments.
    ["dfb2d21193", [220453, 200270]], // Amount and extent fit the selected degree sense.
    ["dff67195c3", [148283, 148278]], // The illustrative expenditure boundaries remain.
    ["e065923d1c", [103205, 201751]], // Figurative and geographic boundaries remain.
    ["e06f642257", [121890, 82121]], // Introductory heat-energy and personal energy contexts remain.
    ["e0b3c0db0c", [220900, 217838]], // Finished-work wording and polite same-quality description remain.
    ["e28c9da90d", [171576, 219308]], // Individual symptom and unnamed prospective relief utterances remain.
    ["e32ed7196b", [207488, 127289]], // One-mile offshore and broad warm-current contexts remain.
    ["e351a6f3de", [223235, 223234]], // The acceptable plan and implementation difficulty remain.
  ])) expectReviewedExamples(source, id, sentenceIds);
}, 30_000);

test.runIf(cached)("accounts for every original sentence in the eighth remaining N3 cohort", async () => {
  const { records, summary } = await loadJapaneseStudyContentReview(process.cwd());
  const n3 = records.filter(row => "written" in row).filter(row => row.introductionLevel === "N3");
  const cohort = n3.filter(row => {
    const selection = row.meaningReview?.examples;
    return selection && [...selection.keep, ...selection.omit].some(decision => decision.reason.startsWith("N3 eighth literal example cohort:"));
  });
  expect(cohort).toHaveLength(150);
  expect(cohort[0]?.id).toBe("ja-vocabulary:c3d0c7fa43");
  expect(cohort.at(-1)?.id).toBe("ja-vocabulary:e351a6f3de");
  expect(cohort.reduce((n, row) => n + (row.meaningReview?.examples?.keep.length ?? 0), 0)).toBe(246);
  expect(cohort.reduce((n, row) => n + (row.meaningReview?.examples?.omit.length ?? 0), 0)).toBe(52);
  expect(n3.filter(row => row.meaningReview?.reason.startsWith("N3 eighth literal example cohort:"))).toHaveLength(101);
  expect(summary.counts).toMatchObject({ units: 10291, sourceRecords: 10307, meaningsToReview: 6, constructionMeanings: 0, phraseAttestedMeanings: 6 });
  expect(summary.publicationChanged).toBe(false);
}, 30_000);

test.runIf(cached)("the final N3 literal cohort excludes other senses, reversals, unestablished details and source errors", async () => {
  const { source } = await loadJapaneseStudyArtifacts(process.cwd());
  for (const [id, sentenceIds] of new Map<string, number[]>([
    ["e3d5f33744", [102706]], // The companion adds a ceremony to an unspecified formality question.
    ["e4e0df7a25", []], // Hopeless and not-at-all differ from refreshed and tidy.
    ["e512ff0725", [168704]], // His adds male gender to an unspecified baby.
    ["e53de06680", [232458]], // Appreciation uses another numbered sense.
    ["e6e567643f", [93344]], // The companion is an inflected fatigue verb rather than the noun.
    ["e7344aa7e1", [82698]], // The companion has an unresolved reading marker.
    ["e79255ce69", [209436]], // The companion turns an impersonal judgment into an accusation of you.
    ["e7a5df28c0", []], // True nature differs from plant roots.
    ["ea7b6990d3", []], // Only differs from hardest; categorical fire use needs definition and scope.
    ["eac8dadcd3", [174733]], // Grammatical conjugation uses a separately numbered sense.
    ["eb85283cf4", [180087]], // The companion loses the pounding intensity.
    ["ebafd320d0", [90104]], // Boys adds age and gender to three people.
    ["ec257ddb78", [101824]], // Single ordered direction differs from side-to-side motion.
    ["ec2ddaa910", [110005]], // The companion's proverb translation loses temporary cost and lifelong contrast.
    ["ec83c27906", []], // One comparison reverses; the companion loses former-to-latter order.
    ["ec9831dc0c", []], // Utter is another sense and the companion loses tomorrow.
    ["ed560b721e", [159523]], // Breakfast adds a meal to a morning-time statement.
    ["ed6d068863", [216741]], // Thoughts loses the restriction to ideals.
    ["edba4848b0", [219027]], // The companion's plural agreement needs source repair.
    ["ee972bb89d", [212656]], // The companion's lower-page compound has an incorrect reading.
    ["ef97fe9600", []], // Plot and information source differ from muscle/string/line.
    ["f002b6a695", [141837]], // We adds an arriving group.
    ["f06c0b68a6", [84228]], // The companion changes present absence to past.
    ["f1250de70c", [205344]], // The companion's manner particle is malformed.
    ["f1ff353185", []], // Concession and example marker differ from metaphor.
    ["f2c4210f2b", [157690]], // Out of town adds a geographic boundary.
    ["f33e48aa94", [198328]], // A tobacco pipe uses a separately numbered sense.
    ["f427f2ab2d", [154790]], // Urban aggregation differs from focusing attention.
    ["f4b9298167", [169301]], // Anaerobes contradict the companion's all-living-things claim.
    ["f4fd9f8f66", [147634]], // Occupational field differs from agricultural land.
    ["f554d2951b", [90827]], // Teenage narrows young admirers to adolescents.
    ["f568334fa2", [113666]], // The companion's English adverb needs word-boundary repair.
    ["f675c4ff49", [102750]], // Announcing guests needs toritsuida, and loudness is lost.
    ["f687c4a424", [113566]], // The companion's causal generalization needs population and crime-type scope.
    ["f6da4441b7", [211693]], // The companion's citywide width claim needs street scope.
    ["f72e4ff411", [228832]], // We adds unestablished plural arrivals.
    ["f755485505", [231115]], // The companion uses an adjective as a bare noun.
    ["f805c3046f", []], // Odd man needs leftover-player context; his adds referee gender.
    ["f8acb92221", [221665]], // The companion has unresolved wife-reading annotation.
    ["f91ef8a089", []], // Downclimb uses a different sense from down-train.
    ["f9c7285539", [107541]], // Knack differs from respiration.
    ["fb2679c1c0", [146149]], // Aside needs a side to convey the intended seating count.
    ["fbaf566aaa", [102474]], // Man adds gender to a neutral person.
    ["fbf3bca708", [102156]], // Considering circumstances differs from utilizing them.
    ["fc1d99931b", [205149]], // Just like that drops the explicit ending.
    ["fc43373a26", [197360]], // The guilt expression and disappearing-versus-diminishing relation need repair.
    ["fcdc62db50", [90819]], // Still loses the indefinite duration.
    ["fdef6c9ac9", [218977]], // The demand-price rule needs model conditions.
    ["fe228bbe40", []], // Certainty adverbs differ from adjective or abstract noun.
    ["fe42a234e2", [107244]], // The companion's regular bird diet needs species and seasonal scope.
    ["fee426e7d0", [184324]], // Center fielder uses a separately numbered sense.
    ["ff42db8965", [177901]], // The companion's national travel preference needs population/time scope.
    ["ff86f2105c", [161410]], // The identical name-card companion omits indefinite duration too.
  ])) {
    const card = expectReviewedExamples(source, id, sentenceIds);
    expect(card.originalContent?.examples).toHaveLength(id === "f91ef8a089" ? 1 : 2);
    expect(card.content.reading).toBe(card.meaningReviewBefore?.reading);
    expect(card.content.level).toBe(card.meaningReviewBefore?.level);
  }
}, 30_000);

test.runIf(cached)("the final N3 literal cohort selects ordinary conclusion and preserves eligible contextual senses", async () => {
  const { records } = await loadJapaneseStudyContentReview(process.cwd());
  const conclusion = records.find(row => row.id === "ja-vocabulary:f5923ebe0d");
  if (!conclusion || !("written" in conclusion)) throw new Error("Missing conclusion vocabulary");
  expect(conclusion.meanings).toEqual([{ text: "conclusion", status: "reviewed-equivalent", evidence: [{ entryId: "1255020", sense: 1, gloss: "conclusion (of an argument, discussion, study, etc.)" }] }]);
  expect(conclusion.meaningReview?.action).toBe("retain");
  expect(conclusion.meaningReviewBefore?.meanings).toEqual(["conclusion"]);
  for (const [id, senses] of new Map<string, number[]>([
    ["e6a8e069db", [2, 2]], // Institution and government organ.
    ["e96372be15", [1, 2]], // Cheerful and weather.
    ["e9d213fb20", [1, 2]], // Pity noun and pitiable adjective.
    ["e9efbc296d", [2, 2]], // Inheritance rather than general succession.
    ["e9efe8313d", [2, 2]], // Traffic signals rather than generic signaling.
    ["eb2bf568d9", [1, 3]], // Before long and eventually.
    ["f57860a6ca", [2, 2]], // Forte rather than pride.
    ["f5923ebe0d", [1, 1]], // Both ordinary conclusions use the authored contextual equivalent.
    ["f5cb9d932e", [2, 2]], // Representative person rather than abstract representation.
    ["f671b4241c", [1, 2]], // Yen and circle.
    ["f898b4b8d2", [4]], // Notable aspect within fushi-ga-aru.
    ["fbaf566aaa", [3]], // Able or talented person.
    ["fcdc62db50", [3]], // Reputation rather than given name.
    ["fe278816d4", [1, 2]], // Minimum and worst.
    ["fe4cf66fc4", [2, 1]], // Circumference and surroundings.
  ])) {
    const row = records.filter(record => "written" in record).find(record => record.id === `ja-vocabulary:${id}`);
    expect(row?.meaningReview?.examples?.keep.map(example => example.sense)).toEqual(senses);
  }
  const { source } = await loadJapaneseStudyArtifacts(process.cwd());
  for (const [id, sentenceIds] of new Map<string, number[]>([
    ["e391d26404", [137416, 175860]], // Both result constructions remain.
    ["e394e09d00", [163203, 120891]], // Plan and designing retain the full sense.
    ["e4e5715dc0", [142694, 123689]], // The shared observed phenomenon agrees with the earlier selection.
    ["e5ea476418", [159917, 206516]], // Summoning memories and blank recollection remain.
    ["e67cf76c90", [169667, 85913]], // The shared sleeping-boy example agrees with the earlier selection.
    ["e7e0343eb0", [186878, 109747]], // Broad progress and the individual's little progress remain.
    ["e7eeb8eff1", [206007, 92490]], // Topic and becoming news retain public attention.
    ["e8e0e10e57", [231285, 92768]], // Becomes her is valid suits-her wording.
    ["e904c4fcb0", [211917, 103942]], // The shared eternal-boy artist metaphor remains.
    ["ea28b7880a", [207612, 78025]], // Opposite and household-relative position remain.
    ["ebe5867327", [207845, 199120]], // The real-dog idiom and dismissive interjection remain.
    ["ec9c550d48", [188770, 223303]], // Contextual performance and band ellipsis remain.
    ["ed0978af53", [227476, 161266]], // Approximate worth and three-week duration remain.
    ["ed26fceabd", [144266, 96778]], // The theological comparison and figurative divine control remain.
    ["edba3a49e1", [109516, 84032]], // Roof clearing and household wind damage remain.
    ["eef783663f", [201744, 174733]], // The shared language-change sentence agrees with the change card.
    ["ef1a073c8c", [139949, 110569]], // Equal and almost-equal heights remain distinct.
    ["ef5af5c903", [223510, 138450]], // Design influence and qualified evaluative many-program wording remain.
    ["f0031b987d", [205489, 125065]], // Weather dependency and inability to arrive remain.
    ["f0070e59ed", [213715, 213552]], // Consequential and narrative connectives remain.
    ["f01cb21b79", [88156, 154898]], // Din supplies the loud-noise context.
    ["f034b79d36", [190014, 77666]], // Nonexclusive rice habitat and reported growth delay remain.
    ["f0b3458a80", [183085, 218472]], // Both kind/category constructions remain.
    ["f15c9822d2", [161653, 183928]], // First patient and reported individual recovery remain.
    ["f1869f9942", [225679, 144039]], // Shared wave foam and human-life bubble metaphor remain.
    ["f1f3f6775d", [228962, 166227]], // Together licenses the picnic invitation's participants.
    ["f3143300d0", [223794, 159523]], // The shared small milk-and-cheese purchase remains consistent.
    ["f523e4118d", [106093, 161232]], // Commands and colloquial fictional dialogue remain.
    ["f55f2622af", [222583, 101391]], // Both negative endurance constructions remain.
    ["f59cd43bb0", [91768, 198358]], // Violin skill and sweet tone remain.
    ["f6255aa5c5", [106820, 156830]], // Both explicit saku prefix readings remain.
    ["f77ef3c0e5", [217908, 173513]], // Full pinned abi meaning supports red-throated loon without inventing a coin issuer.
    ["f7a2ae495f", [154810, 214090]], // The scene and neutral showing agent remain.
    ["f7eb9ecbff", [179680, 144443]], // Not-always scope and generic human reference remain.
    ["f898b4b8d2", [118907]], // The sole notable-point example remains.
    ["f91414aac2", [100071, 168118]], // Reported death and ongoing population decline remain.
    ["fb8c3bd96c", [179253, 197249]], // Shoe soles and bottle bottom remain.
    ["fc2460d6aa", [184718, 157230]], // Digital storage and careful preservation remain.
    ["fcbac4861d", [203042, 102130]], // Spatial and figurative direction retain sense 1.
    ["feff56f582", [145930, 227081]], // Time effort and polite acknowledgment remain.
    ["ff30b33097", [235958, 79711]], // Age-specific and qualified nighttime time constructions remain.
    ["ffb1d0e3d2", [233766, 178681]], // The denied-right and no-business idioms remain.
    ["fff0dc0674", [78161, 176405]], // Cost calculation and counting accuracy remain.
    ["fffb310ed7", [149465, 149433]], // Both corrective actual-fact disclosures remain.
  ])) expectReviewedExamples(source, id, sentenceIds);
}, 30_000);

test.runIf(cached)("finishes the N3 example queue while accounting for all seventy pre-existing empty members", async () => {
  const { records, summary } = await loadJapaneseStudyContentReview(process.cwd());
  const n3 = records.filter(row => "written" in row).filter(row => row.introductionLevel === "N3");
  expect(n3).toHaveLength(1680);
  expect(n3.filter(row => row.examples.length && !row.meaningReview?.examples)).toHaveLength(0);
  expect(n3.filter(row => row.meaningReview?.examples)).toHaveLength(1610);
  const empty = n3.filter(row => !row.meaningReview?.examples);
  expect(empty).toHaveLength(70);
  const { source } = await loadJapaneseStudyArtifacts(process.cwd());
  for (const row of empty) {
    expect(row.examples).toEqual([]);
    const card = expectReviewedExamples(source, row.id.replace("ja-vocabulary:", ""), []);
    expect((card.originalContent ?? card.content).examples).toEqual([]);
    expect((card.meaningReviewBefore ?? card.content).examples).toEqual([]);
  }
  const cohort = n3.filter(row => {
    const selection = row.meaningReview?.examples;
    return selection && [...selection.keep, ...selection.omit].some(decision => decision.reason.startsWith("N3 final literal example cohort:"));
  });
  expect(cohort).toHaveLength(143);
  expect(cohort[0]?.id).toBe("ja-vocabulary:e391d26404");
  expect(cohort.at(-1)?.id).toBe("ja-vocabulary:fffb310ed7");
  expect(cohort.reduce((n, row) => n + (row.meaningReview?.examples?.keep.length ?? 0), 0)).toBe(222);
  expect(cohort.reduce((n, row) => n + (row.meaningReview?.examples?.omit.length ?? 0), 0)).toBe(62);
  expect(n3.filter(row => row.meaningReview?.reason.startsWith("N3 final literal example cohort:"))).toHaveLength(92);
  expect(n3.reduce((n, row) => n + row.examples.length, 0)).toBe(2500);
  expect(n3.flatMap(row => row.examples).filter(example => !example.literalTarget)).toHaveLength(271);
  expect(summary.counts).toMatchObject({ units: 10291, sourceRecords: 10307, meaningsToReview: 6, constructionMeanings: 0, phraseAttestedMeanings: 6 });
  expect(summary.publicationChanged).toBe(false);
}, 30_000);
