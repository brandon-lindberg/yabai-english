import { expect, it } from "vitest";
import { buildWeightedSessionQueue, nextStudyReviewState } from "@/lib/study/scheduler";

it("uses the same scheduling rules for opaque English and Japanese identities without mutating prior state", () => {
  const now = new Date("2026-10-23T12:00:00Z");
  const previous = { correctCount: 4, wrongCount: 1, streakCorrect: 4, averageAnswerMs: 4000, latencySampleCount: 2 };
  expect(nextStudyReviewState(previous, true, now, 10000)).toEqual({
    correctCount: 5, wrongCount: 1, streakCorrect: 5, averageAnswerMs: 6000, latencySampleCount: 3, reps: 6,
    dueAt: new Date("2026-10-24T12:00:00Z"),
  });
  expect(nextStudyReviewState(previous, false, now, 1)).toMatchObject({ correctCount: 4, wrongCount: 2, streakCorrect: 0, averageAnswerMs: 4000, latencySampleCount: 2, reps: 6, dueAt: new Date("2026-10-23T12:00:45Z") });
  expect(previous.streakCorrect).toBe(4);
  expect(nextStudyReviewState(null, true, now)).toMatchObject({ correctCount: 1, wrongCount: 0, reps: 1, averageAnswerMs: null, latencySampleCount: 0 });
  const cards = [{ id: "english", subject: "ENGLISH" }, { id: "ja-vocabulary:猫", subject: "JAPANESE" }];
  const state = new Map([[cards[1].id, { ...previous, dueAt: new Date("2026-10-22") }]]);
  expect(buildWeightedSessionQueue(cards, state, 1, now, () => 0)).toEqual([cards[1]]);
  expect(buildWeightedSessionQueue([], state, 24, now, () => 0)).toEqual([]);
});

it("can fill a Japanese session with unique cards after prioritizing due cards", () => {
  const cards = [{ id: "due" }, { id: "new" }, { id: "other" }];
  const states = new Map([["due", { correctCount: 1, wrongCount: 0, streakCorrect: 1, averageAnswerMs: null, latencySampleCount: 0, dueAt: new Date(0) }]]);
  const queue = buildWeightedSessionQueue(cards, states, 24, new Date(), () => 0, { allowRepeats: false });
  expect(queue.map(card => card.id)).toEqual(["due", "new", "other"]);
});
