import { expect, test, vi } from "vitest";
import type { Prisma } from "@/generated/prisma/client";
import { japanesePracticeFixture } from "../../test/japanese-prompt-fixture";
import { readJapanesePromptCards, readJapanesePromptReferences } from "@/lib/study/japanese-runtime-source";

test("prompt content reads are bounded and contain only the requested cards and introduced distractors", async () => {
  const findMany = vi.fn().mockResolvedValueOnce([{ id: "chosen", kind: "JAPANESE_KANJI" }]).mockResolvedValueOnce([{ id: "distractor" }]);
  const tx = { studyCard: { findMany } } as unknown as Prisma.TransactionClient;
  expect(await readJapanesePromptCards(tx, "track", ["chosen"], ["N5"])).toEqual([{ id: "chosen", kind: "JAPANESE_KANJI" }, { id: "distractor" }]);
  expect(findMany).toHaveBeenCalledTimes(2);
  const [selected, distractors] = findMany.mock.calls.map(([query]) => query);
  expect(selected.where).toMatchObject({ id: { in: ["chosen"] }, deck: { level: { trackId: "track" }, levelId: { in: ["N5"] } } });
  expect(distractors.where).toMatchObject({ kind: "JAPANESE_KANJI", id: { notIn: ["chosen"] }, deck: { level: { trackId: "track" }, levelId: { in: ["N5"] } } });
  expect(distractors.take).toBeGreaterThan(3);
  expect(distractors.take).toBeLessThanOrEqual(128);
  expect(selected.select.contentJson).toBe(true);
  expect(selected.select.frontJa).toBeUndefined();
});

test("an empty queue never loads catalog content", async () => {
  const findMany = vi.fn();
  expect(await readJapanesePromptCards({ studyCard: { findMany } } as unknown as Prisma.TransactionClient, "track", [], ["N5"])).toEqual([]);
  expect(findMany).not.toHaveBeenCalled();
});

function referenceFixture() {
  const { all } = japanesePracticeFixture();
  all[0].unit.level.evidence.push({ source: "reference", recordId: all[0].unit.id, sourceFileId: "reference", sourceRow: "row", code: "N3", used: true, scope: "declared-pair" });
  const row = { sourceRow: "row", status: "matched", sourceFileId: "reference", level: "N3", kana: "ことば", kanji: "言葉", candidateCardIds: [all[0].unit.id] };
  const findMany = vi.fn().mockResolvedValue([{ sourceRow: row.sourceRow, referenceJson: row }]);
  const findUniqueOrThrow = vi.fn(() => { throw new Error("Full publication provenance must not be loaded"); });
  return { all, row, findMany, findUniqueOrThrow, tx: { studyCatalogReference: { findMany }, studyCatalogSnapshot: { findUniqueOrThrow } } as unknown as Prisma.TransactionClient };
}

test("overlapping requests share one immutable snapshot read and return only required reference evidence", async () => {
  const { tx, all, row, findMany, findUniqueOrThrow } = referenceFixture();
  const owner = {};
  const [a, b] = await Promise.all([readJapanesePromptReferences(owner, tx, "snapshot", all), readJapanesePromptReferences(owner, tx, "snapshot", all)]);
  expect(a).toEqual([row]); expect(b).toEqual(a);
  expect(findMany).toHaveBeenCalledTimes(1);
  expect(findMany).toHaveBeenLastCalledWith({ where: { snapshotId: "snapshot", sourceRow: { in: ["row"] } }, select: { sourceRow: true, referenceJson: true } });
  expect(findUniqueOrThrow).not.toHaveBeenCalled();
  await readJapanesePromptReferences(owner, tx, "new-snapshot", all);
  expect(findMany).toHaveBeenCalledTimes(2);
  await readJapanesePromptReferences({}, tx, "new-snapshot", all);
  expect(findMany).toHaveBeenCalledTimes(3);
});

test("a failed snapshot read is retried, while cards without reference evidence need no provenance download", async () => {
  const { tx, all, row, findMany } = referenceFixture();
  const owner = {};
  findMany.mockRejectedValueOnce(new Error("connection interrupted"));
  await expect(readJapanesePromptReferences(owner, tx, "snapshot", all)).rejects.toThrow("connection interrupted");
  expect(await readJapanesePromptReferences(owner, tx, "snapshot", all)).toEqual([row]);
  expect(findMany).toHaveBeenCalledTimes(2);
  expect(await readJapanesePromptReferences(owner, tx, "other", all.slice(1))).toEqual([]);
  expect(findMany).toHaveBeenCalledTimes(2);
});

test("cached reference indexing preserves duplicate-evidence rejection", async () => {
  const { tx, all, row, findMany } = referenceFixture();
  findMany.mockResolvedValue([{ sourceRow: "row", referenceJson: row }, { sourceRow: "row", referenceJson: row }]);
  await expect(readJapanesePromptReferences({}, tx, "snapshot", all)).rejects.toThrow(/duplicate/i);
});

test("the cache cannot substitute a previous selection's evidence or retain missing/malformed references", async () => {
  const { tx, all, row, findMany } = referenceFixture();
  const owner = {};
  expect(await readJapanesePromptReferences(owner, tx, "snapshot", all)).toEqual([row]);
  const other = structuredClone(all);
  other[0].unit.level.evidence.at(-1)!.sourceRow = "another-row";
  findMany.mockResolvedValueOnce([]);
  await expect(readJapanesePromptReferences(owner, tx, "snapshot", other)).rejects.toThrow(/missing/i);
  findMany.mockResolvedValueOnce([{ sourceRow: "another-row", referenceJson: row }]);
  await expect(readJapanesePromptReferences(owner, tx, "snapshot", other)).rejects.toThrow(/reference/i);
  findMany.mockResolvedValueOnce([{ sourceRow: "another-row", referenceJson: { ...row, sourceRow: "another-row" } }]);
  expect(await readJapanesePromptReferences(owner, tx, "snapshot", other)).toEqual([{ ...row, sourceRow: "another-row" }]);
});
