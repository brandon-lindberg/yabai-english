import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { loadContentPack } from "../content-files";
import { buildContentItems, inspectContentCoverage, verifyContentProvenance } from "../content-pack";
import { isCorrectJapaneseResponse } from "../adaptive";

describe("checked-in N2/N3 content", () => {
  it("imports forty passages and forty distinct constructions with traceable sources", async () => {
    const { pack, snapshots } = await loadContentPack("data/japanese-placement");
    expect(inspectContentCoverage(pack, ["N3", "N2"])).toMatchObject({ complete: false, bands: [
      { band: "N3", passages: 20, readingItems: 40, assemblies: 20 },
      { band: "N2", passages: 20, readingItems: 40, assemblies: 20 },
    ] });
    expect(buildContentItems(pack)).toHaveLength(120);
    expect(pack.passages.filter((p) => p.sourceId === "original-n2")).toHaveLength(17);
    expect(pack.passages.filter((p) => p.sourceId === "kotonoha")).toHaveLength(3);
    expect(pack.passages.filter((p) => p.band === "N2" && p.questions.some((q) => q.skill === "inference")).length).toBeGreaterThanOrEqual(8);
    expect(() => verifyContentProvenance(pack, snapshots)).not.toThrow();
    for (const entry of pack.assemblies) {
      expect(entry.tiles.length).toBeGreaterThanOrEqual(2);
      expect(entry.acceptedOrders).not.toContainEqual(entry.tiles.map((tile) => tile.id));
    }
  });

  it("rejects a changed source level, record, or attributed sentence", async () => {
    const { pack, snapshots } = await loadContentPack("data/japanese-placement");
    for (const mutate of [
      (p: typeof pack) => { p.assemblies[0].original += "別の文。"; },
      (p: typeof pack) => { p.passages[0].sourceRecord = "unknown-record"; },
      (p: typeof pack) => { p.passages[0].band = "N2"; },
    ]) {
      const changed = structuredClone(pack); mutate(changed);
      expect(() => verifyContentProvenance(changed, snapshots)).toThrow();
    }
  });

  it("reconciles a source-selection ledger against every retained excerpt", async () => {
    const { pack, snapshots } = await loadContentPack("data/japanese-placement");
    const evidence = { ...snapshots, selectionLedger: snapshots.records.map((r) => ({ sourceId: r.sourceId, recordId: r.id, status: "selected", reason: "Selected source excerpt" })) };
    expect(() => verifyContentProvenance(pack, evidence)).not.toThrow();
    evidence.selectionLedger[0].status = "deferred";
    expect(() => verifyContentProvenance(pack, evidence)).toThrow(/ledger/i);
  });

  it("detects snapshot or curation changes before compiling items", async () => {
    const dir = await mkdtemp(join(tmpdir(), "japanese-pack-"));
    try {
      for (const name of ["content-lock.json", "n2-n3-content.json", "source-excerpts.json"]) {
        await writeFile(join(dir, name), await readFile(join("data/japanese-placement", name)));
      }
      await writeFile(join(dir, "n2-n3-content.json"), "{}");
      await expect(loadContentPack(dir)).rejects.toThrow(/integrity/i);
    } finally { await rm(dir, { recursive: true, force: true }); }
  });

  it("accepts explicitly valid alternative word orders and rejects the presented tile order", async () => {
    const { pack } = await loadContentPack("data/japanese-placement");
    const constructions = buildContentItems(pack).filter((item) => item.responseType === "sentence_assembly");
    expect(constructions.filter((item) => item.acceptedOrders.length > 1).length).toBeGreaterThanOrEqual(2);
    for (const item of constructions) {
      for (const tileIds of item.acceptedOrders) expect(isCorrectJapaneseResponse(item, { kind: "sentence_assembly", itemId: item.id, tileIds, submittedAt: "2026-10-22T00:00:00Z" })).toBe(true);
      expect(isCorrectJapaneseResponse(item, { kind: "sentence_assembly", itemId: item.id, tileIds: item.tiles.map((t) => t.id), submittedAt: "2026-10-22T00:00:00Z" })).toBe(false);
    }
  });

  it("balances correct choice positions without changing the imported answer text", async () => {
    const { pack, snapshots } = await loadContentPack("data/japanese-placement");
    for (const band of ["N3", "N2"] as const) {
      const counts = Array(band === "N3" ? 3 : 4).fill(0);
      for (const passage of pack.passages.filter((p) => p.band === band)) {
        for (const q of passage.questions) counts[q.choices.findIndex((c) => c.id === q.correctChoiceId)]++;
      }
      expect(Math.max(...counts) - Math.min(...counts)).toBeLessThanOrEqual(2);
    }
    for (const passage of pack.passages.filter((p) => p.sourceId !== "original-n2")) {
      const original = snapshots.records.find((r) => r.sourceId === passage.sourceId && r.id === passage.sourceRecord)!;
      const questions = original.questions as { options: string[]; answer: number }[];
      const retained = passage.sourceId === "japaneseness" ? passage.questions.slice(0, 1) : passage.questions;
      retained.forEach((q, index) => {
        const key = q.choices.find((c) => c.id === q.correctChoiceId)!;
        expect(key.text.replace(/\s/g, "")).toBe(questions[index].options[questions[index].answer].replace(/\s/g, ""));
      });
    }
  });
});
