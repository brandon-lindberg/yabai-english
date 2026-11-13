import { access } from "node:fs/promises";
import { expect, test } from "vitest";
import { loadJapaneseStudyArtifacts } from "../study-artifacts";
import { loadJapaneseStudyContentReview } from "../study-content-review";

const cached = await access(".cache/japanese-content/study-v1.json").then(() => true, () => false);

test.runIf(cached)("N4 meanings preserve verb direction, negation, suffix context and the declared appearance auxiliary", async () => {
  const { source } = await loadJapaneseStudyArtifacts(process.cwd());
  const expected: Record<string, string[]> = {
    "bc1e0c2895": ["to deliver", "to report"],
    "ba20bc66d0": ["(not) at all", "completely"],
    "c9366999ee": ["quarrel", "brawl"],
    "89927b8fa1": ["(my) wife"],
    "a2962b07bc": ["woods"],
    "ed36e1d3a7": ["you"],
    "554ab81272": ["appearing that", "seeming that", "looking like"],
    "13ab63d79a": ["... or more", "more than", "that's all"],
  };
  for (const [id, meanings] of Object.entries(expected)) {
    const card = source.cards.find(card => card.id === `ja-vocabulary:${id}`);
    if (card?.kind !== "vocabulary") throw new Error(`Missing vocabulary ${id}`);
    expect(card.content.meanings).toEqual(meanings);
    expect(card.originalContent).toBeDefined();
    expect(card.meaningReviewBefore).toBeDefined();
    expect(card.content.word).toBe(card.meaningReviewBefore?.word);
    expect(card.content.reading).toBe(card.meaningReviewBefore?.reading);
    expect(card.content.level).toBe(card.meaningReviewBefore?.level);
  }
}, 30_000);

test.runIf(cached)("reviews the N4 wording cohort and both N5 constructions without turning them into direct dictionary headwords", async () => {
  const { records, summary } = await loadJapaneseStudyContentReview(process.cwd());
  expect(records.filter(row => row.kind === "vocabulary" && row.introductionLevel === "N4" && row.meanings.some(meaning => meaning.status === "needs-review")).map(row => row.id)).toEqual([]);
  for (const id of ["d980cb1531", "f586d7d023"]) {
    const row = records.find(row => row.id === `ja-vocabulary:${id}`)!;
    expect(row.meanings.map(meaning => meaning.status)).toEqual(["reviewed-equivalent"]);
    expect(row.dictionarySenses.every(sense => !sense.pairAllowed)).toBe(true);
  }
  expect(summary.counts).toMatchObject({ units: 10291, sourceRecords: 10307 });
  expect(summary.publicationChanged).toBe(false);
}, 30_000);
