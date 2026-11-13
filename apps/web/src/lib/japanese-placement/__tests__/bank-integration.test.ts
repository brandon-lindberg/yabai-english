import { describe, expect, it } from "vitest";
import { bankDigest, inspectBankReadiness, parseJapaneseBank } from "../bank";
import { loadContentCatalog } from "../content-files";
import { buildContentBank } from "../content-pack";
import { nextJapaneseQuestion, parseJapaneseAttempt, recordJapaneseResponse, startJapaneseAttempt, summarizeJapaneseAttempt } from "../attempt";
import { initialJapaneseEvidence, selectJapaneseItem, updateJapaneseEvidence } from "../adaptive";
import { groupedAdaptiveBank as groupedBank, approveBank, approvedBank } from "./fixtures";
const start = { id: "grouped-attempt", learnerId: "learner", startedAt: "2026-10-23T01:00:00.000Z" };
const time = "2026-10-23T01:01:00.000Z";

describe("full Japanese bank integration", () => {
  it("builds all 470 draft items with 100 stable reading passages without inventing policy, approvals or likelihoods", async () => {
    const { pack } = await loadContentCatalog("data/japanese-placement");
    const bank = buildContentBank(pack);
    expect(bank).toMatchObject({ schemaVersion: 4, id: pack.id, version: pack.revision, assessment: null,
      reviews: { japaneseTeacher: null, rights: null, placement: null } });
    expect(bank.items).toHaveLength(470);
    expect(bank.sequence).toEqual(bank.items.map((item) => item.id));
    expect(bank.items.every((item) => item.calibration === null && item.referenceBand)).toBe(true);
    const reading = bank.items.filter((item) => item.domain === "reading");
    expect(reading).toHaveLength(200);
    expect(new Set(reading.map((item) => item.passageId)).size).toBe(100);
    for (const id of new Set(reading.map((item) => item.passageId))) expect(reading.filter((item) => item.passageId === id)).toHaveLength(2);
    expect(inspectBankReadiness(bank).ready).toBe(false);
    expect(() => startJapaneseAttempt(bank, start)).toThrow(/not ready/i);
    expect(bankDigest(JSON.parse(JSON.stringify(bank)))).toBe(bankDigest(bank));
  });

  it.each(["missing-passage", "shared-wrong-domain", "split-text", "different-text", "different-band", "legacy-metadata", "wrong-policy"])("rejects invalid grouping: %s", (mutation) => {
    const value = groupedBank();
    const reading = value.items.filter((item) => item.domain === "reading");
    if (mutation === "missing-passage") delete reading[0].passageId;
    if (mutation === "shared-wrong-domain") value.items[0].passageId = reading[0].passageId;
    if (mutation === "split-text") reading[1].passageId += ".split";
    if (mutation === "different-text") reading[1].stimulus = { kind: "text", text: reading[1].stimulus.text + "変更" };
    if (mutation === "different-band") reading[1].referenceBand = "N1";
    if (mutation === "legacy-metadata") value.schemaVersion = 3;
    if (mutation === "wrong-policy") value.assessment!.revision = "japanese-posterior-v1";
    expect(() => parseJapaneseBank(value)).toThrow();
  });

  it("keeps the pool bound separate from the question budget and the legacy 120-item limit", async () => {
    const { pack } = await loadContentCatalog("data/japanese-placement");
    const bank = buildContentBank(pack);
    expect(() => parseJapaneseBank({ ...bank, items: [...bank.items, ...bank.items, ...bank.items] })).toThrow(/at most 1000/i);
    const legacy = groupedBank();
    legacy.schemaVersion = 3;
    legacy.assessment!.revision = "japanese-posterior-v1";
    for (const item of legacy.items) { delete item.referenceBand; delete item.passageId; }
    expect(() => parseJapaneseBank(legacy)).toThrow(/Legacy/);
  });

  it("counts independent passages when validating a reading quota", () => {
    const value = groupedBank();
    const reading = value.items.filter((item) => item.domain === "reading").slice(0, 6);
    value.items = value.items.filter((item) => item.domain !== "reading").concat(reading);
    value.sequence = value.items.map((item) => item.id);
    expect(reading).toHaveLength(6); // Three independent texts cannot fill four reading slots.
    expect(inspectBankReadiness(value).issues).toContain("insufficient-pool:reading");
  });

  it("consumes a passage on a skip and refuses a second response from the same passage", () => {
    const bank = parseJapaneseBank(groupedBank());
    const item = bank.items.find((entry) => entry.domain === "reading")!;
    const sibling = bank.items.find((entry) => entry.id !== item.id && entry.passageId === item.passageId)!;
    const evidence = initialJapaneseEvidence();
    const response = { kind: "skip" as const, itemId: item.id, reason: "not_sure" as const, submittedAt: time };
    updateJapaneseEvidence(evidence, item, response);
    const before = [...evidence.posterior];
    expect(() => updateJapaneseEvidence(evidence, sibling, { ...response, itemId: sibling.id })).toThrow(/passage/i);
    expect(evidence.posterior).toEqual(before);
    evidence.counts = { ...bank.assessment!.quotas, reading: 1 };
    const next = selectJapaneseItem(bank, evidence)!;
    expect(next.domain).toBe("reading");
    expect(next.passageId).not.toBe(item.passageId);
  });

  it("invalidates exact-snapshot approvals when passage grouping or authoring bands change", () => {
    const bank = approveBank(groupedBank());
    const reading = bank.items.find((item) => item.domain === "reading")!;
    const passage = reading.passageId!;
    for (const item of bank.items.filter((item) => item.passageId === passage)) item.passageId += ".revised";
    expect(inspectBankReadiness(bank).issues).toEqual(["japanese-teacher-review-stale", "rights-review-stale", "placement-review-stale"]);
    approveBank(bank);
    bank.items.find((item) => item.domain === "vocabulary")!.referenceBand = "N1";
    expect(inspectBankReadiness(bank).ready).toBe(false);
  });

  it("completes 24 questions with four distinct passages and deterministic resumes, hiding grouping from clients", () => {
    const bank = approveBank(parseJapaneseBank(groupedBank()));
    let attempt = startJapaneseAttempt(bank, start);
    const reading: string[] = [];
    expect(attempt).toMatchObject({ schemaVersion: 4, policyRevision: "japanese-posterior-passages-v2" });
    for (let index = 0; index < 24; index++) {
      const question = nextJapaneseQuestion(bank, attempt)!;
      expect(nextJapaneseQuestion(JSON.parse(JSON.stringify(bank)), JSON.parse(JSON.stringify(attempt)))).toEqual(question);
      expect(JSON.stringify(question)).not.toMatch(/passageId|referenceBand|probabilities|correctChoiceId|acceptedOrders/);
      const item = bank.items.find((entry) => entry.id === question.id)!;
      if (item.domain === "reading") reading.push(item.passageId!);
      attempt = recordJapaneseResponse(bank, attempt, { ...(item.responseType === "sentence_assembly"
        ? { kind: "sentence_assembly", itemId: item.id, tileIds: item.acceptedOrders[0] }
        : { kind: "answer", itemId: item.id, choiceId: item.correctChoiceId }), submittedAt: time });
    }
    expect(reading).toHaveLength(4);
    expect(new Set(reading).size).toBe(4);
    expect(nextJapaneseQuestion(bank, attempt)).toBeNull();
    expect(summarizeJapaneseAttempt(bank, attempt)).toMatchObject({ scoringRevision: "japanese-reading-writing-passages-v2", total: 24, answered: 24, levelEstimate: { status: "estimated" } });
  });

  it("retains v3 snapshot hashes, runtime revisions and question order", () => {
    const bank = approvedBank();
    const attempt = startJapaneseAttempt(bank, start);
    expect(attempt).toMatchObject({ schemaVersion: 3, policyRevision: "japanese-posterior-v1" });
    expect(nextJapaneseQuestion(bank, attempt)?.id).toBe("kana-one");
    expect(summarizeJapaneseAttempt(bank, attempt, attempt.expiresAt).scoringRevision).toBe("japanese-reading-writing-posterior-v1");
    expect(bankDigest(bank)).toBe("162d4386311b11a59c16015f0756c523bc9be395c85c2c0caf43df053a5910d3");
  });

  it("pins the grouped policy, deadline and scoring through timeout without serving another passage question", () => {
    const bank = approveBank(groupedBank());
    const attempt = startJapaneseAttempt(bank, start);
    const first = nextJapaneseQuestion(bank, attempt)!;
    const response = { kind: "skip", itemId: first.id, reason: "not_sure", submittedAt: time };
    const saved = recordJapaneseResponse(bank, attempt, response);
    expect(recordJapaneseResponse(bank, saved, { ...response, submittedAt: saved.expiresAt })).toEqual(saved);
    expect(nextJapaneseQuestion(bank, saved, saved.expiresAt)).toBeNull();
    expect(summarizeJapaneseAttempt(bank, saved, saved.expiresAt)).toMatchObject({ scoringRevision: "japanese-reading-writing-passages-v2", completionReason: "time_limit", responded: 1, levelEstimate: { status: "insufficient_evidence" } });
    expect(() => parseJapaneseAttempt({ ...saved, policyRevision: "japanese-posterior-v1" })).toThrow(/version/i);
    expect(() => nextJapaneseQuestion(bank, { ...saved, schemaVersion: 3, policyRevision: "japanese-posterior-v1" })).toThrow(/snapshot/i);
    expect(() => recordJapaneseResponse(bank, saved, { kind: "skip", itemId: nextJapaneseQuestion(bank, saved)!.id, reason: "not_sure", submittedAt: saved.expiresAt })).toThrow(/expired/i);
  });
});
