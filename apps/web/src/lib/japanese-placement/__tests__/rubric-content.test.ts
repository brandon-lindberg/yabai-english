import { describe, expect, it } from "vitest";
import { readFile } from "node:fs/promises";
import { bankDigest, inspectBankReadiness, japaneseEvidenceKey, JAPANESE_REFERENCE_BANDS, JAPANESE_STUDY_BANDS } from "../bank";
import { loadContentCatalog } from "../content-files";
import { buildContentBank } from "../content-pack";
import { buildJapaneseRubricBank, loadJapaneseRubricBank } from "../rubric-content";
import { nextJapaneseQuestion, recordJapaneseResponse, startJapaneseAttempt, summarizeJapaneseAttempt } from "../attempt";
import { approveBank } from "./fixtures";

describe("source-aligned Japanese rubric catalog", () => {
  it("binds explicit reading/construction anchors to the unchanged source catalog without creating calibration or approvals", async () => {
    const bank = await loadJapaneseRubricBank("data/japanese-placement");
    expect(bank).toMatchObject({ schemaVersion: 5, version: 3, assessment: { revision: "japanese-jlpt-rubric-v1", timeLimitSec: 1200, minimumAnswers: 12 },
      reviews: { japaneseTeacher: null, rights: null, placement: null } });
    expect(bank.items).toHaveLength(470);
    expect(bank.items.every((item) => item.calibration === null)).toBe(true);
    for (const band of JAPANESE_REFERENCE_BANDS) for (const domain of ["reading", "writing"]) {
      const anchors = bank.items.filter((item) => item.referenceBand === band && item.domain === domain && item.placementRole === "anchor");
      expect(new Set(anchors.map(japaneseEvidenceKey)).size).toBe(5);
      expect(anchors.every((item) => item.placementRationale)).toBe(true);
    }
    expect(inspectBankReadiness(bank).issues).toEqual(["japanese-teacher-review-required", "rights-review-required", "placement-review-required"]);
    expect(bank.items.find((item) => item.id === "n1.assembly-atte-no")!.placementRole).toBe("support");
    expect(bank.items.find((item) => item.id === "n2.kotonoha-r11.q1")!.placementRole).toBe("support");
    expect(bankDigest(buildContentBank((await loadContentCatalog("data/japanese-placement")).pack))).toBe("33ed9d52018f5a2d4cd615fbe2cfa3472fc303112eb6c2076c37516c52e40037");
  });

  it("refuses stale source snapshots, duplicated anchor rows, unknown items and empty rationale", async () => {
    const base = buildContentBank((await loadContentCatalog("data/japanese-placement")).pack);
    const manifest = JSON.parse(await readFile("data/japanese-placement/rubric-alignment.json", "utf8"));
    for (const change of ["digest", "duplicate", "unknown", "rationale", "revision"]) {
      const value = structuredClone(manifest);
      if (change === "digest") value.bankDigest = "0".repeat(64);
      if (change === "duplicate") value.anchors[1] = value.anchors[0];
      if (change === "unknown") value.anchors[0].itemId = "unknown";
      if (change === "rationale") value.anchors[0].rationale = "";
      if (change === "revision") value.anchors[0].itemRevision++;
      expect(() => buildJapaneseRubricBank(base, value)).toThrow();
    }
  });

  it.each([0, 1, 2, 3, 4, 5])("completes the actual catalog's 24-question mechanics profile %s with no fitted model", async (ability) => {
    const bank = approveBank(await loadJapaneseRubricBank("data/japanese-placement")); // Synthetic signoffs confined to this test.
    let attempt = startJapaneseAttempt(bank, { id: "catalog-rubric", learnerId: "fixture", startedAt: "2026-10-23T02:00:00.000Z" });
    for (let index = 0; index < 24; index++) {
      const question = nextJapaneseQuestion(bank, attempt)!;
      const item = bank.items.find((item) => item.id === question.id)!;
      const correct = JAPANESE_STUDY_BANDS.indexOf(item.referenceBand!) <= ability;
      attempt = recordJapaneseResponse(bank, attempt, { submittedAt: "2026-10-23T02:01:00.000Z", ...(item.responseType === "choice"
        ? { kind: "answer", itemId: item.id, choiceId: correct ? item.correctChoiceId : item.choices.find((choice) => choice.id !== item.correctChoiceId)!.id }
        : { kind: "sentence_assembly", itemId: item.id, tileIds: correct ? item.acceptedOrders[0] : [...item.acceptedOrders[0]].reverse() }) });
    }
    expect(summarizeJapaneseAttempt(bank, attempt).levelEstimate).toMatchObject({ status: "estimated", band: JAPANESE_STUDY_BANDS[ability], basis: "jlpt_aligned_rules" });
  }, 15000);
});
