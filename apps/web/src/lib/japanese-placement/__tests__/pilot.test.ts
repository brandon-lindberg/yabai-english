import { describe, expect, it } from "vitest";
import { bankDigest, japaneseEvidenceKey, parseJapaneseBank, type JapanesePlacementBank } from "../bank";
import { buildContentBank } from "../content-pack";
import { loadContentCatalog } from "../content-files";
import { createJapanesePilotForms, inspectJapanesePilot, parseJapanesePilotForms, pilotFormsDigest, projectJapanesePilotForm } from "../pilot";
import { groupedAdaptiveBank } from "./fixtures";

const uuid = (n: number) => `00000000-0000-4000-8000-${String(n).padStart(12, "0")}`;
function fixture() {
  const bank = groupedAdaptiveBank();
  bank.assessment = null;
  bank.reviews = { japaneseTeacher: null, rights: null, placement: null };
  for (const item of bank.items) item.calibration = null;
  const forms = createJapanesePilotForms(bank);
  const form = forms.forms[0];
  const data = {
    schemaVersion: 1, kind: "japanese-pilot-observations", formsDigest: pilotFormsDigest(bank, forms),
    studyId: uuid(1), protocolDigest: "a".repeat(64),
    participants: [{ id: uuid(2), split: "development", reference: { band: "N3", method: "independent_japanese_reading_writing", assessedOn: "2026-10-20", evidenceId: uuid(3) },
      session: { id: uuid(4), formId: form.id, elapsedMs: 1200000, endedBy: "time_limit", observations: form.items.slice(0, 3).map((ref, i) => {
        const item = bank.items.find((item) => item.id === ref.id)!;
        return { itemId: ref.id, itemRevision: ref.revision, position: i + 1, presentedAtMs: i * 10000,
          submittedAtMs: i === 2 ? null : (i + 1) * 10000,
          response: i === 2 ? null : i === 1 ? { kind: "skip", itemId: ref.id, reason: "not_sure" } : item.responseType === "choice"
            ? { kind: "answer", itemId: ref.id, choiceId: item.correctChoiceId }
            : { kind: "sentence_assembly", itemId: ref.id, tileIds: item.acceptedOrders[0] } };
      }) } }],
  };
  return { bank, forms, data };
}

describe("offline Japanese pilot forms", () => {
  it("covers the real 470-item bank exactly once with reproducible, version-bound, passage-independent forms", async () => {
    const bank = buildContentBank((await loadContentCatalog("data/japanese-placement")).pack);
    const before = JSON.stringify(bank);
    const forms = createJapanesePilotForms(bank);
    expect(forms).toMatchObject({ schemaVersion: 1, bankDigest: bankDigest(bank), bankVersion: 2, timeLimitSec: 1200, maxQuestions: 24 });
    expect(forms.forms.flatMap((form) => form.items.map((ref) => ref.id)).sort()).toEqual(bank.sequence.toSorted());
    for (const form of forms.forms) {
      expect(form.items.length).toBeLessThanOrEqual(24);
      const items = form.items.map((ref) => bank.items.find((item) => item.id === ref.id)!);
      expect(new Set(items.map(japaneseEvidenceKey)).size).toBe(items.length);
      expect(new Set(items.map((item) => item.domain)).size).toBe(6);
    }
    expect(createJapanesePilotForms(bank)).toEqual(forms);
    expect(JSON.stringify(bank)).toBe(before);
    expect(pilotFormsDigest(bank, JSON.parse(JSON.stringify(forms)))).toBe(pilotFormsDigest(bank, forms));
    const publicForm = projectJapanesePilotForm(bank, forms, forms.forms[0].id);
    expect(publicForm).toMatchObject({ mode: "offline_static_pilot", awardsLevel: false, timeLimitSec: 1200 });
    expect(publicForm.questions).toHaveLength(forms.forms[0].items.length);
    expect(publicForm.notices.length).toBeGreaterThan(0);
    expect(JSON.stringify(publicForm)).not.toMatch(/"(correctChoiceId|acceptedOrders|sourceIds|calibration|referenceBand|passageId|explanation|permissionEvidence)":/);
  });

  it.each(["digest", "revision", "order", "repeat-passage", "duplicate", "missing", "oversize", "legacy"])("checks manifest integrity and binding: %s", (change) => {
    const { bank, forms } = fixture();
    if (change === "digest") forms.bankDigest = "0".repeat(64);
    if (change === "revision") forms.forms[0].items[0].revision++;
    if (change === "order") forms.forms[0].items.reverse();
    if (change === "repeat-passage") {
      const reading = bank.items.filter((item) => item.domain === "reading").slice(0, 2);
      const first = forms.forms.find((form) => form.items.some((ref) => ref.id === reading[0].id))!;
      const other = forms.forms.find((form) => form.items.some((ref) => ref.id === reading[1].id))!;
      const replace = first.items.findIndex((ref) => bank.items.find((item) => item.id === ref.id)!.domain !== "reading");
      const sibling = other.items.findIndex((ref) => ref.id === reading[1].id);
      [first.items[replace], other.items[sibling]] = [other.items[sibling], first.items[replace]];
    }
    if (change === "duplicate") forms.forms[1].items[0] = forms.forms[0].items[0];
    if (change === "missing") forms.forms[0].items.pop();
    if (change === "oversize") forms.forms[0].items = Array(25).fill(forms.forms[0].items[0]);
    if (change === "legacy") bank.schemaVersion = 3;
    if (change === "order") expect(pilotFormsDigest(bank, forms)).not.toBe(pilotFormsDigest(bank, createJapanesePilotForms(bank)));
    else if (change === "repeat-passage") expect(() => parseJapanesePilotForms(bank, forms)).toThrow(/duplicate pilot passage/i);
    else expect(() => parseJapanesePilotForms(bank, forms)).toThrow();
  });
});

describe("pseudonymous Japanese pilot validation and descriptive diagnostics", () => {
  it("keeps correct, skipped, presented-unanswered and unreached counts distinct, with no invented calibration", () => {
    const { bank, forms, data } = fixture();
    const report = inspectJapanesePilot(bank, forms, data);
    expect(report).toMatchObject({ status: "descriptive_only", participants: 1, publicationReady: false, fittedModel: null,
      totals: { assigned: forms.forms[0].items.length, presented: 3, answered: 1, correct: 1, incorrect: 0, notSure: 1, unanswered: 1, unreached: forms.forms[0].items.length - 3 } });
    const first = report.items.find((item) => item.id === data.participants[0].session.observations[0].itemId)!;
    expect(first.development.N3).toMatchObject({ correct: 1, answered: 1, correctRate: 1, meanResponseMs: 10000 });
    expect(first.holdout.N3.correctRate).toBeNull();
    expect(report.coverage.missingReferenceBands).toEqual(["BELOW_N5", "N5", "N4", "N2", "N1"]);
    expect(report.coverage.unobservedItems).toHaveLength(bank.items.length - 3);
    expect(report.referenceCounts.development.N3).toBe(1);
    expect(report.referenceCounts.holdout.N3).toBe(0);
    expect(report.items.every((item) => item.uniformGuessingRate > 0 && item.uniformGuessingRate <= 1)).toBe(true);
    expect(bank.items.every((item) => item.calibration === null)).toBe(true);
  });

  it("reports no evidence for an empty collection instead of treating absent answers as failures", () => {
    const { bank, forms, data } = fixture(); data.participants = [];
    const report = inspectJapanesePilot(bank, forms, data);
    expect(report.participants).toBe(0);
    expect(report.totals.assigned).toBe(0);
    expect(report.coverage.unobservedItems).toHaveLength(bank.items.length);
    expect(report.items[0].development.N3.correctRate).toBeNull();
    expect(report.coverage.missingReferenceBands).toHaveLength(6);
  });

  it("keeps held-out learner counts separate and excludes skips and missing answers from attempted-answer rates", () => {
    const { bank, forms, data } = fixture();
    const first = data.participants[0];
    const holdout = structuredClone(first);
    holdout.id = uuid(5); holdout.split = "holdout"; holdout.session.id = uuid(6); holdout.reference.evidenceId = uuid(7);
    data.participants.push(holdout);
    const entry = first.session.observations[0];
    const item = bank.items.find((item) => item.id === entry.itemId)!;
    if (item.responseType !== "choice") throw new Error("Expected choice");
    entry.response = { kind: "answer", itemId: item.id, choiceId: item.choices.find((choice) => choice.id !== item.correctChoiceId)!.id };
    const report = inspectJapanesePilot(bank, forms, data);
    const row = report.items.find((row) => row.id === item.id)!;
    expect(row.development.N3.correctRate).toBe(0);
    expect(row.holdout.N3.correctRate).toBe(1);
    expect(Object.values(row.optionSelections!)).toEqual([1, 1]);
    expect(report.totals).toMatchObject({ answered: 2, correct: 1, incorrect: 1, notSure: 2, unanswered: 2 });
    expect(JSON.stringify(report)).not.toContain(first.id);
    expect(JSON.stringify(report)).not.toContain(first.reference.evidenceId);
  });

  it.each(["bank", "forms", "unknown-item", "revision", "position", "choice", "type", "late", "overlap", "response-id", "unfinished", "end", "duration", "invalid-reference-date", "english-label", "jlpt-below", "pii", "recording", "free-text", "duplicate-participant", "duplicate-session", "duplicate-evidence"])("rejects invalid collection: %s", (change) => {
    const { bank, forms, data } = fixture();
    const participant = data.participants[0];
    const observations = participant.session.observations;
    if (change === "bank") bank.items[0].revision++;
    if (change === "forms") data.formsDigest = "b".repeat(64);
    if (change === "unknown-item") observations[0].itemId = "not-in-form";
    if (change === "revision") observations[0].itemRevision++;
    if (change === "position") observations[0].position = 2;
    if (change === "choice") observations[0].response = { kind: "answer", itemId: observations[0].itemId, choiceId: "unknown" };
    if (change === "type") observations[0].response = { kind: "sentence_assembly", itemId: observations[0].itemId, tileIds: ["wrong", "tiles"] };
    if (change === "late") observations[0].submittedAtMs = 1200000;
    if (change === "overlap") observations[1].presentedAtMs = 9999;
    if (change === "response-id") observations[0].response!.itemId = observations[1].itemId;
    if (change === "unfinished") { observations[0].response = null; observations[0].submittedAtMs = null; }
    if (change === "end") participant.session.endedBy = "completed";
    if (change === "duration") participant.session.elapsedMs = 1199999;
    if (change === "invalid-reference-date") participant.reference.assessedOn = "2026-02-30";
    if (change === "english-label") participant.reference.method = "english_placement";
    if (change === "jlpt-below") { participant.reference.method = "jlpt"; participant.reference.band = "BELOW_N5"; }
    if (["pii", "recording", "free-text"].includes(change)) Object.assign(participant, { [change]: "must not be accepted" });
    if (change.startsWith("duplicate-")) {
      const second = structuredClone(participant);
      second.id = change === "duplicate-participant" ? participant.id : uuid(5);
      second.split = "holdout";
      second.session.id = change === "duplicate-session" ? participant.session.id : uuid(6);
      second.reference.evidenceId = change === "duplicate-evidence" ? participant.reference.evidenceId : uuid(7);
      data.participants.push(second);
    }
    expect(() => inspectJapanesePilot(bank, forms, data)).toThrow();
  });

  it("grades sentence assemblies through the shared grader", () => {
    const { bank, forms, data } = fixture();
    const form = forms.forms[0];
    const index = form.items.findIndex((ref) => bank.items.find((item) => item.id === ref.id)!.domain === "writing");
    const session = data.participants[0].session;
    session.endedBy = "withdrawn"; session.elapsedMs = (index + 1) * 10000;
    session.observations = form.items.slice(0, index + 1).map((ref, i) => {
      const item = bank.items.find((item) => item.id === ref.id)!;
      return { itemId: ref.id, itemRevision: ref.revision, position: i + 1, presentedAtMs: i * 10000, submittedAtMs: (i + 1) * 10000,
        response: item.responseType === "sentence_assembly" ? { kind: "sentence_assembly", itemId: ref.id, tileIds: item.acceptedOrders[0] }
          : { kind: "answer", itemId: ref.id, choiceId: item.correctChoiceId } };
    });
    expect(inspectJapanesePilot(bank, forms, data).totals.correct).toBe(index + 1);
  });

  it("counts distinct visible sentence permutations for the guessing baseline", () => {
    const { bank } = fixture();
    const item = bank.items.find((item) => item.domain === "writing")!;
    if (item.responseType !== "sentence_assembly") throw new Error("Expected assembly");
    item.tiles = [{ id: "one", text: "は" }, { id: "two", text: "は" }, { id: "end", text: "読む。" }];
    item.acceptedOrders = [["one", "two", "end"]];
    const checked: JapanesePlacementBank = parseJapaneseBank(bank);
    const forms = createJapanesePilotForms(checked);
    const data = { schemaVersion: 1, kind: "japanese-pilot-observations", formsDigest: pilotFormsDigest(checked, forms), studyId: uuid(1), protocolDigest: "a".repeat(64), participants: [] };
    expect(inspectJapanesePilot(checked, forms, data).items.find((row) => row.id === item.id)!.uniformGuessingRate).toBeCloseTo(1 / 3);
  });
});
