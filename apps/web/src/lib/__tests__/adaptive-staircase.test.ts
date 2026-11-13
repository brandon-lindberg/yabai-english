import { expect, test } from "vitest";
import { initialStaircase, advanceStaircase } from "../adaptive-staircase";

test("fallback items do not alter another band's streak or mutate prior state", () => {
  const state = advanceStaircase(initialStaircase(), 1, true);
  const before = JSON.stringify(state);
  expect(advanceStaircase(state, 1, true)).toEqual(state);
  expect(advanceStaircase(state, 3, false)).toEqual(state);
  advanceStaircase(state, 2, false);
  expect(JSON.stringify(state)).toBe(before);
});

test("alternating success and failure holds the same band until three consecutive confirmations", () => {
  let state = advanceStaircase(initialStaircase(), 1, true);
  for (let i = 0; i < 20; i++) state = advanceStaircase(state, 2, i % 2 === 0);
  expect(state.target).toBe(2);
  for (let i = 0; i < 2; i++) state = advanceStaircase(state, 2, true);
  expect(state.target).toBe(2);
  state = advanceStaircase(state, 2, true);
  expect(state.target).toBe(3);
  expect(state.bands[2].needsConfirmation).toBe(false);
});

test("floor and ceiling stay inside the five question bands", () => {
  let low = initialStaircase();
  for (let i = 0; i < 50; i++) low = advanceStaircase(low, low.target, false);
  expect(low.target).toBe(1);
  let high = initialStaircase();
  for (let i = 0; i < 50; i++) high = advanceStaircase(high, high.target, true);
  expect(high.target).toBe(5);
});
