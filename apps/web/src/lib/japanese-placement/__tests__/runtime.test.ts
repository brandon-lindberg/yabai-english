import { expect, test } from "vitest";
import { approvedBank } from "./fixtures";
import { createJapaneseAttemptRuntime, nextJapaneseQuestion, recordJapaneseResponse, startJapaneseAttempt, summarizeJapaneseAttempt } from "../attempt";
import { loadReleasedJapaneseBank } from "../release";

test("one Japanese request context preserves transitions, retries, deadlines and final scoring", () => {
  const bank = approvedBank(), runtime = createJapaneseAttemptRuntime(bank);
  const identity = { id: "attempt", learnerId: "student", startedAt: "2026-11-14T00:00:00.000Z" };
  let persisted = startJapaneseAttempt(bank, identity), context = runtime.context(persisted);
  expect(runtime.start(identity)).toEqual(persisted);
  while (context.next()) {
    const question = context.next()!;
    expect(question).toEqual(nextJapaneseQuestion(bank, persisted));
    expect(JSON.stringify(question)).not.toMatch(/correctChoiceId|acceptedOrders|calibration|explanation/);
    const item = bank.items.find(item => item.id === question.id)!;
    const answer = { submittedAt: identity.startedAt, ...(item.responseType === "choice" ? { kind: "answer", itemId: item.id, choiceId: item.correctChoiceId } : { kind: "sentence_assembly", itemId: item.id, tileIds: item.acceptedOrders[0] }) };
    const previous = context;
    context = context.record(answer);
    expect(previous.attempt.responses).toHaveLength(context.attempt.responses.length - 1);
    persisted = recordJapaneseResponse(bank, persisted, answer);
    expect(context.attempt).toEqual(persisted);
    expect(context.record(answer)).toBe(context);
    expect(context.next(persisted.expiresAt)).toBeNull();
  }
  expect(context.summarize()).toEqual(summarizeJapaneseAttempt(bank, persisted));
  expect(() => runtime.context({ ...persisted, bankDigest: "a".repeat(64) })).toThrow("snapshot mismatch");
  expect(() => runtime.context({ ...persisted, responses: [...persisted.responses].reverse() })).toThrow();
  expect(() => { runtime.bank.items[0].id = "changed"; }).toThrow();
});

test.each([undefined, "japanese-jlpt-staircase-v2"] as const)("incremental context matches persisted replay for mixed answers and timeouts under %s", async policy => {
  const runtime = createJapaneseAttemptRuntime(await loadReleasedJapaneseBank("data/japanese-placement", "public"));
  const startedAt = "2026-11-14T00:00:00.000Z";
  let context = runtime.context(runtime.start({ id: "mixed", learnerId: "student", startedAt }, policy));
  for (let index = 0; index < 24; index++) {
    const item = runtime.bank.items.find(item => item.id === context.next()!.id)!;
    const correct = index % 3 !== 1;
    const response = index % 7 === 6 ? { kind: "skip", itemId: item.id, reason: "not_sure" }
      : item.responseType === "choice" ? { kind: "answer", itemId: item.id, choiceId: correct ? item.correctChoiceId : item.choices.find(choice => choice.id !== item.correctChoiceId)!.id }
        : { kind: "sentence_assembly", itemId: item.id, tileIds: correct ? item.acceptedOrders[0] : [...item.acceptedOrders[0]].reverse() };
    context = context.record({ ...response, submittedAt: startedAt });
    const replay = runtime.context(JSON.parse(JSON.stringify(context.attempt)));
    expect(context.next()).toEqual(replay.next());
    expect(context.summarize(context.attempt.expiresAt)).toEqual(replay.summarize(context.attempt.expiresAt));
  }
  expect(context.next()).toBeNull();
  expect(context.summarize().responded).toBe(24);
});
