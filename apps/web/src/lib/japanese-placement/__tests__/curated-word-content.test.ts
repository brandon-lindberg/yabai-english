import { describe, expect, it } from "vitest";
import { loadContentCatalog, loadContentPack } from "../content-files";
import { buildContentItems, inspectContentCoverage } from "../content-pack";
import { isCorrectJapaneseResponse } from "../adaptive";

describe("curated kana and word-level pool", () => {
  it("adds 170 choices through the shared loader and covers the declared six-domain authoring target", async () => {
    const { pack, snapshots } = await loadContentPack("data/japanese-placement/word-level");
    expect(pack.wordItems).toHaveLength(170);
    expect(snapshots.records).toHaveLength(150);
    expect(snapshots.records.filter((r) => r.wordEvidence)).toHaveLength(100);
    const catalog = await loadContentCatalog("data/japanese-placement");
    expect(catalog.packs).toHaveLength(3);
    const coverage = inspectContentCoverage(catalog.pack);
    expect(coverage.complete).toBe(true);
    for (const row of coverage.bands) expect(row).toMatchObject({ kana: row.band === "N5" ? 20 : 0, kanjiReading: 10, vocabulary: 10, grammar: 10 });
    for (const item of buildContentItems(pack)) {
      if (item.responseType !== "choice") throw new Error("Unexpected assembly");
      for (const choice of item.choices) expect(isCorrectJapaneseResponse(item, { kind: "answer", itemId: item.id, choiceId: choice.id, submittedAt: "2026-10-23T00:00:00Z" })).toBe(choice.id === item.correctChoiceId);
    }
  });

  it("preserves selected source keys/sentences and balances positions within each band and domain", async () => {
    const { pack, snapshots } = await loadContentPack("data/japanese-placement/word-level");
    for (const band of ["N5", "N4", "N3", "N2", "N1"]) for (const domain of ["kana", "kanji_reading", "vocabulary", "grammar"]) {
      const selected = pack.wordItems.filter((entry) => entry.band === band && entry.domain === domain);
      if (!selected.length) continue;
      const positions = [0, 0, 0, 0];
      for (const entry of selected) {
        positions[entry.choices.findIndex((c) => c.id === entry.correctChoiceId)]++;
        const record = snapshots.records.find((r) => r.sourceId === entry.sourceId && r.id === entry.sourceRecord);
        if (entry.sourceId === "nihongo-mono") expect(entry.completion).toBe(record!.text);
        if (entry.sourceId === "jlptsuccess") {
          const [q] = record!.questions as { correctAnswer: string }[];
          expect(entry.choices.find((c) => c.id === entry.correctChoiceId)!.text).toBe(q.correctAnswer);
        }
      }
      expect(Math.max(...positions) - Math.min(...positions)).toBeLessThanOrEqual(1);
    }
    expect(snapshots.selectionLedger?.filter((r) => r.status === "selected")).toHaveLength(150);
  });
});
