import { access } from "node:fs/promises";
import { expect, test } from "vitest";
import { loadJapaneseStudyArtifacts } from "../study-artifacts";
import { loadJapaneseStudyContentReview } from "../study-content-review";

const cached = await access(".cache/japanese-content/study-v1.json").then(() => true, () => false);

test.runIf(cached)("beginner cards distinguish liking, quantity, age, duration and greetings from the erroneous source glosses", async () => {
  const { source } = await loadJapaneseStudyArtifacts(process.cwd());
  const word = (id: string) => {
    const card = source.cards.find(card => card.id === `ja-vocabulary:${id}`);
    if (card?.kind !== "vocabulary") throw new Error(`Missing vocabulary ${id}`);
    return card;
  };
  expect(word("20cbecd474").content.meanings).toEqual(["liking", "being fond of"]);
  expect(word("9ee7cd3382").content.meanings).toEqual(["liking very much", "being very fond of"]);
  expect(word("a1cda8cb11").content.meanings).toEqual(["half"]);
  expect(word("a9191729e3").content.meanings).toEqual(["thank you (for the meal)"]);
  expect(word("cd1bcc2b1b").content.meanings).toEqual(["busy"]);
  expect(word("1cfccd0cdd").content.meanings).toEqual(["one day"]);
  expect(word("c65a346458").content.meanings).toEqual(["20 years old"]);
  expect(word("23911a0718").content.meanings).toEqual(["to play (a stringed or keyboard instrument)"]);
  expect(word("18035049f8").content.meanings).toEqual(["suffix for familiar person"]);
  expect(word("1fb9d39cd6").content.meanings).toEqual(["multi-floor building"]);
  for (const id of ["20cbecd474", "a1cda8cb11", "cd1bcc2b1b"]) {
    expect(word(id)).toHaveProperty("originalContent");
    expect(word(id)).toHaveProperty("meaningReviewBefore");
  }
}, 30_000);

test.runIf(cached)("resolves the N5 meaning signals while preserving both independently evidenced coat/court meanings", async () => {
  const { records, summary } = await loadJapaneseStudyContentReview(process.cwd());
  const pending = records.filter(row => row.kind === "vocabulary" && row.introductionLevel === "N5" && row.meanings.some(meaning => meaning.status === "needs-review"));
  expect(pending.map(row => row.id)).toEqual([]);
  expect(summary.counts.units).toBe(10291);
  expect(summary.counts.sourceRecords).toBe(10307);
  expect(summary.publicationChanged).toBe(false);
  const coat = records.find(row => row.id === "ja-vocabulary:c552e79d34")!;
  expect(coat.meanings.map(meaning => meaning.text)).toEqual(["coat", "tennis court"]);
  expect(coat.meanings.flatMap(meaning => meaning.evidence.map(item => item.entryId)).sort()).toEqual(["1049000", "2842174"]);
}, 30_000);
