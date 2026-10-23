import { describe, expect, it } from "vitest";
import { buildContentItems, inspectContentCoverage, mergeContentPacks, parseContentPack, verifyContentProvenance } from "../content-pack";

const source = { id: "lexicon", origin: "adapted", title: "Pinned lexicon", location: "https://example.org/lexicon", revision: "1", license: "CC-BY-SA-4.0", attribution: "Contributors", permissionEvidence: "Original data licence" };
function fixture() {
  const entry = { id: "reading", band: "N5", domain: "kanji_reading", sourceId: "lexicon", sourceRecord: "school", changes: "Authored context and distractors.", focus: "学校", original: "学校", prompt: { en: "「学校」の読み方を選んでください。", ja: "「学校」の読み方を選んでください。" }, stimulus: "毎朝、学校へ行きます。", choices: [{ id: "a", text: "がっこう" }, { id: "b", text: "がくこう" }], correctChoiceId: "a", rationale: "学校：がっこう。" };
  const pack = { schemaVersion: 1, id: "words", revision: 1, status: "draft", sources: [source], passages: [], assemblies: [], wordItems: [entry] };
  const fileUrl = "https://example.org/vocab.json", dictionaryFileUrl = "https://example.org/dictionary.tgz", referenceFileUrl = "https://example.org/reference.csv";
  const snapshots = { schemaVersion: 1, retrievedAt: "2026-10-23", files: [fileUrl, dictionaryFileUrl, referenceFileUrl].map((url) => ({ url, sha256: "a".repeat(64) })), records: [{ sourceId: "lexicon", id: "school", band: "N5", text: "学校", title: "学校", fileUrl, wordEvidence: { written: "学校", reading: "がっこう", meanings: ["school"], dictionary: { id: "123", kanji: [{ text: "学校" }], kana: [{ text: "がっこう", appliesToKanji: ["*"] }] }, dictionaryFileUrl, referenceFileUrl, reference: { sourceRow: "N5:2", level: "N5", jmdict_seq: "123", kana: "がっこう", kanji: "学校", waller_definition: "school" } } }] };
  return { pack, snapshots };
}

describe("word-level Japanese content contract", () => {
  it("uses the existing choice format, merges word items and keeps calibration null", () => {
    const { pack, snapshots } = fixture();
    const checked = parseContentPack(pack);
    verifyContentProvenance(checked, snapshots);
    const items = buildContentItems(mergeContentPacks([checked]));
    expect(items).toHaveLength(1);
    expect(items[0]).toMatchObject({ domain: "kanji_reading", responseType: "choice", calibration: null, sourceIds: ["lexicon"] });
    expect(inspectContentCoverage(checked).bands[0]).toMatchObject({ kanjiReading: 1, vocabulary: 0, grammar: 0, kana: 0, complete: false });
  });

  it.each(["key", "alternate", "restriction", "level", "dictionary-id", "missing-evidence", "unpinned"])("rejects invalid lexical evidence: %s", (kind) => {
    const { pack, snapshots } = fixture();
    const evidence = snapshots.records[0].wordEvidence;
    if (kind === "key") pack.wordItems[0].choices[0].text = "がこう";
    if (kind === "alternate") evidence.dictionary.kana.push({ text: "がくこう", appliesToKanji: ["学校"] });
    if (kind === "restriction") evidence.dictionary.kana[0].appliesToKanji = ["別表記"];
    if (kind === "level") evidence.reference.level = "N4";
    if (kind === "dictionary-id") evidence.reference.jmdict_seq = "456";
    if (kind === "missing-evidence") delete (snapshots.records[0] as { wordEvidence?: unknown }).wordEvidence;
    if (kind === "unpinned") evidence.dictionaryFileUrl += "?unlocked";
    expect(() => verifyContentProvenance(parseContentPack(pack), snapshots)).toThrow();
  });

  it("checks vocabulary and grammar cloze completion, and refuses another spelling of the same word as a distractor", () => {
    const { pack, snapshots } = fixture();
    const entry = { ...pack.wordItems[0], domain: "vocabulary", stimulus: "毎朝、＿＿へ行きます。", completion: "毎朝、学校へ行きます。", choices: [{ id: "a", text: "学校" }, { id: "b", text: "がっこう" }] };
    expect(() => verifyContentProvenance(parseContentPack({ ...pack, wordItems: [entry] }), snapshots)).toThrow(/alternate/i);
    entry.choices[1].text = "病院";
    expect(() => verifyContentProvenance(parseContentPack({ ...pack, wordItems: [entry] }), snapshots)).not.toThrow();
    expect(() => parseContentPack({ ...pack, wordItems: [{ ...entry, completion: "別の文。" }] })).toThrow(/completion/i);
    expect(() => parseContentPack({ ...pack, wordItems: [{ ...entry, domain: "grammar", stimulus: "空欄がありません。" }] })).toThrow(/blank/i);
  });

  it("allows a reference's different dictionary-valid reading without treating it as a wrong answer", () => {
    const { pack, snapshots } = fixture();
    const evidence = snapshots.records[0].wordEvidence;
    evidence.dictionary.kana.push({ text: "がくこう", appliesToKanji: ["学校"] });
    evidence.reference.kana = "がくこう";
    pack.wordItems[0].choices[1].text = "がこう";
    expect(() => verifyContentProvenance(parseContentPack(pack), snapshots)).not.toThrow();
    evidence.reference.kana = "むこう";
    expect(() => verifyContentProvenance(parseContentPack(pack), snapshots)).toThrow(/evidence/i);
  });

  it("treats kana as an N5 literacy check with exact script conversion, never as advanced evidence", () => {
    const { pack } = fixture();
    const kana = { ...pack.wordItems[0], domain: "kana", original: "キャ", stimulus: "キャ", choices: [{ id: "a", text: "きゃ" }, { id: "b", text: "きや" }] };
    const original = { ...source, origin: "original" };
    expect(buildContentItems(parseContentPack({ ...pack, sources: [original], wordItems: [kana] }))[0].domain).toBe("kana");
    expect(() => parseContentPack({ ...pack, sources: [original], wordItems: [{ ...kana, band: "N1" }] })).toThrow(/kana/i);
    expect(() => parseContentPack({ ...pack, sources: [original], wordItems: [{ ...kana, correctChoiceId: "b" }] })).toThrow(/kana/i);
    expect(() => parseContentPack({ ...pack, sources: [original], wordItems: [{ ...kana, choices: [{ id: "a", text: "きャ" }, { id: "b", text: "きや" }] }] })).toThrow(/kana/i);
  });
});
