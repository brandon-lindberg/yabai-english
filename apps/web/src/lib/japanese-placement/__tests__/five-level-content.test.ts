import { describe, expect, it } from "vitest";
import { loadContentCatalog, loadContentPack } from "../content-files";
import { buildContentItems, inspectContentCoverage } from "../content-pack";
import { isCorrectJapaneseResponse } from "../adaptive";

describe("five-level reading and sentence-building content", () => {
  it("accounts for twenty passages, forty reading keys and twenty constructions at every level", async () => {
    const { pack, sourceExcerpts } = await loadContentCatalog("data/japanese-placement");
    const coverage = inspectContentCoverage(pack);
    expect(coverage.complete).toBe(true);
    expect(coverage.bands).toHaveLength(5);
    for (const row of coverage.bands) expect(row).toMatchObject({ passages: 20, readingItems: 40, assemblies: 20 });
    expect(sourceExcerpts).toBe(333);
    const items = buildContentItems(pack);
    expect(items).toHaveLength(470);
    expect(items.every((item) => item.calibration === null)).toBe(true);
    expect(new Set(items.map((item) => item.domain))).toEqual(new Set(["reading", "writing", "kana", "kanji_reading", "vocabulary", "grammar"]));
    for (const item of items) if (item.responseType === "sentence_assembly") {
      const answer = (tileIds: string[]) => ({ kind: "sentence_assembly" as const, itemId: item.id, tileIds, submittedAt: "2026-10-22T00:00:00Z" });
      for (const order of item.acceptedOrders) expect(isCorrectJapaneseResponse(item, answer(order))).toBe(true);
      expect(isCorrectJapaneseResponse(item, answer(item.tiles.map((tile) => tile.id)))).toBe(false);
    }
  });

  it("preserves retained source answer text while balancing the newly imported choice positions", async () => {
    const { pack, snapshots } = await loadContentPack("data/japanese-placement/remaining-levels");
    expect(snapshots.selectionLedger?.filter((row) => row.status === "selected")).toHaveLength(120);
    expect(snapshots.selectionLedger?.filter((row) => row.status === "excluded")).toHaveLength(14);
    for (const band of ["N5", "N4", "N1"] as const) {
      const positions = Array(band === "N4" ? 3 : 4).fill(0);
      for (const passage of pack.passages.filter((p) => p.band === band)) {
        const original = snapshots.records.find((r) => r.sourceId === passage.sourceId && r.id === passage.sourceRecord)!;
        const sourceQuestions = original.questions as { options: string[]; answer: number }[];
        for (const [index, q] of passage.questions.entries()) {
          positions[q.choices.findIndex((c) => c.id === q.correctChoiceId)]++;
          // These three replacements deliberately ask a different question; their adaptations are recorded.
          if (index === 1 && ["sim-togo1", "sim-togo2", "sim-togo3"].includes(passage.sourceRecord)) continue;
          const sourceIndex = band === "N4" ? (passage.sourceRecord === "pets" ? [1, 2] : [0, 2])[index] : index;
          expect(q.choices.find((c) => c.id === q.correctChoiceId)!.text).toBe(sourceQuestions[sourceIndex].options[sourceQuestions[sourceIndex].answer]);
        }
      }
      expect(Math.max(...positions) - Math.min(...positions)).toBeLessThanOrEqual(1);
    }
  });
});
