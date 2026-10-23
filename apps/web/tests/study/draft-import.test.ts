import { expect, it } from "vitest";
import { japaneseStudyFixture } from "../../test/japanese-study-fixture";
import { prepareJapaneseStudyImport } from "@/lib/study/japanese-import";

it("imports stable canonical identities with member-specific source content and draft provenance", () => {
  const { source, build } = japaneseStudyFixture();
  const catalog = build();
  const before = structuredClone(source);
  const result = prepareJapaneseStudyImport(source, catalog);
  expect(result.track).toMatchObject({ slug: "japanese-flashcards", learningLanguage: "JAPANESE", publicationStatus: "DRAFT" });
  expect(result.cards).toHaveLength(2);
  const word = result.cards.find(card => card.id === "word-0")!;
  expect(word).toMatchObject({ kind: "JAPANESE_VOCABULARY", frontJa: "", backEn: "", contentJson: { unit: { answerPolicy: "member-specific", recordIds: ["word-0", "word-1"] }, records: source.cards.slice(0, 2) } });
  expect(result.cards.find(card => card.id === "kanji")).toMatchObject({ kind: "JAPANESE_KANJI", contentJson: { records: [source.cards[2]] } });
  expect(result.levels.map(level => level.levelCode)).toEqual(["N5", "N4", "N3", "N2", "N1"]);
  expect(result.snapshot).toMatchObject({ sourceCatalogSha256: catalog.sourceCatalogSha256, sourceLockSha256: catalog.sourceLockSha256, policySha256: catalog.policySha256, provenanceJson: { source: { sourceLock: source.sourceLock }, study: { recordToUnit: catalog.recordToUnit } } });
  expect(source).toEqual(before);
});

it.each(["source", "policy", "member", "duplicate", "mapping", "kind", "published"])("rejects inconsistent %s before any database access", (mode) => {
  const { source, build } = japaneseStudyFixture();
  const catalog = build();
  if (mode === "source") source.cards[0].content.meanings = ["changed"];
  if (mode === "policy") catalog.policySha256 = "0".repeat(64);
  if (mode === "member") catalog.units[0].recordIds.push("unknown");
  if (mode === "duplicate") catalog.units.push(catalog.units[0]);
  if (mode === "mapping") catalog.recordToUnit["word-1"] = "kanji";
  if (mode === "kind") catalog.units.find(unit => unit.id === "word-0")!.kind = "kanji";
  if (mode === "published") Object.assign(catalog, { status: "published" });
  expect(() => prepareJapaneseStudyImport(source, catalog)).toThrow();
});
