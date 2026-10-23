import { describe, expect, it } from "vitest";
import {
  nextJapaneseQuestion, recordJapaneseResponse, startJapaneseAttempt, summarizeJapaneseAttempt,
} from "../attempt";
import { approveBank, approvedBank, draftBank } from "./fixtures";

const start = { id: "attempt-one", learnerId: "student-one", startedAt: "2026-10-22T01:00:00.000Z" };
const time = "2026-10-22T01:01:00.000Z";

function answerAll(bank = approvedBank()) {
  let attempt = startJapaneseAttempt(bank, start);
  for (const itemId of bank.sequence) {
    attempt = recordJapaneseResponse(bank, attempt, itemId === "writing-one"
      ? { kind: "sentence_assembly", itemId, tileIds: ["topic", "object", "verb"], submittedAt: time }
      : { kind: "answer", itemId, choiceId: "a", submittedAt: time });
  }
  return { bank, attempt };
}

describe("independent Japanese attempt progression", () => {
  it("refuses to start or serve an unapproved bank", () => {
    expect(() => startJapaneseAttempt(draftBank(), start)).toThrow(/not ready/);
    const bank = approvedBank();
    const attempt = startJapaneseAttempt(bank, start);
    bank.reviews.rights = null;
    expect(() => nextJapaneseQuestion(bank, attempt)).toThrow(/not ready/);
    expect(() => recordJapaneseResponse(bank, attempt, { kind: "skip", itemId: bank.sequence[0], reason: "not_sure", submittedAt: time })).toThrow(/not ready/);
  });

  it("starts a serializable attempt pinned to a bank snapshot", () => {
    const bank = approvedBank();
    const attempt = startJapaneseAttempt(bank, start);
    expect(attempt).toMatchObject({ ...start, schemaVersion: 3, bankId: bank.id, bankVersion: bank.version, responses: [] });
    expect(attempt.bankDigest).toMatch(/^[a-f0-9]{64}$/);
    expect(nextJapaneseQuestion(bank, JSON.parse(JSON.stringify(attempt)))?.id).toBe(bank.sequence[0]);
  });

  it("sends only the current text question, without keys, rationale or accepted sentence orders", () => {
    const bank = approvedBank();
    let attempt = startJapaneseAttempt(bank, start);
    const first = nextJapaneseQuestion(bank, attempt)!;
    expect(Object.keys(first).sort()).toEqual(["domain", "id", "prompt", "response", "stimulus"]);
    expect(JSON.stringify(first)).not.toMatch(/correctChoiceId|explanation|sourceIds|reviews|Private/);
    for (const itemId of bank.sequence.slice(0, -1)) {
      attempt = recordJapaneseResponse(bank, attempt, { kind: "answer", itemId, choiceId: "a", submittedAt: time });
    }
    const writing = nextJapaneseQuestion(bank, attempt)!;
    expect(writing.stimulus).toEqual({ kind: "text", text: "Synthetic writing stimulus" });
    expect(writing.response.kind).toBe("sentence_assembly");
    if (writing.response.kind === "sentence_assembly") {
      expect(writing.response.tiles.map((tile) => tile.id).sort()).toEqual(["object", "topic", "verb"]);
    }
    expect(nextJapaneseQuestion(bank, attempt)).toEqual(writing);
    expect(JSON.stringify(writing)).not.toMatch(/Private|acceptedOrders|correctChoiceId|explanation/);
  });

  it("uses deterministic Japanese routing, preserving input state", () => {
    const bank = approvedBank();
    bank.sequence.reverse();
    // A changed blueprint must be reviewed again, not quietly used with old approval.
    expect(() => startJapaneseAttempt(bank, start)).toThrow(/not ready/);
    const original = approvedBank();
    const attempt = startJapaneseAttempt(original, start);
    const before = JSON.stringify({ original, attempt });
    const next = recordJapaneseResponse(original, attempt, { kind: "answer", itemId: original.sequence[0], choiceId: "a", submittedAt: time });
    expect(JSON.stringify({ original, attempt })).toBe(before);
    expect(nextJapaneseQuestion(original, next)?.id).toBe(original.sequence[1]);
  });

  it("treats a retried response as idempotent and refuses a changed answer", () => {
    const bank = approvedBank();
    const attempt = startJapaneseAttempt(bank, start);
    const response = { kind: "answer" as const, itemId: bank.sequence[0], choiceId: "a", submittedAt: time };
    const once = recordJapaneseResponse(bank, attempt, response);
    expect(recordJapaneseResponse(bank, once, { ...response, submittedAt: "2026-10-22T01:02:00.000Z" })).toEqual(once);
    expect(() => recordJapaneseResponse(bank, once, { ...response, choiceId: "b" })).toThrow(/already recorded/);
  });

  it.each([
    ["out-of-order item", { kind: "answer", itemId: "reading-one", choiceId: "a", submittedAt: time }],
    ["unknown choice", { kind: "answer", itemId: "kana-one", choiceId: "unknown", submittedAt: time }],
    ["unsupported skip reason", { kind: "skip", itemId: "kana-one", reason: "audio_unavailable", submittedAt: time }],
    ["timestamp before the attempt", { kind: "answer", itemId: "kana-one", choiceId: "a", submittedAt: "2026-10-21T00:00:00.000Z" }],
    ["malformed timestamp", { kind: "answer", itemId: "kana-one", choiceId: "a", submittedAt: "tomorrow" }],
    ["client-supplied score", { kind: "answer", itemId: "kana-one", choiceId: "a", submittedAt: time, correct: true }],
  ])("rejects %s", (_label, response) => {
    const bank = approvedBank();
    expect(() => recordJapaneseResponse(bank, startJapaneseAttempt(bank, start), response)).toThrow();
  });

  it("rejects time moving backwards between responses", () => {
    const bank = approvedBank();
    const attempt = recordJapaneseResponse(bank, startJapaneseAttempt(bank, start), {
      kind: "skip", itemId: bank.sequence[0], reason: "not_sure", submittedAt: time,
    });
    expect(() => recordJapaneseResponse(bank, attempt, {
      kind: "skip", itemId: bank.sequence[1], reason: "not_sure", submittedAt: start.startedAt,
    })).toThrow(/timestamp/);
  });

  it("refuses incomplete results, foreign banks and tampered stored state", () => {
    const bank = approvedBank();
    const attempt = startJapaneseAttempt(bank, start);
    expect(() => summarizeJapaneseAttempt(bank, attempt)).toThrow(/incomplete/);
    expect(() => nextJapaneseQuestion(bank, { ...attempt, bankVersion: 2 })).toThrow(/snapshot/);
    expect(() => nextJapaneseQuestion(bank, { ...attempt, bankId: "other-bank" })).toThrow(/snapshot/);
    expect(() => nextJapaneseQuestion(bank, { ...attempt, responses: [{ kind: "answer", itemId: "reading-one", choiceId: "a", submittedAt: time }] })).toThrow();
    expect(() => nextJapaneseQuestion(bank, { ...attempt, placedLevel: "BEGINNER_1" })).toThrow();
  });

  it("does not substitute edited content into an existing attempt", () => {
    const bank = approvedBank();
    const attempt = startJapaneseAttempt(bank, start);
    const changed = approvedBank();
    const item = changed.items[0];
    if (item.responseType === "choice") item.choices[0].text = "Different question";
    expect(() => summarizeJapaneseAttempt(changed, attempt)).toThrow(/snapshot/);
  });

  it("ends after the last response and permits exact retries without appending", () => {
    const { bank, attempt } = answerAll();
    expect(nextJapaneseQuestion(bank, attempt)).toBeNull();
    expect(recordJapaneseResponse(bank, attempt, attempt.responses[0])).toEqual(attempt);
    expect(attempt.responses).toHaveLength(6);
  });
});

describe("Japanese evidence summary", () => {
  it("produces a reading/writing teacher brief before any conversation", () => {
    const { bank, attempt } = answerAll();
    const result = summarizeJapaneseAttempt(bank, attempt);
    expect(result.domains).toHaveLength(6);
    expect(result.domains.filter((domain) => domain.domain !== "writing").every((domain) => domain.correct === 1 && domain.incorrect === 0 && domain.observation === "observed")).toBe(true);
    expect(result.domains.find((domain) => domain.domain === "writing")).toMatchObject({ answered: 1, correct: 1, incorrect: 0 });
    expect(result).not.toHaveProperty("oralConfirmation");
    expect(result).not.toHaveProperty("writingSamples");
    expect(result.domains.some((domain) => "pendingReview" in domain)).toBe(false);
    expect(result.levelEstimate).toMatchObject({ scope: "reading_writing", status: "estimated", band: "N3", provisional: true });
    expect(result.scoringRevision).toBe("japanese-reading-writing-posterior-v1");
    expect(result).not.toHaveProperty("level");
    expect(result).not.toHaveProperty("jlptScore");
    expect(result).not.toHaveProperty("overallScore");
  });

  it("keeps skipped literacy and writing distinct from incorrect reading evidence", () => {
    const bank = approvedBank();
    let attempt = startJapaneseAttempt(bank, start);
    for (const itemId of bank.sequence) {
      attempt = recordJapaneseResponse(bank, attempt,
        itemId === "writing-one" || itemId === "kana-one"
            ? { kind: "skip", itemId, reason: "not_sure", submittedAt: time }
            : { kind: "answer", itemId, choiceId: itemId === "reading-one" ? "b" : "a", submittedAt: time });
    }
    const result = summarizeJapaneseAttempt(bank, attempt);
    expect(result.domains.find((domain) => domain.domain === "writing")).toMatchObject({
      planned: 1, answered: 0, correct: 0, incorrect: 0, notSure: 1, observation: "not_assessed",
    });
    expect(result.domains.find((domain) => domain.domain === "kana")).toMatchObject({ notSure: 1, incorrect: 0, observation: "not_assessed" });
    expect(result.domains.find((domain) => domain.domain === "reading")).toMatchObject({ incorrect: 1, correct: 0, answered: 1 });
    expect(result.domains.find((domain) => domain.domain === "kanji_reading")).toMatchObject({ correct: 1, incorrect: 0 });
  });

  it("retains historical evidence when a review is revoked, while preventing new questions", () => {
    const { bank, attempt } = answerAll();
    bank.reviews.japaneseTeacher = null;
    expect(summarizeJapaneseAttempt(bank, attempt).completedAt).toBe(time);
    expect(() => nextJapaneseQuestion(bank, attempt)).toThrow(/not ready/);
  });
});

describe("automatically scored Japanese sentence assembly", () => {
  function writingStage() {
    const bank = approvedBank();
    let attempt = startJapaneseAttempt(bank, start);
    for (const itemId of bank.sequence.slice(0, -1)) {
      attempt = recordJapaneseResponse(bank, attempt, { kind: "answer", itemId, choiceId: "a", submittedAt: time });
    }
    return { bank, attempt };
  }

  it("scores a completed tile order automatically without any student review step", () => {
    const { bank, attempt } = writingStage();
    const done = recordJapaneseResponse(bank, attempt, { kind: "sentence_assembly", itemId: "writing-one", tileIds: ["topic", "object", "verb"], submittedAt: time });
    expect(nextJapaneseQuestion(bank, done)).toBeNull();
    expect(summarizeJapaneseAttempt(bank, done).domains.find((domain) => domain.domain === "writing")).toMatchObject({ answered: 1, correct: 1, incorrect: 0 });
    expect(attempt.responses).toHaveLength(5);
  });

  it("records a structurally valid but incorrect sentence order as incorrect", () => {
    const { bank, attempt } = writingStage();
    const done = recordJapaneseResponse(bank, attempt, { kind: "sentence_assembly", itemId: "writing-one", tileIds: ["verb", "object", "topic"], submittedAt: time });
    expect(summarizeJapaneseAttempt(bank, done).domains.find((domain) => domain.domain === "writing")).toMatchObject({ correct: 0, incorrect: 1 });
  });

  it("accepts explicitly approved alternative word orders", () => {
    const { bank } = writingStage();
    const item = bank.items[5];
    if (item.responseType === "sentence_assembly") item.acceptedOrders.push(["object", "topic", "verb"]);
    approveBank(bank);
    let attempt = startJapaneseAttempt(bank, start);
    for (const itemId of bank.sequence.slice(0, -1)) {
      attempt = recordJapaneseResponse(bank, attempt, { kind: "answer", itemId, choiceId: "a", submittedAt: time });
    }
    const done = recordJapaneseResponse(bank, attempt, { kind: "sentence_assembly", itemId: "writing-one", tileIds: ["object", "topic", "verb"], submittedAt: time });
    expect(summarizeJapaneseAttempt(bank, done).domains.find((domain) => domain.domain === "writing")?.correct).toBe(1);
  });

  it("makes retries idempotent and refuses to replace a submitted tile order", () => {
    const { bank, attempt } = writingStage();
    const response = { kind: "sentence_assembly", itemId: "writing-one", tileIds: ["topic", "object", "verb"], submittedAt: time };
    const done = recordJapaneseResponse(bank, attempt, response);
    expect(recordJapaneseResponse(bank, done, { ...response, submittedAt: "2026-10-22T01:02:00.000Z" })).toEqual(done);
    expect(() => recordJapaneseResponse(bank, done, { ...response, tileIds: ["verb", "object", "topic"] })).toThrow(/already recorded/);
  });

  it("handles repeated Japanese particles as interchangeable tiles with distinct identities", () => {
    const bank = approvedBank();
    const item = bank.items[5];
    if (item.responseType !== "sentence_assembly") throw new Error("Expected sentence fixture");
    item.tiles = [
      { id: "mother", text: "母" }, { id: "topic-one", text: "は" }, { id: "doctor", text: "医師で、" },
      { id: "father", text: "父" }, { id: "topic-two", text: "は" }, { id: "teacher", text: "先生です。" },
    ];
    item.acceptedOrders = [["mother", "topic-one", "doctor", "father", "topic-two", "teacher"]];
    approveBank(bank);
    let attempt = startJapaneseAttempt(bank, start);
    for (const itemId of bank.sequence.slice(0, -1)) {
      attempt = recordJapaneseResponse(bank, attempt, { kind: "answer", itemId, choiceId: "a", submittedAt: time });
    }
    const done = recordJapaneseResponse(bank, attempt, {
      kind: "sentence_assembly", itemId: "writing-one", submittedAt: time,
      tileIds: ["mother", "topic-two", "doctor", "father", "topic-one", "teacher"],
    });
    expect(summarizeJapaneseAttempt(bank, done).domains.find((domain) => domain.domain === "writing")?.correct).toBe(1);
  });

  it.each([
    { tileIds: [] }, { tileIds: ["topic"] },
    { tileIds: ["topic", "topic", "verb"] }, { tileIds: ["unknown", "object", "verb"] },
  ])("rejects incomplete, repeated or foreign tile sets", ({ tileIds }) => {
    const { bank, attempt } = writingStage();
    expect(() => recordJapaneseResponse(bank, attempt, { kind: "sentence_assembly", itemId: "writing-one", tileIds, submittedAt: time })).toThrow();
  });

  it("rejects a choice for sentence assembly, tiles for a choice, free text and client grading", () => {
    const { bank, attempt } = writingStage();
    expect(() => recordJapaneseResponse(bank, attempt, { kind: "answer", itemId: "writing-one", choiceId: "a", submittedAt: time })).toThrow(/response type/);
    expect(() => recordJapaneseResponse(bank, startJapaneseAttempt(bank, start), { kind: "sentence_assembly", itemId: "kana-one", tileIds: ["topic", "object", "verb"], submittedAt: time })).toThrow(/response type/);
    expect(() => recordJapaneseResponse(bank, attempt, { kind: "writing", itemId: "writing-one", text: "日本語", submittedAt: time })).toThrow();
    expect(() => recordJapaneseResponse(bank, attempt, { kind: "sentence_assembly", itemId: "writing-one", tileIds: ["topic", "object", "verb"], submittedAt: time, correct: true })).toThrow();
  });
});
