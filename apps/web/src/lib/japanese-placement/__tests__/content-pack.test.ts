import { describe, expect, it } from "vitest";
import { buildContentItems, inspectContentCoverage, mergeContentPacks, parseContentPack } from "../content-pack";

const source = { id: "original", origin: "original", title: "Original drafts", location: "local authoring", revision: "1", license: "CC-BY-SA-4.0", attribution: "English Platform contributors", permissionEvidence: "Original assessment content" };
function draft() {
  return {
    schemaVersion: 1, id: "n2-n3", revision: 1, status: "draft", sources: [source],
    passages: [{ id: "notice", band: "N2", genre: "notice", sourceId: "original", sourceRecord: "notice", changes: "Original draft.", title: "受付", text: "申込書は金曜日までに送ってください。", questions: [{ id: "deadline", prompt: "いつまでに送りますか。", choices: [{ id: "a", text: "金曜日まで" }, { id: "b", text: "日曜日まで" }], correctChoiceId: "a", evidenceQuote: "金曜日まで", skill: "information_retrieval" }] }],
    assemblies: [{ id: "construction", band: "N3", sourceId: "original", sourceRecord: "construction", changes: "Original draft.", focus: "上で", original: "家族と相談した上で返事します。", stimulus: "家族と＿＿返事します。", tiles: [{ id: "a", text: "相談した" }, { id: "b", text: "上で" }], acceptedOrders: [["a", "b"]], rationale: "相談した上で：consult first, then reply." }],
  };
}

describe("Japanese draft content import", () => {
  it.each(["N5", "N4", "N1"])("accepts %s content through the same importer", (band) => {
    const value = draft();
    value.passages[0].band = band; value.assemblies[0].band = band;
    const pack = parseContentPack(value);
    expect(buildContentItems(pack).every((item) => item.id.startsWith(band.toLowerCase()))).toBe(true);
    expect(inspectContentCoverage(pack).bands.map((row) => row.band)).toEqual(["N5", "N4", "N3", "N2", "N1"]);
    expect(inspectContentCoverage(pack).complete).toBe(false);
  });

  it("merges identical shared source metadata and refuses conflicting provenance or duplicate exercises", () => {
    const first = parseContentPack(draft());
    const secondValue = draft();
    secondValue.id = "second-pack";
    secondValue.passages[0].id = "other-notice";
    secondValue.passages[0].sourceRecord = "other-notice";
    secondValue.passages[0].text += "受付は三階です。";
    secondValue.assemblies[0].id = "other-construction";
    secondValue.assemblies[0].sourceRecord = "other-construction";
    secondValue.assemblies[0].focus = "相談した後";
    secondValue.assemblies[0].stimulus = "同僚と＿＿返事します。";
    secondValue.assemblies[0].original = "同僚と相談した上で返事します。";
    const second = parseContentPack(secondValue);
    const merged = mergeContentPacks([first, second]);
    expect(merged.sources).toHaveLength(1);
    expect(buildContentItems(merged)).toHaveLength(4);
    expect(() => mergeContentPacks([first, first])).toThrow(/Duplicate/);
    second.sources[0].license = "Changed licence";
    expect(() => mergeContentPacks([first, second])).toThrow(/source.*conflict/i);
  });

  it("builds the existing private item format, retaining source identities without inventing calibration", () => {
    const pack = parseContentPack(draft());
    const items = buildContentItems(pack);
    expect(items.map((item) => item.id)).toEqual(["n2.notice.deadline", "n3.construction"]);
    expect(items.every((item) => item.calibration === null)).toBe(true);
    expect(items[0]).toMatchObject({ domain: "reading", sourceIds: ["original"], correctChoiceId: "a" });
    expect(items[1]).toMatchObject({ domain: "writing", responseType: "sentence_assembly" });
    expect(inspectContentCoverage(pack).complete).toBe(false);
  });

  it.each([
    ["unknown source", (p: ReturnType<typeof draft>) => { p.passages[0].sourceId = "unknown"; }],
    ["invented evidence", (p: ReturnType<typeof draft>) => { p.passages[0].questions[0].evidenceQuote = "月曜日"; }],
    ["missing key", (p: ReturnType<typeof draft>) => { p.passages[0].questions[0].correctChoiceId = "missing"; }],
    ["duplicate content", (p: ReturnType<typeof draft>) => { p.passages.push({ ...p.passages[0], id: "copy" }); }],
    ["reused source record", (p: ReturnType<typeof draft>) => { p.assemblies.push({ ...p.assemblies[0], id: "copy", stimulus: "別の＿＿文。" }); }],
    ["incomplete tile order", (p: ReturnType<typeof draft>) => { p.assemblies[0].acceptedOrders = [["a", "a"]]; }],
    ["answer exposed", (p: ReturnType<typeof draft>) => { p.assemblies[0].stimulus = p.assemblies[0].original; }],
    ["unaccounted source", (p: ReturnType<typeof draft>) => { p.sources.push({ ...source, id: "unused" }); }],
  ])("rejects %s before import", (_label, mutate) => {
    const pack = draft(); mutate(pack);
    expect(() => parseContentPack(pack)).toThrow();
  });

  it("retains both pieces of evidence for paired-text questions and rejects invented supporting quotes", () => {
    const value = draft();
    const paired = { ...value.passages[0], genre: "paired_texts", text: "【文Ａ】参加は無料です。\n【文Ｂ】料金はかかりません。", questions: [{ ...value.passages[0].questions[0], evidenceQuote: "参加は無料です。", supportingQuotes: ["料金はかかりません。"] }] };
    const pack = parseContentPack({ ...value, passages: [paired] });
    expect(buildContentItems(pack)[0].explanation.ja).toContain("料金はかかりません。");
    paired.questions[0].supportingQuotes = ["参加費は千円です。"];
    expect(() => parseContentPack({ ...value, passages: [paired] })).toThrow(/evidence/i);
  });
});
